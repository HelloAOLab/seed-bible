

// === Pre-check helper ===
async function waitForGlobals(required = [], delay = 250) {
    while (true) {
        const missing = required.filter(n => typeof globalThis[n] !== 'function');
        if (missing.length === 0) break; // all exist → proceed
        console.warn(`Missing globals: ${missing.join(', ')} — retrying...`);
        await new Promise(res => setTimeout(res, delay));
    }
}

// === Begin of your code ===
await(async function mainInstaller(that) {

    // --- pre-check at start ---
    await waitForGlobals([
        'AddTool',
        'SetElement',
        'ReplaceApplication',
        'AddApplication',
        'RemoveApplicationByID',
        'SetIsDragging',
        'SetPackageAddingOptions'
    ]);

    // ===== your original code unchanged =====
    const { name } = that
    const NameHolder = name
    globalThis[`${name}_package`] = {}
    const result = await os.getData(tags.publicKey, name)
    // os.log(result, 'for test2')
    let errorInstall = false

    async function SetUpConextMenu(contextOptions, bot, label) {
        try {
            const items = await bot[`${contextOptions}`]()
            if (!Array.isArray(items))
                return []
            // console.log(contextOptions, items, 'contextOptions')
            if (!globalThis.ContextMenuOptions)
                globalThis.ContextMenuOptions = []
            globalThis.ContextMenuOptions.push({ address: name, label, items })
        } catch { }
    }

    async function SetUpApplication(applicationFunction, bot, toolbarConfig) {
        function generateAppItem({ icon, label, AppComponent }) {
            const panelKey = `${label?.toUpperCase()?.replace(/\s/g, '_')}_PANEL_ID`;

            const onClick = async () => {
                if (globalThis.makingApp === label) {
                    RemoveApplicationByID(globalThis[panelKey]);
                    globalThis[panelKey] = null;
                    globalThis.makingApp = null;
                    return;
                }
                const InitializedApp = AppComponent;
                if (!InitializedApp) return;
                const id = uuid();
                globalThis[panelKey] = id;
                globalThis.makingApp = label;
                // console.log('InitializedApp', InitializedApp)
                if (globalThis.CurrentPanelAvailable) {
                    ReplaceApplication(globalThis.CurrentPanelAvailable, {
                        id,
                        App: <InitializedApp id={id} />,
                        to: 'panel',
                        minWidth: '23rem',
                    })
                    return
                }
                AddApplication({
                    id,
                    App: <InitializedApp id={id} />,
                    to: 'panel',
                    minWidth: '23rem',
                });
            }
            const onHold = async () => {
                const id = uuid();
                const InitializedApp = AppComponent;
                if (!InitializedApp) return;
                globalThis[`${label.toUpperCase().replace(/\s/g, '_')}_PANEL_ID`] = id;
                SetIsDragging(true);
                globalThis.SetElement({
                    App: <span className="material-symbols-outlined">{icon}</span>,
                    data: {
                        id,
                        App: <InitializedApp id={id} />,
                        to: 'panel',
                        minWidth: '23rem',
                    },
                });
            }
            globalThis[`${name}_package`].onClick = onClick
            // globalThis[`onClick_${label}`] = onClick
            return {
                icon,
                label,
                hasToggle: true,
                active: true,
                onHold,
                onClick,
            };
        }
        let App = await bot[applicationFunction]()
        let AppTest = false
        try {
            let AppTest = <App />
        } catch (err) {
            console.log(err)
        }
        if (!AppTest) {
            os.log('Error in installed app', bot)
            errorInstall = true
        }
        const toolbarOption = generateAppItem({ icon: toolbarConfig.icon, label: toolbarConfig.label, AppComponent: App })
        // console.log(toolbarOption, 'toolbarOption')
        if (globalThis.AddTool)
            globalThis.AddTool(toolbarOption)

        return toolbarOption
    }
    async function SetUpApplicationWithoutApp(toolbarConfig, bot) {
        const toolbarOption = {
            icon: toolbarConfig?.iconUrl || toolbarConfig.icon,
            label: toolbarConfig.label,
            hasToggle: true,
            active: true,
            isImg: toolbarConfig?.iconUrl,
            onHold: () => {
                bot[toolbarConfig.run]()
            },
            onClick: () => {
                bot[toolbarConfig.run]()
            },
        }

        globalThis.AddTool(toolbarOption)

    }

    async function InstallDependencies(dependencies) {
        // os.log(dependencies, 'dependencies')
        await dependencies.forEach(async ({ name, type }) => {
            if (type === 'package') {
                // console.log('installing dependencies')
                await thisBot.installPackage({ name })
            } else if (type === 'dependency') {
                const result = await os.getData(tags.publicKey, name)
                if (result.success) {
                    const data = result.data
                    // console.log('dependency', data)
                    const read = await web.get(data.source)
                    read.data.forEach(bot => {
                        const b = create({ ...bot, forPackage: NameHolder, space: 'local' })
                        thisBot.pushBots({ name: NameHolder, bot: b })
                    })
                }
            }
        })
    }
    async function SetUpTabApplication(tabConfig, bot) {
        // SetPackageAddingOptions([{ pkg: NameHolder, data: tabConfig }])
        const App = bot[tabConfig.app]()
        if (App)
            SetPackageAddingOptions(prev => {
                const d = [...prev, {
                    pkg: NameHolder, data: {
                        ...tabConfig,
                        app: <App />
                    }
                }]
                return d
            })
    }
    if (result.success) {
        const data = (result.data)
        thisBot.uninstallPackage({ ...data, address: name })
        os.log(data)
        setTagMask(thisBot, `${name}-data`, data, 'local')
        const read = await web.get(data.recordFile.url || data.source)
        read.data.forEach((bot, i) => {
            if (i !== 0) {
                const b = create(bot, {
                    space: 'local'
                })
                thisBot.pushBots({ name, bot: b })
            }
        })
        const bot = create(read.data[0], {
            space: 'local'
        })
        thisBot.pushBots({ name, bot, first: true })
        if (data.dependencies) {
            await InstallDependencies(data.dependencies)
        }
        os.sleep(2000)
        if (bot?.tags?.onInstJoined) {
            console.log('onInstJoined', 'fired')
            try { await bot.onInstJoined() } catch { }
        }
        if (bot?.tags?.onEggHatch) {
            console.log('onEggHatch', 'fired')
            try { await bot.onEggHatch() } catch { }
        }
        if (data.configEditor.contextMenuConfig) {
            const contextOptions = data.configEditor.contextMenuConfig.optionsIsOn.replace('@', '')
            await SetUpConextMenu(contextOptions, bot, data.configEditor.toolbarConfig.label)
        }
        if (data.configEditor.toolbarConfig && data.configEditor.toolbarConfig.run) {
            await SetUpApplicationWithoutApp(data.configEditor.toolbarConfig, bot)
        } else if (data.configEditor.app && data.configEditor.toolbarConfig) {
            const applicationFunction = data.configEditor.app.replace('@', '')
            await SetUpApplication(applicationFunction, bot, data.configEditor.toolbarConfig)
        }

        if (data?.configEditor?.tabConfig && data?.configEditor?.tabConfig?.app) {
            console.log('SetUpTabApplication')
            await SetUpTabApplication(data?.configEditor?.tabConfig, bot)
        }
        await os.sleep(1000)
        if (!masks.installedPackages)
            setTagMask(thisBot, 'installedPackages', [name], 'local');
        else {
            if (!masks.installedPackages.includes(name))
                setTagMask(thisBot, 'installedPackages', [...tags.installedPackages, name], 'local');
        }
        if (errorInstall) {
            // optional uninstall here
        }
        const { feedback } = that
        if (feedback) feedback()
    }

})(that); // self-invoking to run immediately
