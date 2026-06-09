const { currIndex, playlists, oldData, handleOnButtonPress, getCurrentItem } =
  that;

const G = globalThis as any;
const parentId = that?.parentId || "default";
const { name: currentPlaylistName } = playlists[currIndex.key];

const isMobile = (window?.innerWidth || gridPortalBot.tags.pixelWidth) < 766;

const targetItem = getCurrentItem(
  currIndex.key,
  currIndex.index,
  playlists,
  currIndex.subIndex,
  playlists[currIndex.key]?.isLayers
);
const currentItemName = targetItem;
const currentItemType = targetItem?.type;

const nextIndexes = handleOnButtonPress(1, true);
const prevIndex = handleOnButtonPress(-1, true);

const nextItem = getCurrentItem(
  nextIndexes.key,
  nextIndexes.index,
  playlists,
  nextIndexes.subIndex,
  playlists[nextIndexes.key]?.isLayers
);
const prevItem = prevIndex.isPreviousQueue
  ? oldData[oldData.length - 1]
  : getCurrentItem(
      prevIndex.key,
      prevIndex.index,
      playlists,
      prevIndex.subIndex,
      playlists[prevIndex.key]?.isLayers
    );

G.PlaylingItemVisitiedMap?.((prev: any) => ({
  ...prev,
  [targetItem.id]: true,
}));

if (targetItem?.type === "attachment-link") {
  if (!G.NotPlayThisTimeTheCurrentItem) {
    thisBot.RenderLinkContent({
      ...targetItem,
      isLastItem: !nextItem,
      isFirstItem: !prevItem,
    });
  } else {
    G.NotPlayThisTimeTheCurrentItem = false;
  }
} else if (currIndex.fromButton !== 0) {
  const isBulk =
    !!targetItem?.additionalInfo?.layers?.length ||
    Array.isArray(targetItem.additionalInfo);

  const toBeMapArray = targetItem?.additionalInfo?.layers?.length
    ? targetItem?.additionalInfo?.layers
    : Array.isArray(targetItem.additionalInfo);

  if (
    targetItem?.type === "heading" ||
    (!!targetItem?.nextTargetItem?.id &&
      currIndex.fromButton === 1 &&
      !G.StayVIAPressOfButton)
  ) {
    if (targetItem?.type === "heading") {
      const isMobile =
        (window?.innerWidth || G.gridPortalBot.tags.pixelWidth) <
        G.MOBILE_VIEWPORT_THRESHOLD;
      if (targetItem.additionalInfo.isQuotedText) {
        thisBot.ShowQuoteText({ quoteText: targetItem.content });
      } else if (isMobile) {
        G.SetTextInfo(targetItem.content);
      }
    }
    if (G.SetMediaURL) {
      G.SetMediaURL(null);
    }
    setTimeout(() => {
      thisBot.CloseFloatingApp();
    }, 100);

    if (G.SetVideoSrc) {
      G.SetVideoSrc(null);
    }
    if (targetItem?.type === "heading") {
      if (!G.NotPlayThisTimeTheCurrentItem) {
        G.PlayingPlaylistSetHeading(targetItem.content);
      } else {
        G.NotPlayThisTimeTheCurrentItem = false;
      }
    }
    const allKeys: any = Object.keys(playlists);

    const isFirstKey = currIndex.key == 0;
    const isLastKey = currIndex.key == allKeys[allKeys.length - 1];

    const th = playlists[currIndex.key]?.list;

    const isFirstItemAndBackButton =
      currIndex.fromButton < 0 && currIndex.index == 0 && isFirstKey;
    const isLastItemAndLastButton =
      currIndex.fromButton > 0 && isLastKey && currIndex.index == th.length - 1;
    if (targetItem?.nextTargetItem) {
      if (!G.NotPlayThisTimeTheCurrentItem) {
        thisBot.navigationWithDataItem({
          dataItem: isBulk ? toBeMapArray : targetItem,
          bulkAdd: isBulk,
        });
      } else {
        G.NotPlayThisTimeTheCurrentItem = false;
      }
      handleOnButtonPress(currIndex.fromButton);
      G[`${targetItem.id}OpenToggle`] && G[`${targetItem.id}OpenToggle`](true);
    }
    if (G.StayVIAPressOfButton) {
      G.StayVIAPressOfButton = false;
    }
    if (!isFirstItemAndBackButton && !isLastItemAndLastButton)
      handleOnButtonPress(currIndex.fromButton);
  } else {
    if (G.StayVIAPressOfButton) {
      G.StayVIAPressOfButton = false;
    }
    const skip = thisBot.checkIfNeedToSkip({ dataItem: targetItem });
    if (skip) {
      os.toast(`${targetItem.content} is Already Opened.Skipping it!`);
      handleOnButtonPress(currIndex.fromButton);
    } else {
      if (!G.NotPlayThisTimeTheCurrentItem) {
        thisBot.navigationWithDataItem({
          dataItem: isBulk ? toBeMapArray : targetItem,
          bulkAdd: isBulk,
        });
      } else {
        G.NotPlayThisTimeTheCurrentItem = false;
      }
    }
  }
}

if (G.RenderPlaylistTimer) {
  clearTimeout(G.RenderPlaylistTimer);
  G.RenderPlaylistTimer = null;
}
G.RenderPlaylistTimer = setTimeout(() => {
  thisBot.SetItemsPlayerPlaylist({
    currentPlaylistName: currentPlaylistName,
    currentItemID: targetItem.id,
    typeContent: currentItemType,
    nextItemName: nextItem,
    prevItemName: prevItem,
    currentItemName: currentItemName,
  });
  G.RenderPlaylist && G.RenderPlaylist();
  if (isMobile) {
    thisBot.applyMobileHeaderBar({
      currentItem: targetItem,
      currentPlaylistName,
      nextItem,
      parentId,
    });
  }
  G.RenderPlaylistTimer = null;
}, 50);

return [
  currentPlaylistName,
  targetItem.id,
  currentItemType,
  nextItem,
  prevItem,
  currentItemName,
];
