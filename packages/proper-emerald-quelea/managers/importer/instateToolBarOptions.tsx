const instateToolBarOptions = ({toolBarOptions}) => {
    if (globalThis?.SetTools && globalThis?.SetCanvasTools && globalThis?.SetMapTools) {
        console.log("adding options")
        // setting page options
        toolBarOptions.page.forEach(tool => {
            SetTools(tools => {
                let exist = tools.filter(item => item.icon === tool.icon);
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
                let exist = tools.filter(item => item.icon === tool.icon);
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
                let exist = tools.filter(item => item.icon === tool.icon);
                if (exist.length > 0) {
                    return tools
                } else {
                    return [...tools, tool]
                }
            })
        })

        SetTools(tools => tools.filter(tool => tool.label !== "Loading"))
        SetCanvasTools(tools => tools.filter(tool => tool.label !== "Loading"))
        SetMapTools(tools => tools.filter(tool => tool.label !== "Loading"))
    } else {
        setTimeout(() => {
            console.log("trying to add again")
            instateToolBarOptions({toolBarOptions});
        }, 1000)
    }
}

return instateToolBarOptions