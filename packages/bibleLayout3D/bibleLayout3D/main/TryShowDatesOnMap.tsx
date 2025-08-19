const {layoutData} = that;

if(layoutData.areDatesEnabled) return;

layoutData.areDatesEnabled = true;
thisBot.ShowDatesOnMap({layoutData})
layoutData.staticLayoutElements.settingsButtons.find((button) => {return button.tags.buttonType === BibleVizUtils.Data.LayoutButtonType.ShowDatesToggle})?.Activate?.();