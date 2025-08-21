const {layoutData} = that;

if(layoutData.areLabelsEnabled) return;

layoutData.areLabelsEnabled = true;
thisBot.ShowLabels({layoutData});
layoutData.staticLayoutPieces.settingsButtons.find((button) => {return button.tags.buttonType === BibleVizUtils.Data.LayoutButtonType.ShowLabelsToggle})?.Activate?.();