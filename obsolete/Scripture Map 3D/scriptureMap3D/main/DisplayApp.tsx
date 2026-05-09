if (thisBot.vars.appId) {
  globalThis.RemoveFloatingApp(thisBot.vars.appId);
} else {
  gridPortalBot.tags.portalCameraType = "orthographic";
  gridPortalBot.tags.portalZoomableMin = 5;

  const App = await thisBot.App();
  const id = globalThis.AddFloatingApp({
    App: <App />,
    title: "ScriptureMap3D",
    position: { x: 200, y: 150 },
    size: { width: 350, height: 200 },
    type: "canvas",
  });
  thisBot.vars.appId = id;

  configBot.tags.gridPortal = "thePortal";
  configBot.tags.mapPortal = null;
  configBot.tags.miniGridPortal = null;
  configBot.tags.miniMapPortal = null;

  await os.sleep(500);

  if (thisBot.vars.appId && thisBot.vars.appId === id) {
    setTagMask(thisBot, "isBibleAnimating", true);
    thisBot.CreateNewLayout({ position: { x: 0, y: 0 } }).then(() => {
      thisBot.UserPresenceUpdate();
    });
  }
}
