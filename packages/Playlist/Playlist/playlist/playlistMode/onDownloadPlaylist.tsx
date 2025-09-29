const { parentId, id } = that;

const playlists = globalThis[`${parentId}playlists`];

const idx = playlists.findIndex(ele => ele.id === id);

if (globalThis[`${parentId}SetPlaylists`] && idx > -1) {
    const playlistData = { ...playlists[idx] };
    const jsonStr = JSON.stringify(playlistData.list, null, 2);
    os.download(jsonStr, `${playlistData.name}.json`);
}