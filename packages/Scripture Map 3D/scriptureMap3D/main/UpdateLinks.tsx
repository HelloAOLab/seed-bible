const linksMap = new Map()
linksMap.set("baseButton", "scriptureMap3D.prefabs.button")
linksMap.set("baseButtonIcon", "scriptureMap3D.prefabs.buttonIcon")
linksMap.set("baseButtonLabel", "scriptureMap3D.prefabs.buttonLabel")
linksMap.set("baseColorPickerBackground", "scriptureMap3D.prefabs.colorPickerBackground")
linksMap.set("baseColorPickerContent", "scriptureMap3D.prefabs.colorPickerContent")
linksMap.set("baselayoutBookDateLabel", "scriptureMap3D.prefabs.bookDateLabel")
linksMap.set("baseSettingsButton", "scriptureMap3D.prefabs.settingsButton")
linksMap.set("baseToggle", "scriptureMap3D.prefabs.toggle")
linksMap.set("baseToggleBackground", "scriptureMap3D.prefabs.toggleBackground")
linksMap.set("baseToggleHandle", "scriptureMap3D.prefabs.toggleHandle")

linksMap.forEach((systemTag, linkName) => {

    const bot = getBot(byTag("system", systemTag));
    
    setTag(thisBot, linkName, `🔗${bot.id}`);
})