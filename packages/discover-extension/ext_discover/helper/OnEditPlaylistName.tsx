export function OnEditPlaylistName(that?: any) {
  const {
    parentId,
    id,
    name,
    color,
    description,
    icon,
    isCustomColor,
    selectedTags,
    isLayers,
  } = that;
  const G = globalThis as any;

  const playlists = G[`${parentId}playlists`];

  const idx = playlists.findIndex((ele: any) => ele.id === id);

  if (G[`${parentId}SetPlaylists`] && idx > -1) {
    const playlistData = { ...playlists[idx] };

    playlistData.name = name;
    playlistData.color = color;
    playlistData.description = description;
    playlistData.icon = icon;
    playlistData.isCustomColor = isCustomColor;
    playlistData.selectedTags = selectedTags;
    playlistData.isLayers = isLayers;

    playlists[idx] = { ...playlistData };

    G[`${parentId}SetPlaylists`]([...playlists]);
    G[`${parentId}creatingPlaylistName`] = "";
    G[`${parentId}SetPlaylistName`] && G[`${parentId}SetPlaylistName`]("");
  }
}
