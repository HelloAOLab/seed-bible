function getPlaylistBot(): Record<string, any> {
  const G = globalThis as Record<string, any>;
  return (
    (G.Playlist as Record<string, any>) ||
    (G.thisBot as Record<string, any>) ||
    {}
  );
}

export async function tryInitPlaylistMaker(that?: {
  makeBooleansTrue?: boolean;
}) {
  const G = globalThis as Record<string, any>;
  const playlistBot = getPlaylistBot();

  shout("closeShareButton");
  G.LocaleStorage?.historySaver?.();
  os.unregisterApp("quitGame");
  os.registerApp("quitGame", playlistBot);

  const makeBooleansTrue = that?.makeBooleansTrue;
  if (makeBooleansTrue) {
    if (G.makingPlaylist) {
      G.makingPlaylist = false;
      return;
    }
    G.makingPlaylist = true;
  }

  G.setOpenSidebar?.(false);
  const { PlaylistApp } = await import("ext_discover.app.PlaylistApp");
  return PlaylistApp;
}
