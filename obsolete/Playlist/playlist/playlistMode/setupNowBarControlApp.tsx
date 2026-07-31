const G = globalThis as any;
const parentId = that.parentID || "default";
const force = that.force || false;
const nowBarId = "player-playlist-bar";
const PlayerControls = await thisBot.PlaylistPlayerControls();
const isMobileSmall =
  (window?.innerWidth || G.gridPortalBot.tags.pixelWidth) <
  G.MOBILE_VIEWPORT_THRESHOLD;
if (G.AddNowBarApp && (!G.IsQueuePresent || force)) {
  G.AddNowBarApp(
    <PlayerControls parentId={parentId} />,
    nowBarId,
    isMobileSmall
  );
  G.NowBarFullWidth = true;
  setTimeout(() => {
    G.SetIsFullWidth(true);
    G.NowBarFullWidth = false;
  }, 100);
} else if (!G.IsQueuePresent) {
  os.unregisterApp("playing-playlist-flaot");
  os.registerApp("playing-playlist-flaot", thisBot);
  const FloatApp = () => {
    return (
      <div
        style={{
          top: "1rem",
          left: "1rem",
          zIndex: "10000",
          position: "fixed",
        }}
      >
        <PlayerControls parentId="default" />
      </div>
    );
  };
  os.compileApp("playing-playlist-flaot", <FloatApp />);
}
