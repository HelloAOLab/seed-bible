const parentId = that?.parentId || 'default';
DataManager.cancelCurrentPlayingSound();
globalThis.SetSelected && SetSelected({});
globalThis.SetHolded && SetHolded({});
// globalThis.SetPlayingPlaylist && globalThis.SetPlayingPlaylist(false);
globalThis[`${parentId}ToggleGreyCheckPLayingPlaylist`] && globalThis[`${parentId}ToggleGreyCheckPLayingPlaylist`](null);
globalThis.IsQueuePresent = false;
// os.unregisterApp("playing-playlist");
globalThis.IS_PLAYLIST_ACTIVE = false;
globalThis.SetSplitAppPanel2(null);
globalThis.StopPlayingPlaylistModal(false);
if (globalThis.RemoveNowBarApp) {
    globalThis.RemoveNowBarApp('player-playlist-bar');
}
os.unregisterApp("playing-playlist-flaot");
thisBot.CloseFloatingApp();