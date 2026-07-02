const G = globalThis as Record<string, any>;

export function getCurrentPlayingItem(
  key: number | string,
  index: number,
  playlists: Record<string, any>,
  subIndex: number,
  isHint = false
) {
  const list = playlists[key]?.list;

  let targetItem: any = null;
  let nextTargetItem: any = null;
  let nextTargetItemVideo = false;
  let isNested = false;

  if (!list) return;

  targetItem = list[index];

  const isCurrentItemTargetItem =
    targetItem?.type === "chapter-range" ||
    !!targetItem?.additionalInfo?.layers?.length;

  if (isCurrentItemTargetItem) {
    if (subIndex === 0) {
      nextTargetItem = targetItem.additionalInfo.layers[subIndex + 1] || null;
      if (nextTargetItem && !isHint) {
        nextTargetItemVideo = G.IsVideoAttachment(nextTargetItem);
        if (!nextTargetItemVideo || !nextTargetItem.autoPlay) {
          nextTargetItem = null;
        }
      }
    }
    targetItem = targetItem.additionalInfo.layers[subIndex];
    isNested = true;
  }

  let prefix = "";

  if (targetItem?.type === "heading") prefix = " - 'Heading'";

  return { ...targetItem, prefix, isNested, nextTargetItem };
}
