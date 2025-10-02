
// return
const { address } = that
shout('onUnInstallPackage', { name: address })

console.log(masks[`${address}-data`], 'package for uninstall')
if (masks[`${address}-data`]) {
    const { mainBotTag, otherBots, configEditor, dependencies } = masks[`${address}-data`]
    destroy(getBots('forPackage', address))

    if (mainBotTag)
        destroy(getBot('system', mainBotTag))

    // replace dependencies.forEach
    for (let i = 0; i < dependencies.length; i++) {
        const { name, type } = dependencies[i]
        if (type === 'package') {
            await thisBot.uninstallPackage({ address: name })
        } else if (type === "dependency") {
            destroy(getBots('forPackage', address));
        }
    }

    // replace otherBots.forEach
    for (let i = 0; i < otherBots.length; i++) {
        const bot = otherBots[i]
        const sysTag = bot?.tags?.system || bot.tag
        if (getBot('system', sysTag)) {
            destroy(getBot('system', sysTag))
        }
    }

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