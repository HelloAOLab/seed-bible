const { parentId, id, name, color, isCustomColor, icon, description } = that;

const playlists = globalThis[`${parentId}playlists`];

const idx = playlists.findIndex(ele => ele.id === id);

if (globalThis[`${parentId}SetPlaylists`] && idx > -1) {
    const playlistData = { ...playlists[idx] };

    let nameCount = 0;

    playlists.forEach(ele => {
        if (ele.name.startsWith(playlistData.name)) nameCount++;
    })

    playlistData.name = `${playlistData.name} (${nameCount})`;
    playlistData.id = createUUID();

    globalThis[`${parentId}SetPlaylists`]([...playlists, { ...playlistData }]);
}