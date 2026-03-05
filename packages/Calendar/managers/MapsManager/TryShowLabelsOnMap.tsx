const { mapData } = that;

if (mapData.isLabelsEnabled) return;

mapData.isLabelsEnabled = true;
thisBot.ShowLabelsOnMap({ mapData });

mapData.staticMapElements.settingsButtons
  .find((button: any) => {
    return button.tags.buttonType === MapButtonType.ShowLabelsToggle;
  })
  ?.Activate?.();
