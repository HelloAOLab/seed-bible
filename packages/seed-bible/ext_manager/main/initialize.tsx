const managerConfigs = []

const managers = getBots("ext_manager", true);

managers.forEach(manager => {
    managerConfigs.push(manager.ext_configs())
})

console.log(managerConfigs, "manager")
const instateToolBarOptions = ({ toolBarOptions }) => {
    if (globalThis?.SetTools && globalThis?.SetCanvasTools && globalThis?.SetMapTools) {
        try {
            console.log("adding options")
            // setting page options
            toolBarOptions.page.forEach(tool => {
                SetTools(tools => {
                    const exist = tools.filter(item => item.icon === tool.icon);
                    if (exist.length > 0) {
                        return tools
                    } else {
                        return [...tools, tool]
                    }
                })
            })
            // setting canvas options
            toolBarOptions.canvas.forEach(tool => {
                SetCanvasTools(tools => {
                    const exist = tools.filter(item => item.icon === tool.icon);
                    if (exist.length > 0) {
                        return tools
                    } else {
                        return [...tools, tool]
                    }
                })
            })
            // setting map options
            toolBarOptions.map.forEach(tool => {
                SetMapTools(tools => {
                    const exist = tools.filter(item => item.icon === tool.icon);
                    if (exist.length > 0) {
                        return tools
                    } else {
                        return [...tools, tool]
                    }
                })
            })
        } catch {
            () => {
                setTimeout(() => {
                    console.log("trying to add again")
                    instateToolBarOptions({toolBarOptions});
                }, 250)
            }
        }
    } else {
        setTimeout(() => {
            console.log("trying to add again")
            instateToolBarOptions({toolBarOptions});
        }, 250)
    }
}

managerConfigs.forEach(managerConfig => {
    if (managerConfig?.toolBarOptions) {
        instateToolBarOptions({ toolBarOptions: managerConfig?.toolBarOptions })
    }
})