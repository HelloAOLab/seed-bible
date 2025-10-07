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

    // ===== your original code (with fixes) =====
    const { name } = that;
    const NameHolder = name;
    globalThis[`${name}_package`] = {};

    async function FindExtensionData(name) {
        let data;
        if (tags.alwaysUseAvailablePackages && tags.availablePackages) {
            data = tags.availablePackages.find(p => p.name === name);
        }

        if (!data) {
            const result = await os.getData(tags.recordName, name);
            if (result.success === false) {
                throw new Error(`Failed to get package data for ${name}: ${result.errorCode} ${result.errorMessage}`);
            }
            data = result.data;
        }

        if (!data) {
            throw new Error('No package data found for ' + name);
        }

        return data;
    }

    const data = await FindExtensionData(name);
    
    let errorInstall = false;

    function GetBotsFromData(aux) {
        if (typeof aux === 'object' && 'version' in aux) {
            // Handle aux files
            if (aux.version === 1) {
                const bots = Object.values(aux.state);
                for (let i = 1; i < bots.length; i++) {
                    const b = bots[i];
                    if (b.tags.system === data.mainBotTag) {
                        const t = bots[0];
                        bots[0] = b;
                        bots[i] = t;
                        break;
                    }
                }

                return bots;
            } else {
                throw new Error('Unsupported AUX version: ' + aux.version);
            }
        } else {
            return bots;
        }
    }

    async function SetUpConextMenu(contextOptions, bot, label) {
        try {
            const items = await bot[`${contextOptions}`]();
            if (!Array.isArray(items)) return [];
            if (!globalThis.ContextMenuOptions) globalThis.ContextMenuOptions = [];
            globalThis.ContextMenuOptions.push({ address: name, label, items });
        } catch { /* swallow */ }
    }

    async function SetUpApplication(applicationFunction, bot, toolbarConfig) {
        function generateAppItem({ icon, iconUrl, label, AppComponent, hasToggle, showInPageToolbar, showInStarterToolbar }) {
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


                if (globalThis.CurrentPanelAvailable) {
                    ReplaceApplication(globalThis.CurrentPanelAvailable, {
                        id,
                        App: <InitializedApp id={id} />,
                        to: 'panel',
                        minWidth: '23rem',
                    });
                    return;
                }
                AddApplication({
                    id,
                    App: <InitializedApp id={id} />,
                    to: 'panel',
                    minWidth: '23rem',
                });
            };

            const onHold = async () => {
                const id = uuid();
                const InitializedApp = AppComponent;
                if (!InitializedApp) return;
                globalThis[`${label.toUpperCase().replace(/\s/g, '_')}_PANEL_ID`] = id;
                SetIsDragging(true);
                globalThis.SetElement({
                    App: !iconUrl ? (
                        <span className="material-symbols-outlined">{icon}</span>
                    ) : (
                        <img
                            src={iconUrl}
                            style={{
                                width: '40px',
                                height: '42px',
                                objectFit: 'cover',
                                objectPosition: 'center',
                            }}
                        />
                    ),
                    data: {
                        id,
                        App: <InitializedApp id={id} />,
                        to: 'panel',
                        minWidth: '23rem',
                    },
                });
            };

            globalThis[`${name}_package`].onClick = onClick;

            return {
                icon,
                label,
                hasToggle: true,
                active: true,
                onHold,
                onClick,
                hasToggle,
                showInPageToolbar, 
                showInStarterToolbar
            };
        }

        if (!bot[applicationFunction]) {
            os.log('Error in extension (function not found)', name, { bot, applicationFunction });
            throw new Error('Unable to install extension: ' + name + ' (function not found: ' + applicationFunction + ')');
        }
        // Get the component (support both sync and async factories)
        const App = await bot[applicationFunction]();

        // Validate: must be a function/component
        if (typeof App !== 'function') {
            os.log('Error in installed app (expected a component function)', {
                applicationFunction,
                AppType: typeof App,
            });
            errorInstall = true;
            return; // bail early
        }

        // Optional: sanity render without shadowing the variable
        try {
            const _testEl = <App />; // if this throws, it’s not a valid JSX component
        } catch (err) {
            os.log('Component render test failed', err);
            errorInstall = true;
            return;
        }

        const toolbarOption = generateAppItem({
            icon: toolbarConfig.icon,
            label: toolbarConfig.label,
            AppComponent: App,
            iconUrl: toolbarConfig?.iconUrl,
            hasToggle: toolbarConfig.hasToggle,
            showInPageToolbar: toolbarConfig.showInPageToolbar,
            showInStarterToolbar: toolbarConfig.showInStarterToolbar
        });


        if (globalThis.AddTool) globalThis.AddTool(toolbarOption);

        return toolbarOption;
    }

    async function SetUpApplicationWithoutApp(toolbarConfig, bot) {
        const runFn = () => bot[toolbarConfig.run]();

        const toolbarOption = {
            icon: !toolbarConfig?.iconUrl ? toolbarConfig.icon : toolbarConfig.iconUrl,
            label: toolbarConfig.label,
            hasToggle: toolbarConfig.hasToggle,
            active: typeof toolbarConfig?.active === 'boolean' ? toolbarConfig.active : true,
            showInPageToolbar: toolbarConfig.showInPageToolbar,
            showInStarterToolbar: toolbarConfig.showInStarterToolbar,
            onHold: runFn,
            onClick: runFn,
            isImg: !!toolbarConfig?.iconUrl,
        };

        console.log(`[Debug] installPackage`, {toolbarOption, toolbarConfig})

        if (globalThis.AddTool) {
            globalThis.AddTool(toolbarOption, { to: toolbarConfig.to ? toolbarConfig.to : 'page' });
        }
    }

    // FIX: make this actually wait for each dependency (no forEach + await)
    async function InstallDependencies(dependencies) {
        for (const { name: depName, type } of dependencies) {
            if (type === 'package') {
                await thisBot.installPackage({ name: depName });
            } else if (type === 'dependency') {
                os.log('installing dependency', depName);
                const data = await FindExtensionData(depName);
                const read = await web.get(data.recordFile?.url || data.source);

                const bots = GetBotsFromData(read.data);
                create(bots, {
                    space: 'local',
                    forPackage: NameHolder,
                    packageName: depName
                });
            }
        }
        await os.sleep(100)
    }

    async function SetUpTabApplication(tabConfig, bot) {
        // Support async or sync app getter
        const maybeApp = bot[tabConfig.app]();
        const App = (typeof maybeApp?.then === 'function') ? await maybeApp : maybeApp;

        if (App) {
            SetPackageAddingOptions(prev => {
                const d = [
                    ...prev,
                    {
                        pkg: NameHolder,
                        data: {
                            ...tabConfig,
                            app: App,
                        },
                    },
                ];
                return d;
            });
        }
    }

    // Uninstall previous version first
    thisBot.uninstallPackage({ ...data, address: name });

    // Install dependencies and WAIT for them
    if (data.dependencies?.length) {
        await InstallDependencies(data.dependencies);
        // No need to sleep if the functions above are correctly awaited
        // await os.sleep(5000);
    }

    os.log('installing package', name, data);
    setTagMask(thisBot, `${name}-data`, data, 'local');

    // Load record/source
    const read = await web.get(data.recordFile?.url || data.source);
    const bots = GetBotsFromData(read.data);

    // Push secondary bots first (await if async)
    for (let i = 1; i < bots.length; i++) {
        const b = create(bots[i], { space: 'local', forPackage: NameHolder, packageName: name });
        // await thisBot.pushBots({ name, bot: b });
    }

    // Push the primary (first) bot
    const bot = create(bots[0], { space: 'local', forPackage: NameHolder, packageName: name });
    await thisBot.pushBots({ name, bot, first: true });

    // Give lifecycle hooks a chance to run (await sleeps!)
    // Only keep sleeps if actually needed by environment
    // await os.sleep(2000);

    if (bot?.tags?.onInstJoined) {
        try { await bot.onInstJoined(); } catch { /* swallow */ }
    }
    if (bot?.tags?.onEggHatch) {
        try { await bot.onEggHatch(); } catch { /* swallow */ }
    }

    // Context menu
    if (data?.configEditor?.contextMenuConfig) {
        const contextOptions = data.configEditor.contextMenuConfig.optionsIsOn.replace('@', '');
        await SetUpConextMenu(contextOptions, bot, data.configEditor.toolbarConfig?.label);
    }

    // Toolbar / App
    if (data?.configEditor?.toolbarConfig?.run) {
        await SetUpApplicationWithoutApp(data.configEditor.toolbarConfig, bot);
    } else if (data?.configEditor?.app && data?.configEditor?.toolbarConfig) {
        const applicationFunction = data.configEditor.app.replace('@', '');
        await SetUpApplication(applicationFunction, bot, data.configEditor.toolbarConfig);
    }

    // Tab app
    if (data?.configEditor?.tabConfig?.app) {
        await SetUpTabApplication(data.configEditor.tabConfig, bot);
    }

    // Ensure installedPackages tag is updated (FIX: use masks not tags)
    if (!masks.installedPackages) {
        setTagMask(thisBot, 'installedPackages', [name], 'local');
    } else if (!masks.installedPackages.includes(name)) {
        setTagMask(thisBot, 'installedPackages', [...masks.installedPackages, name], 'local');
    }

    if (errorInstall) {
        // optional uninstall / rollback here if you want
    }

    const { feedback } = that;
    if (feedback) feedback();
})(that); // self-invoking to run immediately
