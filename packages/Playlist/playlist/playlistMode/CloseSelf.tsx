const isMobile = gridPortalBot.tags.pixelWidth < MOBILE_VIEWPORT_THRESHOLD;

if (isMobile && globalThis.makingPlaylist) {
  if (globalThis["Playlist_package"]) {
    globalThis["Playlist_package"].onClick();
  } else {
    globalThis.isRecording = false;
    globalThis.SelectedItemIDForAttachments = null;
    Playlist.RemoveScreenRecordingControls();
    try {
      await experiment.endRecording();
    } catch (err) {}
    globalThis.StopVideoRecording = false;
    RemoveApplicationByID(globalThis.PLAYLIST_PANEL_ID);
    globalThis.PLAYLIST_PANEL_ID = null;
    globalThis[`defaultToggleGreyCheckPLayingPlaylist`] &&
      globalThis[`defaultToggleGreyCheckPLayingPlaylist`](null);
    globalThis.IS_PLAYLIST_ACTIVE = false;
    globalThis.SetSplitAppPanel2(null);
    globalThis.makingPlaylist = false;
  }
}
