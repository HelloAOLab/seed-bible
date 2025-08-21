const {layoutData} = that;

if(layoutData.areDatesEnabled) return;

layoutData.areDatesEnabled = true;
thisBot.ShowDates({layoutData})
layoutData.staticLayoutPieces.settingsButtons.find((button) => {return button.tags.buttonType === BibleVizUtils.Data.LayoutButtonType.ShowDatesToggle})?.Activate?.();