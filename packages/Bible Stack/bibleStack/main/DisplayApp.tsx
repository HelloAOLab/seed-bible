if (thisBot.vars.appId) {
  globalThis.RemoveFloatingApp(thisBot.vars.appId);
} else {
  gridPortalBot.tags.portalCameraType = "orthographic";
  gridPortalBot.tags.portalZoomableMin = 5;

  const App = await thisBot.App();
  const id = globalThis.AddFloatingApp({
    App,
    title: "Stack",
    position: { x: 200, y: 150 },
    size: { width: 350, height: 200 },
  });
  thisBot.vars.appId = id;

  await os.sleep(500);

  if (thisBot.vars.appId && thisBot.vars.appId === id) {
    setTagMask(thisBot, "isBibleAnimating", true);
    thisBot.CreateNewBible({ position: { x: 0, y: 0 } }).then(() => {
      thisBot.UpdateStackTabsVisualization({ source: "DisplayApp" });
    });
  }
}
