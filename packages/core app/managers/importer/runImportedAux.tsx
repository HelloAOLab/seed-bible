let managerConfigs = [];
let installedBots = getBots('ext_configs');

console.log(installedBots, "masks.installedBots")

for (let installedBot of installedBots) {
    if (installedBot.tags.ext_manager) {
        managerConfigs.push(installedBot.ext_configs());
    }
}

const instateToolBarOptions = thisBot.instateToolBarOptions();

if (managerConfigs.length > 0) {
    managerConfigs.forEach(managerConfig => {
        if (managerConfig?.toolBarOptions) {
            instateToolBarOptions({ toolBarOptions: managerConfig?.toolBarOptions })
        }
    })
} else {
    instateToolBarOptions({ toolBarOptions: { page: [], canvas: [], map: [] } })
}
