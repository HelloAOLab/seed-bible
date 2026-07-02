import { computed, effect, signal } from "@preact/signals";
import { CloseFloatingApp } from "ext_discover.helper.CloseFloatingApp";
import { openSelf } from "ext_discover.helper.openSelf";
import { PlayingLayersConversion } from "ext_discover.helper.PlayingLayersConversion";
import { getCurrentQueueInfo } from "ext_discover.helper.getCurrentQueueInfo";
import { resetPlaylistGlobalStateVars } from "ext_discover.helper.resetPlaylistGlobalStateVars";
import { navigationWithDataItem } from "ext_discover.helper.navigationWithDataItem";
import { getCurrentPlayingItem } from "ext_discover.hooks.getCurrentPlayingItem";
import { getPlaylistProgress } from "ext_discover.hooks.getPlaylistProgress";
import { isMobilePlaylistViewport } from "ext_discover.hooks.isMobilePlaylistViewport";
import { showQuoteText } from "ext_discover.helper.showQuoteText";
import type {
  PlaylistPlayerControlsManager,
  PlaylistQueueInfo,
} from "ext_discover.interfaces.managers.PlaylistPlayerControlsManager";
import type { PlaylistPlayerControlsProps } from "ext_discover.interfaces.components.PlaylistPlayerControls";

const G = globalThis as Record<string, any>;

const outerWebsiteItem: Record<string, boolean> = {
  youtube: true,
  iframe: true,
  video: true,
  Video: true,
  externalLink: true,
};

function getPlaylistBot(): Record<string, any> {
  return (
    (G.Playlist as Record<string, any>) ||
    (G.thisBot as Record<string, any>) ||
    {}
  );
}

const managersByScope = new Map<string, PlaylistPlayerControlsManager>();

export function getPlaylistPlayerControlsManager(
  scope = "default"
): PlaylistPlayerControlsManager {
  let m = managersByScope.get(scope);
  if (!m) {
    m = createPlaylistPlayerControlsManager(scope);
    managersByScope.set(scope, m);
  }
  return m;
}

