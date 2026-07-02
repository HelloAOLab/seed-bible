export function onDuplicatePlaylists(that?: any) {
  const { parentId, id, name, color, isCustomColor, icon, description } = that;
  const G = globalThis as any;
  const playlists = G[`${parentId}playlists`];

  const idx = playlists.findIndex((ele: any) => ele.id === id);

  if (G[`${parentId}SetPlaylists`] && idx > -1) {
    const playlistData = { ...playlists[idx], shareProfileName: false };

    let nameCount = 0;

    playlists.forEach((ele: any) => {
      if (ele.name.startsWith(playlistData.name)) nameCount++;
    });

    playlistData.name = `${playlistData.name} (${nameCount})`;
    playlistData.id = G.createUUID();

    G[`${parentId}SetPlaylists`]([...playlists, { ...playlistData }]);
  }
}
