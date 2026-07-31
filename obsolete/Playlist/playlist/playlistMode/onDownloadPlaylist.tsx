const { parentId, id } = that;
const G = globalThis as any;
const playlists = G[`${parentId}playlists`];

const idx = playlists.findIndex((ele: any) => ele.id === id);

if (G[`${parentId}SetPlaylists`] && idx > -1) {
  const playlistData = { ...playlists[idx] };
  const jsonStr = JSON.stringify(playlistData.list, null, 2);
  os.download(jsonStr, `${playlistData.name}.json`);
}
