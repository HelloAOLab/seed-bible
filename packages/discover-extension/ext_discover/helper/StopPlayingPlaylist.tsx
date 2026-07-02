import { CloseFloatingApp } from "ext_discover.helper.CloseFloatingApp";

export function StopPlayingPlaylist(that?: any) {
  const parentId = that?.parentId || "default";
  const G = globalThis as any;
  DataManager.cancelCurrentPlayingSound();
  G.SetSelected && G.SetSelected({});
  G.SetHolded && G.SetHolded({});
  // globalThis.SetPlayingPlaylist && globalThis.SetPlayingPlaylist(false);
  G[`${parentId}ToggleGreyCheckPLayingPlaylist`] &&
    G[`${parentId}ToggleGreyCheckPLayingPlaylist`](null);
  G.IsQueuePresent = false;
  // os.unregisterApp("playing-playlist");
  G.IS_PLAYLIST_ACTIVE = false;
  G.SetSplitAppPanel2 && G.SetSplitAppPanel2(null);
  G.StopPlayingPlaylistModal(false);
  if (G.RemoveNowBarApp) {
    G.RemoveNowBarApp("player-playlist-bar");
  }
  os.unregisterApp("playing-playlist-flaot");
  CloseFloatingApp();
  G.SetDontShowMobileBottomNavbar(false);
  G.SetMobileHeaderBar(null);
}
