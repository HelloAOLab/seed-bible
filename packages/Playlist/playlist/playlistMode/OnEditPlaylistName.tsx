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

const playlists = globalThis[`${parentId}playlists`];

const idx = playlists.findIndex((ele) => ele.id === id);

if (globalThis[`${parentId}SetPlaylists`] && idx > -1) {
  const playlistData = { ...playlists[idx] };

  playlistData.name = name;
  playlistData.color = color;
  playlistData.description = description;
  playlistData.icon = icon;
  playlistData.isCustomColor = isCustomColor;
  playlistData.selectedTags = selectedTags;
  playlistData.isLayers = isLayers;

  playlists[idx] = { ...playlistData };

  globalThis[`${parentId}SetPlaylists`]([...playlists]);
}
