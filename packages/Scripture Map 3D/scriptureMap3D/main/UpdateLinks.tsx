const linksMap = new Map();
linksMap.set("baseButton", "interactiveBible.prefabs.mapButton");
linksMap.set("baseButtonIcon", "interactiveBible.prefabs.mapButtonIcon");
linksMap.set("baseButtonLabel", "interactiveBible.prefabs.mapButtonLabel");
linksMap.set(
  "baseColorPickerBackground",
  "interactiveBible.prefabs.mapColorPickerBackground"
);
linksMap.set(
  "baseColorPickerContent",
  "interactiveBible.prefabs.mapColorPickerContent"
);
linksMap.set(
  "baselayoutBookDateLabel",
  "interactiveBible.prefabs.layoutBookDateLabel"
);
linksMap.set(
  "baseSettingsButton",
  "interactiveBible.prefabs.mapSettingsButton"
);
linksMap.set("baseToggle", "interactiveBible.prefabs.mapToggle");
linksMap.set(
  "baseToggleBackground",
  "interactiveBible.prefabs.mapToggleBackground"
);
linksMap.set("baseToggleHandle", "interactiveBible.prefabs.mapToggleHandle");

linksMap.forEach((systemTag, linkName) => {
  const bot = getBot(byTag("system", systemTag));

  setTag(thisBot, linkName, `🔗${bot.id}`);
});
