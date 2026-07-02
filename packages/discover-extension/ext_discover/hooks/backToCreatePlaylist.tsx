const G = globalThis as Record<string, any>;

export function backToCreatePlaylist(
  name: string,
  playlist: any[] = [],
  id: string
): void {
  G.HISTORYExploreMode = false;
  G[`${id}creatingPlaylistName`] = name;
  G[`${id}creatingPlaylist`] = false;
  G[`${id}SetCreatingPlaylist`]?.(false, playlist);
}
