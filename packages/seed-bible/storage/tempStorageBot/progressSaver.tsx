globalThis.savePlaylistProgress = (id, progressID, parentID = "default") => {
    globalThis[`updatePercent${id}`](p => !p);
    setTag(thisBot, "defaultplaylistProgress", globalThis['defaultplaylistProgress']);
    setTag(thisBot, "defaultplaylistChecked", globalThis['defaultplaylistChecked']);
}

const playlistsProgress = Object.keys(globalThis.defaultplaylistProgress || {}).length ? globalThis.defaultplaylistProgress : (getTag(thisBot, "defaultplaylistProgress") || {});
const playlistsChecked = Object.keys(globalThis.defaultplaylistChecked || {}).length ? globalThis.defaultplaylistChecked : (getTag(thisBot, "defaultplaylistChecked") || {});

globalThis['defaultplaylistProgress'] = playlistsProgress;
globalThis['defaultplaylistChecked'] = playlistsChecked;

