export function SetItemsPlayerPlaylist(that?: any) {
  const {
    currentPlaylistName,
    currentItemID,
    typeContent,
    nextItemName,
    prevItemName,
    currentItemName,
  } = that;

  const G = globalThis as any;
  if (G.SetItemsPlayer) {
    G.SetItemsPlayer({
      currentPlaylistName,
      currentItemID,
      typeContent,
      nextItemName,
      prevItemName,
      currentItemName,
    });
  }

  G.PPcurrentPlaylistName = currentPlaylistName;
  G.PPcurrentItemID = currentItemID;
  G.PPtypeContent = typeContent;
  G.PPnextItemName = nextItemName;
  G.PPprevItemName = prevItemName;
  G.PPcurrentItemName = currentItemName;
}
