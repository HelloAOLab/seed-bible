import { groupVerse } from "ext_discover.helper.groupVerse";

const G = globalThis as Record<string, any>;

export function getPlaylistRowPercentage(id: string, parentId: string): number {
  if (!id) return 0;

  const playlistsProgress = G[`${parentId}playlistProgress`];
  const playlistsChecked = G[`${parentId}playlistChecked`];
  const itemsProg = { ...(playlistsProgress?.[id] || {}) };
  const itemsCheck = { ...(playlistsChecked?.[id] || {}) };
  const completedItems = { ...itemsProg, ...itemsCheck };
  const playlistList = (G[`${id}playlists`] || []).find(
    (ele: { id: string }) => ele.id === id
  );

  const totalItems = playlistList?.list?.length || 0;

  if (!playlistList) return 0;

  let completedCount = 0;
  const tfHist = groupVerse(playlistList.list);

  tfHist.forEach((ele: { id: string; additionalInfo?: unknown[] }) => {
    const isGrouped = Array.isArray(ele.additionalInfo);
    if (completedItems[ele.id]) {
      if (isGrouped) {
        completedCount += ele.additionalInfo!.length;
      } else {
        completedCount++;
      }
    }
  });

  return Math.round((completedCount / totalItems) * 100);
}
