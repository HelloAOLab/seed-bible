const G = globalThis as any;
const isMobile =
  (window?.innerWidth || G.gridPortalBot.tags.pixelWidth) <
  G.MOBILE_VIEWPORT_THRESHOLD;

if ((isMobile || that?.force) && G.makingPlaylist) {
  if (G["Playlist_package"]) {
    G["Playlist_package"].onClick();
    G.RemoveApplicationByLabel(G.ActiveMoreApp);
    G.makingApp = null;
    G.SetActiveMoreApp(null);
    G.ActiveMoreApp = null;
  } else {
    G.isRecording = false;
    G.SelectedItemIDForAttachments = null;
    G.Playlist.RemoveScreenRecordingControls();
    try {
      await experiment.endRecording();
    } catch (err) {}
    G.StopVideoRecording = false;
    G.RemoveApplicationByID(G.PLAYLIST_PANEL_ID);
    G.PLAYLIST_PANEL_ID = null;
    G[`defaultToggleGreyCheckPLayingPlaylist`] &&
      G[`defaultToggleGreyCheckPLayingPlaylist`](null);
    G.IS_PLAYLIST_ACTIVE = false;
    G.SetSplitAppPanel2(null);
    G.makingPlaylist = false;
    G.RemoveApplicationByLabel(G.ActiveMoreApp);
    G.makingApp = null;
    G.SetActiveMoreApp(null);
    G.ActiveMoreApp = null;
  }
}
