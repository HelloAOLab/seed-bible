if (thisBot.vars.appId) {
  globalThis.RemoveFloatingApp(thisBot.vars.appId);
} else {
  gridPortalBot.tags.portalCameraType = "perspective";
  const App = await thisBot.App();
  const id = globalThis.AddFloatingApp({
    App: <App />,
    title: "Tabernacle",
    position: { x: 200, y: 150 },
    size: { width: 350, height: 200 },
  });
  thisBot.vars.appId = id;

  await os.sleep(500);

  if (thisBot.vars.appId && thisBot.vars.appId === id) {
    const isValidChapter =
      thisBot.vars.currentChapter != null &&
      !isNaN(Number(thisBot.vars.currentChapter));
    if (thisBot.vars.currentBook && isValidChapter) {
      thisBot.FixBotsPosition();
      thisBot.UpdateTabernacleVisuals();
    } else
      console.warn(
        "Book or Chapter not available at tabernacle.manager.DisplayApp"
      );
  }
}