export function createPlaylistPlayerControlsManager(
  scope = "default"
): PlaylistPlayerControlsManager {
  let parentIdStr = scope;
  const inheritedBarSig = signal(false);
  let mountCleanup: (() => void) | undefined;

  const syncProps = (props: PlaylistPlayerControlsProps) => {
    if (props.parentId) parentIdStr = props.parentId;
    inheritedBarSig.value = !!props.inheritedBar;
  };

  let showCurrent = signal(false);
  let queue = signal<any[]>([]);
  let openExternalLink = signal<string | null>(null);
  let transformedHistory = signal(G.PPthh);
  let oldData = signal<any[]>([]);
  let openAttachLink = signal(false);
  let checkedItems = signal<Record<string, boolean>>(
    G.PPreadingPlanEnabled
      ? { ...G.PPpastDateEvents }
      : { ...(G.PlayingPlaylistCheckedItems?.[G.PlayingPlaylistID] || {}) }
  );
  let currIndex = signal({
    key: 0,
    index: G.PPchecklistEnabled
      ? -1
      : G.PPreadingPlanEnabled
        ? G.PPfirstActiveIndex
        : G.PPfirstIndex,
    fromButton: 0,
    isPreviousQueue: false,
    subIndex: G.PPsubIndex,
  });
  let playlists = signal<any>({
    0: {
      name: G.PPplaylistName,
      list: [...PlayingLayersConversion(G.PPplaylist?.list || [])],
      id: G.createUUID(),
      playlistID: G.PPplaylist?.id,
      isLayers: G.PPplaylist?.isLayers,
    },
  });
  let mediaURL = signal<string | null>(null);
  let fileName = signal<string | null>(null);
  let videoSrc = signal<any>(false);
  let textInfo = signal("");
  let activeIndexs = signal({ ...G.PPclosestNearDateEvent });
  const justAddedQueue = { current: false };

  const queueInfo = signal({
    currentPlaylistName: "",
    currentItemID: "",
    typeContent: "",
    nextItemName: null as any,
    prevItemName: null as any,
    currentItemName: null as any,
    currentItem: null as any,
  });
  const progress = signal({ safeCurrent: 0, safeTotal: 0, percent: 0 });

  const setCurreIndex = (v: any) => {
    currIndex.value = typeof v === "function" ? v(currIndex.value) : v;
  };
  const setPlaylists = (v: any) => {
    playlists.value = typeof v === "function" ? v(playlists.value) : v;
  };
  const setTransformedHistory = (v: any) => {
    transformedHistory.value =
      typeof v === "function" ? v(transformedHistory.value) : v;
  };
  const setVideoSrc = (v: any) => {
    videoSrc.value = v;
  };
  const setTextInfo = (v: string) => {
    textInfo.value = v;
  };
  const setMediaURL = (url: any) => {
    if (url === null) {
      mediaURL.value = null;
      fileName.value = null;
    } else {
      mediaURL.value = url;
    }
  };
  const setOpenExternalLink = (link: string | null) => {
    openExternalLink.value = link;
  };

  effect(() => {
    const res = getCurrentQueueInfo({
      currIndex: currIndex.value,
      playlists: playlists.value,
      oldData: oldData.value,
      handleOnButtonPress,
      getCurrentItem: getCurrentPlayingItem,
      parentId: parentIdStr,
    });
    const [
      currentPlaylistName,
      currentItemID,
      typeContent,
      nextItemName,
      prevItemName,
      currentItemName,
    ] = res;
    queueInfo.value = {
      currentPlaylistName,
      currentItemID,
      typeContent,
      nextItemName,
      prevItemName,
      currentItemName,
      currentItem: currentItemName,
    };
    progress.value = getPlaylistProgress(
      playlists.value,
      currIndex.value,
      G.PPchecklistEnabled,
      checkedItems.value
    );
  });

  const setIncrementalCount = async (data: any) => {
    if (!data) return;
    mediaURL.value = data;
  };

  const handlesetIndex = (index = 0, key: any) => {
    const nextItem = transformedHistory.value[index];
    const isPlaylist = !!nextItem?.list;
    if (isPlaylist) {
      currIndex.value = {
        index,
        key,
        fromButton: currIndex.value.fromButton,
        isPreviousQueue: false,
        subIndex: 0,
      };
    } else {
      currIndex.value = {
        index,
        key,
        fromButton: currIndex.value.fromButton,
        isPreviousQueue: false,
        subIndex: 0,
      };
    }
  };

  const handleOnButtonPress: any = (
    order = 0,
    getIndexOnly = false,
    directSet = false,
    directSetKey = false,
    newIndexs?: any
  ) => {
    const indexes = newIndexs ? newIndexs : { ...currIndex.value };

    let newIndex = directSet ? directSet : indexes.index + order;
    let newSubIndex = directSet ? 0 : indexes.subIndex;
    let newKey = directSetKey ? directSetKey : indexes.key;

    // const isLayer = playlists[indexes.key]?.isLayers;

    const tranformedList = playlists[indexes.key]?.list;
    const currentItem = tranformedList[indexes.index];

    const toBeMapArray = currentItem?.additionalInfo?.layers || [];
    // const isCurrentItemGroup = tranformedList[]

    const isCurrentItemChapterRange =
      currentItem?.type === "chapter-range" ||
      !!currentItem?.additionalInfo?.layers?.length;

    if (!isCurrentItemChapterRange) newSubIndex = 0;

    if (isCurrentItemChapterRange && !directSet) {
      const lengthOfChapterRange = toBeMapArray?.length;
      newIndex -= order;
      if (order > 0) {
        if (lengthOfChapterRange <= newSubIndex + order) {
          const nextItem = tranformedList[indexes.index + 1];
          // This Might Break When Order is > 1
          newSubIndex = (newSubIndex + order) % lengthOfChapterRange;
          if (nextItem) newIndex += 1;
        } else {
          newSubIndex += order;
        }
      } else {
        if (newSubIndex + order < 0) {
          const prevItem = tranformedList[indexes.index - 1];

          const wasPrevItemArray = prevItem?.type === "chapter-range";

          const prevItemList = wasPrevItemArray
            ? prevItem?.additionalInfo
            : prevItem?.additionalInfo?.layers?.length
              ? prevItem?.additionalInfo?.layers
              : [];
          // This Might Break When Order is > 1
          newSubIndex = prevItemList.length + newSubIndex + order;
          if (prevItem) newIndex -= 1;
        } else {
          newSubIndex += order;
        }
      }
    }

    if (!directSet) {
      if (order > 0) {
        const currentListLength = tranformedList.length;

        if (
          currentListLength <= indexes.index + order &&
          (!isCurrentItemChapterRange ||
            indexes.subIndex + order >= toBeMapArray?.length)
        ) {
          const allKeys = Object.keys(playlists);
          const currentKeyIndex = allKeys.findIndex(
            (ele) => ele == indexes.key
          );
          newKey = allKeys[currentKeyIndex + 1];
          // newKey = parseInt(indexes.key) + 1;
          newIndex = (indexes.index + order) % currentListLength;
          newSubIndex = 0;
        }
      } else {
        if (indexes.index + order < 0 && indexes.subIndex + order < 0) {
          const allKeys = Object.keys(playlists);
          const currentKeyIndex = allKeys.findIndex(
            (ele) => ele == indexes.key
          );
          newKey = allKeys[currentKeyIndex - 1];
          newIndex = playlists[newKey]?.list?.length - 1;
          newSubIndex = 0;
        }
      }
    }

    const newValues = {
      index: newIndex,
      key: newKey,
      fromButton: order,
      isPreviousQueue: false,
      subIndex: newSubIndex,
    };

    const targetItem = getCurrentPlayingItem(
      newValues.key,
      newValues.index,
      playlists,
      newValues.subIndex,
      playlists[newValues.key]?.isLayers
    );

    const isLayersAndScripture =
      playlists[newValues.key]?.isLayers &&
      targetItem?.type !== "attachment-link" &&
      newValues.subIndex !== 0;

    if (
      ["heading", "date"].findIndex((ele) => ele === targetItem?.type) > -1 ||
      isLayersAndScripture
    ) {
      if (
        targetItem?.type === "heading" &&
        // targetItem?.additionalInfo?.subType === "text" &&
        !getIndexOnly
      ) {
        const isMobile = isMobilePlaylistViewport();
        if (targetItem.additionalInfo.isQuotedText) {
          if (!G.NotPlayThisTimeTheCurrentItem) {
            showQuoteText({ quoteText: targetItem.content });
          } else {
            G.NotPlayThisTimeTheCurrentItem = false;
          }
        } else if (isMobile) {
          if (!G.NotPlayThisTimeTheCurrentItem) {
            G.SetTextInfo(targetItem.content);
          } else {
            G.NotPlayThisTimeTheCurrentItem = false;
          }
        }
      }

      if (targetItem?.type === "date" && !getIndexOnly) {
        G.PlaylingItemVisitiedMap?.((prev: any) => ({
          ...prev,
          [targetItem.id]: true,
        }));
      }

      const newVals = handleOnButtonPress(
        order,
        getIndexOnly,
        directSet,
        directSetKey,
        newValues
      );
      return newVals;
    }

    if (getIndexOnly) return newValues;
    const id = targetItem.id;

    // console.log("CHECK", id, refs);
    // console.log("CHECK 2", refs[id]?.current);
    // console.log("CHECK 2", refs[id]?.current?.focus);
    // if (refs[id]?.current.focus) {
    //     globalThis.ScrollTimerPlaylist && clearTimeout(globalThis.ScrollTimerPlaylist);
    //     globalThis.ScrollTimerPlaylist = setTimeout(() => {
    //         refs[id].current.focus();
    //     }, 1000)
    // }

    if (targetItem.type === "verse") {
      if (G.NotPlayThisTimeTheCurrentItem) {
        G.NotPlayThisTimeTheCurrentItem = false;
      } else {
        if (G.FocusOnVerse) {
          G.FocusOnVerse(targetItem.additionalInfo.verse);
        }
      }
    }

    if (
      targetItem.additionalInfo.isValid &&
      targetItem.additionalInfo.type === "externalLink"
    ) {
      G.SetOpenExternalLink &&
        G.SetOpenExternalLink(targetItem.additionalInfo.link);
    }

    justAddedQueue.current = false;
    G.LAST_QUEUE_IIEM = {};
    setCurreIndex(newValues);
  };

  const justAddedQueue = { current: false };

  const addToQueue = (item: any, combineLast: boolean) => {
    const isArr = Array.isArray(item);

    let toAddItems = [];

    if (isArr) {
      toAddItems = [
        ...item.map((ele: any) => ({ id: G.createUUID(), ...ele })),
      ];
      G.LAST_QUEUE_IIEM = item[item.length];
    } else {
      const isSame = G.objectComparator(item, G.LAST_QUEUE_IIEM || {}, [
        "content",
      ]);

      if (isSame) return os.toast("Last Item Repeated!");
      toAddItems = [{ ...item, id: G.createUUID() }];
      G.LAST_QUEUE_IIEM = item;
    }

    setPlaylists((prevPlaylists: any) => {
      let currentKey = currIndex.value.key;
      const currentPlaylist = prevPlaylists[currentKey];
      const playlistID = currentPlaylist.playlistID;

      if (!currentPlaylist) {
        console.error("Current playlist key does not exist!");
        return prevPlaylists;
      }

      const { list: currentList, SQ, isLayers } = currentPlaylist;
      let splitIndex = currIndex.value.index;

      let extraPoints = 0;

      const thh = currentList;

      thh.forEach((ele: any, index: number) => {
        if (index <= splitIndex) {
          if (Array.isArray(ele.additionalInfo)) {
            extraPoints += ele.additionalInfo.length - 1;
          }
        }
      });

      splitIndex += extraPoints;

      let totalQueue = 0;
      Object.keys(prevPlaylists).forEach((currentKeyItr) => {
        if (prevPlaylists[currentKeyItr].SQ) totalQueue++;
      });

      const updatedPlaylists = { ...prevPlaylists };

      let keyUsed: any = currentKey;

      if (SQ || justAddedQueue.current) {
        if (justAddedQueue.current) {
          currentKey = Number(currIndex.value.key) + 1;
        }
        if (combineLast) {
          updatedPlaylists[currentKey]?.list.pop();
        }
        // Case: Adding to an existing special queue
        updatedPlaylists[currentKey].list = [
          ...(updatedPlaylists[currentKey]?.list || []),
          ...toAddItems,
        ];

        keyUsed = currentKey;
      } else {
        // Case: Splitting a playlist
        const beforeCurrentIndex = currentList.slice(0, splitIndex + 1);
        const afterCurrentIndex = currentList.slice(splitIndex + 1);

        const newQueueKey = `${currIndex.value.key}.1`; // Next numeric key
        const newQueue = {
          name: `Queue ${totalQueue + 1}`,
          list: [...toAddItems],
          id: G.createUUID(),
          SQ: true, // Mark this as a special queue,
          playlistID: null,
        };

        const isNothingPlayingInChecklist = `${currIndex.value.index}` !== "-1";

        if (!G.PPchecklistEnabled || isNothingPlayingInChecklist) {
          // Update the current playlist with items before the split
          updatedPlaylists[currentKey] = {
            ...currentPlaylist,
            list: beforeCurrentIndex,
          };
        }

        // if (!readingPlanEnabled) {
        // Add the new queue
        updatedPlaylists[newQueueKey] = newQueue;
        keyUsed = newQueueKey;
        // } else if (findLastActiveIndex > -1) {
        //     findLastActiveIndex++;
        //     currentList.splice(findLastActiveIndex, 0, item);
        //     updatedPlaylists[currentKey].list = currentList;
        //     activeIndexs.value = prev => ({ ...prev, [item.id]: true });
        // }

        if (!G.PPchecklistEnabled || isNothingPlayingInChecklist) {
          updatedPlaylists[currentKey].broken = true;
          if (afterCurrentIndex.length > 0) {
            updatedPlaylists[`${currIndex.value.key}.2`] = {
              name: `${currentPlaylist.name}`,
              list: [...afterCurrentIndex],
              id: G.createUUID(),
              SQ: false, // Mark this as a special queue
              playlistID,
            };
          }
        }
      }
      justAddedQueue.current = true;

      // Renumber keys to ensure sequential ordering
      const reorderedPlaylists: any = {};
      Object.keys(updatedPlaylists)
        .sort((a, b) => Number(a) - Number(b)) // Sort numerically
        .forEach((key, index) => {
          if (key == keyUsed) {
            G.LAST_SQ_KEY_USED = index;
            G.BlinkAfterPlaylistAddRef = index;
          }
          reorderedPlaylists[index] = { ...updatedPlaylists[key] };
          if (!reorderedPlaylists[index]?.list?.length) {
            delete reorderedPlaylists[index];
          }
        });
      G.NotPlayThisTimeTheCurrentItem = true;
      return reorderedPlaylists;
    });
    openAttachLink.value = false;
  };

  const attachLink = (title: string, link: string, linkState: any) => {
    G.SetQueue({
      content: title,
      additionalInfo: { link, ...linkState },
      type: linkState.type === "text" ? "heading" : "attachment-link",
    });
    openAttachLink.value = false;
  };

  const massAdd = (items: any) => {
    G.SetQueue(items);
  };

  const setJustAddedQueue = (val: boolean) => {
    justAddedQueue.current = val;
  };

  G.SET_JUST_ADDED_QUEUE = setJustAddedQueue;

  effect(() => {
    G.SetCurreIndexPlaylist = handlesetIndex;
    G.SetCurreIndexDirect = setCurreIndex;
    G.HandleOnButtonPress = handleOnButtonPress;
    G.ModifyTransformedHistory = setTransformedHistory;
    G.IsPlaylistPlaying = true;
    G.SetQueue = addToQueue;
    G.SetPlayingList = setPlaylists;
    G.HandleOnButtonPress = handleOnButtonPress;

    G.SetIncrementalCountPlayingPlaylist = setIncrementalCount;
    G.SetVideoSrc = setVideoSrc;
    G.SetMediaURL = (url: any) => {
      if (url === null) {
        setMediaURL(null);
        setFileName(null);
      } else {
        setMediaURL(url);
      }
    };
    G.SetFileName = setFileName;
    G.SetTextInfo = setTextInfo;

    G.PlayingPlaylists = playlists.value;
    G.SetPlayingPlaylists = setPlaylists;
    G.CurrentIndexItem = currIndex.value;
    G.SetCheckedItemsPlayingPlaylist = (ids: any) => {
      checkedItems.value = ids;
      setTimeout(() => {
        G.RenderPlaylistPlaying?.();
      }, 100);
    };

    G.UpdateJustAddedToQueue = (val: boolean) => {
      justAddedQueue.current = val;
    };

    if (G.PPreadingPlanEnabled) {
      G.READING_PLAN_WORK = true;
      // G.IS_PLAYLIST_ACTIVE = 0;
    }
    return () => {
      if (!G.IsASwitchBetweenBar) {
        G.SetCurreIndexPlaylist = null;
        G.HandleOnButtonPress = null;
        G.ModifyTransformedHistory = null;
        G.SetQueue = false;
        G.SetCurreIndexDirect = null;
        G.SetPlayingList = () => {};
        G.SetSelected && G.SetSelected({});
        G.READING_PLAN_WORK = false;
        G.HandleOnButtonPress = null;
        G.SetIncrementalCountPlayingPlaylist = null;
        G.SetVideoSrc = null;
        G.SetFileName = null;
        G.SetTextInfo = null;
        G.SetMediaURL = null;
        G.PlayingPlaylists = null;
        G.SetPlayingPlaylists = null;
        G.CurrentIndexItem = null;
        G.SetCheckedItemsPlayingPlaylist = null;
        G.UpdateJustAddedToQueue = null;
        // globalThis.IS_PLAYLIST_ACTIVE = true;
      }
    };
  });

  effect(() => {
    if (G.PPchecklistEnabled) {
      setTimeout(() => {
        void openSelf();
      }, 200);
    }

    G.SetOpenExternalLinkControl = (link: string) => {
      console.log("SetOpenExternalLinkControl", link);
      if (isMobilePlaylistViewport()) {
        openExternalLink.value = link;
      } else {
        os.openURL(link);
      }
    };

    return () => {
      if (!G.IsASwitchBetweenBar) {
        G.IsPlaylistPlaying = false;
        G.IsQueuePresent = false;
        G.RemotePlaylistPlayed = false;
        G.EmitData("playlistStopped", {});
      }
      G.IsASwitchBetweenBar = false;
      G.SetOpenExternalLink = null;
    };
  });

  effect(() => {
    G.UpdateCheckedItemsPlayingPlaylist &&
      G.UpdateCheckedItemsPlayingPlaylist(checkedItems, G.PlayingPlaylistID);
  });

  const mount = () => {
    // effects from original useLayoutEffect blocks wired in component mount
    return () => {
      mountCleanup?.();
    };
  };

  const isMobile = computed(() => isMobilePlaylistViewport());
  const isMobileSmall = computed(() => isMobilePlaylistViewport());
  const isItemLink = computed(
    () => !!outerWebsiteItem[queueInfo.value.currentItem?.additionalInfo?.type]
  );

  return {
    parentId: parentIdStr,
    inheritedBar: inheritedBarSig,
    showCurrent,
    queue,
    openExternalLink,
    transformedHistory,
    oldData,
    openAttachLink,
    checkedItems,
    currIndex,
    playlists,
    mediaURL,
    fileName,
    videoSrc,
    textInfo,
    activeIndexs,
    queueInfo,
    progress,
    isMobile,
    isMobileSmall,
    isItemLink,
    mount,
    syncProps,
    handleOnButtonPress,
    handlesetIndex,
    addToQueue,
    attachLink,
    massAdd,
    setOpenAttachLink: (v: boolean) => {
      openAttachLink.value = v;
    },
    setOpenExternalLink: (v: string | null) => {
      openExternalLink.value = v;
    },
    stopPlaylist: () => {
      G.IsPlaylistPlaying = false;
      DataManager.cancelCurrentPlayingSound();
      G.SetSelected && G.SetSelected({});
      G.SetHolded && G.SetHolded({});
      G[`${parentIdStr}ToggleGreyCheckPLayingPlaylist`] &&
        G[`${parentIdStr}ToggleGreyCheckPLayingPlaylist`](null);
      G.IsQueuePresent = false;
      G.IS_PLAYLIST_ACTIVE = false;
      G.SetSplitAppPanel2 && G.SetSplitAppPanel2(null);
      void openSelf();
      if (G.RemoveNowBarApp) G.RemoveNowBarApp("player-playlist-bar");
      os.unregisterApp("playing-playlist-flaot");
      resetPlaylistGlobalStateVars();
      CloseFloatingApp();
    },
    goNext: () => {
      if (G.HandleOnButtonPress) G.HandleOnButtonPress(1);
    },
    goPrev: () => {
      if (G.HandleOnButtonPress) G.HandleOnButtonPress(-1);
    },
  };
}
