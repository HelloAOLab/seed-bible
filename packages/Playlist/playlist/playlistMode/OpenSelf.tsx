const isMobile =
  (window?.innerWidth || gridPortalBot.tags.pixelWidth) <
  MOBILE_VIEWPORT_THRESHOLD;
if (!globalThis.makingPlaylist) {
  if (globalThis["Playlist_package"]) {
    globalThis["Playlist_package"].onClick();
  } else {
    let PlayList = await Playlist.tryInitPlaylistMaker();
    if (PlayList) {
      let id = uuid();
      globalThis.PLAYLIST_PANEL_ID = id;
      AddApplication({
        id,
        App: <PlayList id={id} />,
        to: "panel",
        minWidth: "23rem",
      });
    }
  }
}
