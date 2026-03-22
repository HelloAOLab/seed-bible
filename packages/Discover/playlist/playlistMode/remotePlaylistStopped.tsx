const parentId = "default";
const G = globalThis as any;
G.IsPlaylistPlaying = false;
DataManager.cancelCurrentPlayingSound();
G.SetSelected && G.SetSelected({});
G.SetHolded && G.SetHolded({});
G[`${parentId}ToggleGreyCheckPLayingPlaylist`] &&
  G[`${parentId}ToggleGreyCheckPLayingPlaylist`](null);
G.IsQueuePresent = false;
G.IS_PLAYLIST_ACTIVE = false;
G.SetSplitAppPanel2 && G.SetSplitAppPanel2(null);
thisBot.OpenSelf();
if (G.RemoveNowBarApp) {
  G.RemoveNowBarApp("player-playlist-bar");
}
os.unregisterApp("playing-playlist-flaot");
thisBot.CloseFloatingApp();
