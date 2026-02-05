const parentId = that?.parentId || "default";
thisBot.CloseFloatingApp();
DataManager.cancelCurrentPlayingSound();
globalThis.SetSelected && SetSelected({});
globalThis.SetHolded && SetHolded({});
// globalThis.SetPlayingPlaylist && globalThis.SetPlayingPlaylist(false);
globalThis[`${parentId}ToggleGreyCheckPLayingPlaylist`] &&
  globalThis[`${parentId}ToggleGreyCheckPLayingPlaylist`](null);
globalThis.IsQueuePresent = false;
// os.unregisterApp("playing-playlist");
globalThis.IS_PLAYLIST_ACTIVE = false;
globalThis.StopPlayingPlaylistModal &&
  globalThis.StopPlayingPlaylistModal(false);
if (globalThis.RemoveNowBarApp) {
  globalThis.RemoveNowBarApp("player-playlist-bar");
}
os.unregisterApp("playing-playlist-flaot");
thisBot.CloseFloatingApp();
document.removeEventListener("keyup", () => {});
document.removeEventListener("keydown", () => {});
globalThis.SetEditRichText = null;
globalThis.SetEditAnnoData = null;
globalThis.tt && clearTimeout(tt);
os.removeBotListener(thisBot, "onKeyDown");
os.removeBotListener(thisBot, "onKeyUp");
globalThis.SetTab = null;
globalThis.isRecording = false;
globalThis.SelectedItemIDForAttachments = null;
globalThis.Playlist.RemoveScreenRecordingControls();
(async () => {
  try {
    await experiment.endRecording();
  } catch (err) {}
})();
globalThis.StopVideoRecording = false;
globalThis.RemoveApplicationByID &&
  globalThis.RemoveApplicationByID(globalThis.PLAYLIST_PANEL_ID);
globalThis.PLAYLIST_PANEL_ID = null;
globalThis.PlayingPlaylist = null;
globalThis[`defaultToggleGreyCheckPLayingPlaylist`] &&
  globalThis[`defaultToggleGreyCheckPLayingPlaylist`](null);
thisBot.CloseFloatingApp();
globalThis.IS_PLAYLIST_ACTIVE = false;
globalThis.SetSplitAppPanel2 && globalThis.SetSplitAppPanel2(null);
globalThis.makingPlaylist = false;
globalThis.SetMediaURL && globalThis.SetMediaURL(null);
globalThis.SetVideoSrc && globalThis.SetVideoSrc(null);
