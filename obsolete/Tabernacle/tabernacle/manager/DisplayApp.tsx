import { globalAPI } from "app.controller.controllerBuilder";

if (thisBot.vars.appId) {
  globalThis.RemoveFloatingApp(thisBot.vars.appId);
} else {
  globalAPI.defaultPortalName = thisBot.tags.dimension;
  // globalThis.defaultPortalName = thisBot.tags.dimension;
  // gridPortalBot.tags.portalCameraType = "perspective";
  gridPortalBot.tags.portalCameraType = "orthographic";
  gridPortalBot.tags.portalZoomableMin = 5;
  const App = await thisBot.App();
  const id = globalThis.AddFloatingApp({
    App: <App />,
    title: "Tabernacle",
    position: { x: 200, y: 150 },
    size: { width: 350, height: 200 },
    type: "canvas",
  });
  thisBot.vars.appId = id;

  configBot.tags.gridPortal = thisBot.tags.dimension;
  configBot.tags.mapPortal = null;
  configBot.tags.miniGridPortal = null;
  configBot.tags.miniMapPortal = null;

  await os.sleep(500);

  if (thisBot.vars.appId && thisBot.vars.appId === id) {
    const isValidChapter =
      thisBot.vars.currentChapter != null &&
      !isNaN(Number(thisBot.vars.currentChapter));
    if (thisBot.vars.currentBook && isValidChapter) {
      thisBot.FixBotsPosition();
      return thisBot.UpdateTabernacleVisuals();
    } else
      console.warn(
        "Book or Chapter not available at tabernacle.manager.DisplayApp"
      );
  }
}
