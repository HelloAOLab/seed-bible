const { settingsButton } = that;
const mapData = thisBot.GetMapDataById({ mapId: settingsButton.tags.mapId });
thisBot.ToggleSettingsOnMap({ mapData });
