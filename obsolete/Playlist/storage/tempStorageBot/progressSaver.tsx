const G = globalThis as any;
G.savePlaylistProgress = (
  id: string,
  progressID: string,
  parentID = "default"
) => {
  G[`updatePercent${id}`]((p: any) => !p);
  setTag(thisBot, "defaultplaylistProgress", G["defaultplaylistProgress"]);
  setTag(thisBot, "defaultplaylistChecked", G["defaultplaylistChecked"]);
};

const playlistsProgress = Object.keys(G.defaultplaylistProgress || {}).length
  ? G.defaultplaylistProgress
  : getTag(thisBot, "defaultplaylistProgress") || {};
const playlistsChecked = Object.keys(G.defaultplaylistChecked || {}).length
  ? G.defaultplaylistChecked
  : getTag(thisBot, "defaultplaylistChecked") || {};

G["defaultplaylistProgress"] = playlistsProgress;
G["defaultplaylistChecked"] = playlistsChecked;
