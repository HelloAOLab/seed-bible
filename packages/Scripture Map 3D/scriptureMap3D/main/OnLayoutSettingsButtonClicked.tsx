const {settingsButton} = that;
const layoutData = thisBot.GetLayoutDataById({layoutId: settingsButton.tags.layoutId})
thisBot.ToggleSettings({layoutData});