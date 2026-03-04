const parentId = that?.parentId || "default";
const G = globalThis;
DataManager.cancelCurrentPlayingSound();
G.SetSelected && G.SetSelected({});
G.SetHolded && G.SetHolded({});
// globalThis.SetPlayingPlaylist && globalThis.SetPlayingPlaylist(false);
G[`${parentId}ToggleGreyCheckPLayingPlaylist`] &&
  G[`${parentId}ToggleGreyCheckPLayingPlaylist`](null);
G.IsQueuePresent = false;
// os.unregisterApp("playing-playlist");
G.IS_PLAYLIST_ACTIVE = false;
G.SetSplitAppPanel2(null);
G.StopPlayingPlaylistModal(false);
if (G.RemoveNowBarApp) {
  G.RemoveNowBarApp("player-playlist-bar");
}
os.unregisterApp("playing-playlist-flaot");
thisBot.CloseFloatingApp();
