const { layoutData } = that;

if (layoutData.areDatesEnabled) return;

layoutData.areDatesEnabled = true;
thisBot.ShowDates({ layoutData });
layoutData.staticLayoutPieces.settingsButtons
  .find((button: any) => {
    return (
      button.tags.buttonType ===
      BibleVizUtils.Data.tags.LayoutButtonType.ShowDatesToggle
    );
  })
  ?.Activate?.();
