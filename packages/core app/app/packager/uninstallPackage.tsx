const { address } = that
console.log(masks[`${address}-data`], 'packge for uninstall')
if (masks[`${address}-data`]) {
    const { mainBotTag, otherBots, configEditor, dependencies } = masks[`${address}-data`]

    if (mainBotTag)
        destroy(getBot('system', mainBotTag))
    dependencies.forEach(({ name, type }) => {
        if (type === 'package') {
            thisBot.uninstallPackage({ address: name })
        } else if (type === "dependency") {
            destroy(getBots('forPackage', address))
        }
    })
    otherBots.forEach(bot => getBot('system', bot?.tags?.system || bot.tag) && destroy(getBot('system', bot?.tags?.system || bot.tag)))

    if (!globalThis.ContextMenuOptions)
        globalThis.ContextMenuOptions = []

    globalThis.ContextMenuOptions = globalThis.ContextMenuOptions.filter(e => e.address !== address)

    if (globalThis.RemoveTool) {
        if (configEditor) {
            try {
                const label = configEditor?.toolbarConfig?.label
                globalThis.RemoveTool(label)
                const panelKey = `${label.toUpperCase().replace(/\s/g, '_')}_PANEL_ID`
                RemoveApplicationByID(globalThis[panelKey])
            } catch (err) {
                console.error(err)
            }
        }
    }
    if (SetPackageAddingOptions) {
        SetPackageAddingOptions(prev => prev.filter(e => e.pkg === address))
    }
}

setTagMask(thisBot, `${address}-data`, null)
// console.log()

// const allbots = masks[`${address}-bots`]
// if (!allbots || allbots.length === 0) {
//     return
// }
// const mainBot = getBot('id', allbots[0])
// const configEditor = mainBot.tags.config
// allbots.map(bot => destroy(getBot('id', bot)))
// if (!globalThis.ContextMenuOptions)
//     globalThis.ContextMenuOptions = []

// globalThis.ContextMenuOptions = globalThis.ContextMenuOptions.filter(e => e.address !== address)

// if (masks.installedPackages)
//     setTagMask(thisBot, 'installedPackages', [], 'local');


// if (!configEditor) {
//     os.toast('no config')
//     return
// }

// if (globalThis.RemoveTool) {
//     if (configEditor) {
//         const label = configEditor?.toolbarConfig?.label
//         globalThis.RemoveTool(label)
//         const panelKey = `${label.toUpperCase().replace(/\s/g, '_')}_PANEL_ID`
//         RemoveApplicationByID(globalThis[panelKey])
//     }
// }