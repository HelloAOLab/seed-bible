import { tryInitPlaylistMaker } from "ext_discover.helper.tryInitPlaylistMaker";

export async function openSelf(_that?: { force?: boolean }) {
  const G = globalThis as Record<string, any>;

  if (!G.makingPlaylist) {
    if (G["Playlist_package"]) {
      G["Playlist_package"].onClick();
    } else {
      const PlayList = await tryInitPlaylistMaker({ makeBooleansTrue: true });
      if (PlayList) {
        const id = uuid();
        G.PLAYLIST_PANEL_ID = id;
        G.AddApplication({
          id,
          App: <PlayList id={id} />,
          to: "panel",
          minWidth: "23rem",
        });
      }
    }
  }
}
