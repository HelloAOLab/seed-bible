const { mapData } = that;

if (mapData.areDatesEnabled) return;

mapData.areDatesEnabled = true;
thisBot.ShowDatesOnMap({ mapData });
mapData.staticMapElements.settingsButtons
  .find((button: any) => {
    return button.tags.buttonType === MapButtonType.ShowDatesToggle;
  })
  ?.Activate?.();
