// const { configEditor, bot, pkgName } = that
// const name = pkgName
const { name } = that
const pkgName = name
const pkgData = masks[`${name}-data`]
const configEditor = pkgData.configEditor
const bot = getBot('system', pkgData.mainBotTag)

// if(name !=="BookSelector")
// return

globalThis[`${name}_package`] = {};
// === Pre-check helper ===
async function waitForGlobals(required = [], delay = 250) {
    while (true) {
        const missing = required.filter(n => typeof globalThis[n] !== 'function');
        if (missing.length === 0) break; // all exist → proceed
        console.warn(`Missing globals: ${missing.join(', ')} — retrying...`);
        await new Promise(res => setTimeout(res, delay));
    }
}


await waitForGlobals([
    'AddTool',
    'SetElement',
    'ReplaceApplication',
    'AddApplication',
    'RemoveApplicationByID',
    'SetIsDragging',
    'SetPackageAddingOptions'
]);


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
        console.log('working', pkgName, panelKey)
        const onClick = async () => {
            if (globalThis.makingApp === label) {
                globalThis.CurrentPanelAvailable = null;
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

        globalThis[`${name}_package`].onClick = () => {
            EmitData('appClick', { name: `${name}_package` })
            onClick()
        }

        return {
            icon,
            label,
            hasToggle: toolbarConfig.hasToggle,
            active: toolbarConfig.active || false,
            onHold,
            pkgName:name,
            onClick,
            hasToggle,
            showInPageToolbar, 
            showInStarterToolbar
        };
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

    const {showInPageToolbar, showInStarterToolbar, active, hasToggle} = toolbarConfig;

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
        active: toolbarConfig.active,
        showInPageToolbar: toolbarConfig.showInPageToolbar,
        showInStarterToolbar: toolbarConfig.showInStarterToolbar,
        onHold: runFn,
        onClick: runFn,
        isImg: !!toolbarConfig?.iconUrl,
    };

    if (globalThis.AddTool) {
        globalThis.AddTool(toolbarOption, { to: toolbarConfig.to ? toolbarConfig.to : 'page' });
    }
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


// Context menu
if (configEditor?.contextMenuConfig) {
    const contextOptions = configEditor.contextMenuConfig.optionsIsOn.replace('@', '');
    await SetUpConextMenu(contextOptions, bot, configEditor.toolbarConfig?.label);
}

console.log(that)
// Toolbar / App
if (configEditor?.toolbarConfig?.run) {
    await SetUpApplicationWithoutApp(configEditor.toolbarConfig, bot);
} else if (configEditor?.app && configEditor?.toolbarConfig) {
    console.log(`SetUpApplication`)
    const applicationFunction = configEditor.app.replace('@', '');
    await SetUpApplication(applicationFunction, bot, configEditor.toolbarConfig);
}

// Tab app
if (configEditor?.tabConfig?.app) {
    await SetUpTabApplication(configEditor.tabConfig, bot);
}
await os.sleep(10)