import type {
  PlaylistGroups,
  PlayingPlaylistId,
} from "ext_discover.models.playlist";

export function getActivePlaylistIds(
  playlists: PlaylistGroups,
  playingPlaylist: PlayingPlaylistId
): string[] {
  const G = globalThis as Record<string, unknown>;
  let id: string | null = null;

  Object.keys(playlists).forEach((pId) => {
    const pls = G[`${pId}playlists`] as Array<{ id: string }> | undefined;
    if (pls) {
      const plsIndex = pls.findIndex((pl) => pl.id === playingPlaylist);
      if (plsIndex > -1) {
        id = pId;
      }
    }
  });

  return id ? [id] : Object.keys(playlists);
}
