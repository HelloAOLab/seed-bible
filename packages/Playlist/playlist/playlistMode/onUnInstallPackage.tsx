const parentId = that?.parentId || "default";
const G = globalThis;
thisBot.CloseFloatingApp();
DataManager.cancelCurrentPlayingSound();
G.SetSelected && G.SetSelected({});
G.SetHolded && G.SetHolded({});
// globalThis.SetPlayingPlaylist && globalThis.SetPlayingPlaylist(false);
G[`${parentId}ToggleGreyCheckPLayingPlaylist`] &&
  G[`${parentId}ToggleGreyCheckPLayingPlaylist`](null);
G.IsQueuePresent = false;
// os.unregisterApp("playing-playlist");
G.IS_PLAYLIST_ACTIVE = false;
G.StopPlayingPlaylistModal && G.StopPlayingPlaylistModal(false);
if (G.RemoveNowBarApp) {
  G.RemoveNowBarApp("player-playlist-bar");
}
os.unregisterApp("playing-playlist-flaot");
thisBot.CloseFloatingApp();
document.removeEventListener("keyup", () => {});
document.removeEventListener("keydown", () => {});
G.SetEditRichText = null;
G.SetEditAnnoData = null;
G.tt && clearTimeout(G.tt);
os.removeBotListener(thisBot, "onKeyDown", () => {});
os.removeBotListener(thisBot, "onKeyUp", () => {});
G.SetTab = null;
G.isRecording = false;
G.SelectedItemIDForAttachments = null;
G.Playlist.RemoveScreenRecordingControls();
(async () => {
  try {
    await experiment.endRecording();
  } catch (err) {}
})();
G.StopVideoRecording = false;
G.RemoveApplicationByID && G.RemoveApplicationByID(G.PLAYLIST_PANEL_ID);
G.PLAYLIST_PANEL_ID = null;
G.PlayingPlaylist = null;
G[`defaultToggleGreyCheckPLayingPlaylist`] &&
  G[`defaultToggleGreyCheckPLayingPlaylist`](null);
thisBot.CloseFloatingApp();
G.IS_PLAYLIST_ACTIVE = false;
G.SetSplitAppPanel2 && G.SetSplitAppPanel2(null);
G.makingPlaylist = false;
G.SetMediaURL && G.SetMediaURL(null);
G.SetVideoSrc && G.SetVideoSrc(null);
