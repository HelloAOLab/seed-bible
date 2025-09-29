const {
    currentPlaylistName,
    currentItemID,
    typeContent,
    nextItemName,
    prevItemName,
    currentItemName
} = that;

if (globalThis.SetItemsPlayer) {
    globalThis.SetItemsPlayer({
        currentPlaylistName,
        currentItemID,
        typeContent,
        nextItemName,
        prevItemName,
        currentItemName
    });
}

globalThis.PPcurrentPlaylistName = currentPlaylistName;
globalThis.PPcurrentItemID = currentItemID;
globalThis.PPtypeContent = typeContent;
globalThis.PPnextItemName = nextItemName;
globalThis.PPprevItemName = prevItemName;
globalThis.PPcurrentItemName = currentItemName;