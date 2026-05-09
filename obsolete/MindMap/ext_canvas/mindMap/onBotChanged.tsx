let focusBot = getBot(byTag("id", tags.focusBotId));
if (focusBot) {
  os.focusOn(focusBot, {
    duration: 4,
    rotation: { x: 0, y: 0, z: 0 },
    zoom: 10,
  });
}
