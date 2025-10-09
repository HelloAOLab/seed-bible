const parentId = 'default';

globalThis.IsPlaylistPlaying = false;
DataManager.cancelCurrentPlayingSound();
globalThis.SetSelected && SetSelected({});
globalThis.SetHolded && SetHolded({});
globalThis[`${parentId}ToggleGreyCheckPLayingPlaylist`] &&
  globalThis[`${parentId}ToggleGreyCheckPLayingPlaylist`](null);
globalThis.IsQueuePresent = false;
globalThis.IS_PLAYLIST_ACTIVE = false;
globalThis.SetSplitAppPanel2 && globalThis.SetSplitAppPanel2(null);
thisBot.OpenSelf();
if (globalThis.RemoveNowBarApp) {
  globalThis.RemoveNowBarApp("player-playlist-bar");
}
os.unregisterApp("playing-playlist-flaot");
thisBot.CloseFloatingApp();
