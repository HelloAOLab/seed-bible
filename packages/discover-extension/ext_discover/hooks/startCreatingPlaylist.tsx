const G = globalThis as Record<string, any>;

export function startCreatingPlaylist(
  name: string,
  playlist: any[] = [],
  id: string
): void {
  G.HISTORYExploreMode = false;
  G[`${id}creatingPlaylistName`] = name;
  G[`${id}creatingPlaylist`] = true;
  G[`${id}SetCreatingPlaylist`]?.(true, playlist);
}
