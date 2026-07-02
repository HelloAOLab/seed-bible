const G = globalThis as any;
const isMobile =
  (window?.innerWidth || G.gridPortalBot.tags.pixelWidth) <
  G.MOBILE_VIEWPORT_THRESHOLD;
if (!G.makingPlaylist) {
  if (G["Playlist_package"]) {
    G["Playlist_package"].onClick();
  } else {
    let PlayList = await G.Playlist.tryInitPlaylistMaker({
      makeBooleansTrue: true,
    });
    if (PlayList) {
      let id = uuid();
      G.PLAYLIST_PANEL_ID = id;
      G.AddApplication({
        id,
        App: <PlayList id={id} />,
        to: "panel",
        minWidth: "23rem",
      });
    }
  }
}
