const { mode } = that ?? {};

if (thisBot.vars.appId) {
  globalThis.RemoveFloatingApp(thisBot.vars.appId);
} else {
  globalThis.defaultPortalName = thisBot.tags.desiredDimension;
  gridPortalBot.tags.portalCameraType = "orthographic";
  gridPortalBot.tags.portalZoomableMin = 5;

  os.log("Displaying Bible Stack App", that);
  const App = await thisBot.App();
  const id = globalThis.AddFloatingApp({
    App: <App />,
    title: "Stack",
    position: { x: 200, y: 150 },
    size: { width: 350, height: 200 },
    type: "canvas",
    mode,
  });

  configBot.tags.gridPortal = "thePortal";
  configBot.tags.mapPortal = null;
  configBot.tags.miniGridPortal = null;
  configBot.tags.miniMapPortal = null;

  thisBot.vars.appId = id;

  await os.sleep(500);

  if (thisBot.vars.appId && thisBot.vars.appId === id) {
    setTagMask(thisBot, "isBibleAnimating", true);
    thisBot.CreateNewBible({ position: { x: 0, y: 0 } }).then(() => {
      thisBot.UpdateStackTabsVisualization({ source: "DisplayApp" });
    });
  }
}
