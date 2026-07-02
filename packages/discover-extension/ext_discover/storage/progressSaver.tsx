import { getStorageBot } from "ext_discover.storage.getStorageBot";

export function progressSaver() {
  const G = globalThis as Record<string, any>;
  const storageBot = getStorageBot();

  G.savePlaylistProgress = (
    id: string,
    progressID: string,
    parentID = "default"
  ) => {
    G[`updatePercent${id}`]((p: any) => !p);
    setTag(storageBot, "defaultplaylistProgress", G.defaultplaylistProgress);
    setTag(storageBot, "defaultplaylistChecked", G.defaultplaylistChecked);
  };

  const playlistsProgress = Object.keys(G.defaultplaylistProgress || {}).length
    ? G.defaultplaylistProgress
    : getTag(storageBot, "defaultplaylistProgress") || {};
  const playlistsChecked = Object.keys(G.defaultplaylistChecked || {}).length
    ? G.defaultplaylistChecked
    : getTag(storageBot, "defaultplaylistChecked") || {};

  G.defaultplaylistProgress = playlistsProgress;
  G.defaultplaylistChecked = playlistsChecked;
}
