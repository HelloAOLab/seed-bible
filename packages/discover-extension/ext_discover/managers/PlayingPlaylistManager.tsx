import { effect, signal } from "@preact/signals";
import { invokeRenderLinkContent } from "ext_discover.helper.playlistPlaybackHelpers";
import { setupNowBarControlApp } from "ext_discover.helper.setupNowBarControlApp";
import { navigationWithDataItem } from "ext_discover.helper.navigationWithDataItem";
import { isMobilePlaylistViewport } from "ext_discover.hooks.isMobilePlaylistViewport";
import type {
  PlayingPlaylistManager,
  PlayingPlaylistPlayerState,
} from "ext_discover.interfaces.managers.PlayingPlaylistManager";

const G = globalThis as Record<string, any>;

function getPlaylistBot(): Record<string, any> {
  return (
    (G.Playlist as Record<string, any>) ||
    (G.thisBot as Record<string, any>) ||
    {}
  );
}

const managersByScope = new Map<string, PlayingPlaylistManager>();

export function getPlayingPlaylistManager(
  scope = "default"
): PlayingPlaylistManager {
  let m = managersByScope.get(scope);
  if (!m) {
    m = createPlayingPlaylistManager(scope);
    managersByScope.set(scope, m);
  }
  return m;
}

export function createPlayingPlaylistManager(
  scope = "default"
): PlayingPlaylistManager {
  let parentIdStr = scope;
  let currentFormat: string | undefined;
  let mounted = false;

  const renderTick = signal(0);
  const renderPlaylistTick = signal(0);
  const isPlaybarInherited = signal(false);
  const showSettingsOptions = signal(false);
  const openAttachLink = signal(false);
  const hide = signal(false);
  const queue = signal<any[]>([]);
  const itemVisitedMap = signal<Record<string, boolean>>({
    ...(G.PPpastDateEvents || {}),
  });
  const heading = signal("");
  const activeDate = signal<any>(null);
  const queueDeleteConfirm = signal(-1);
  const playerState = signal<PlayingPlaylistPlayerState>({
    currentPlaylistName: G.PPcurrentPlaylistName || "",
    currentItemID: G.PPcurrentItemID || "",
    typeContent: G.PPtypeContent || "",
    nextItemName: G.PPnextItemName || "",
    prevItemName: G.PPprevItemName || "",
    currentItemName: G.PPcurrentItemName || "",
  });
  const showMorePosition = { current: G.getPosition?.() || {} };
  const refs = signal<Record<string, any>>({});
  const isMobile = signal(isMobilePlaylistViewport());

  const syncSession = (session: {
    parentId: string;
    currentFormat?: string;
  }) => {
    parentIdStr = session.parentId;
    currentFormat = session.currentFormat;
  };

  const rebuildRefs = () => {
    const refsMap: Record<string, any> = {};
    const playlistsProgress = G[`${parentIdStr}playlistProgress`] || {};
    const playlistsChecked = G[`${parentIdStr}playlistChecked`] || {};
    let progressItemsTemp: Record<string, boolean> = {};
    Object.keys(G.PlayingPlaylists || {}).forEach((key) => {
      const { list, playlistID } = G.PlayingPlaylists[key];
      list.forEach((ele: any) => {
        refsMap[ele.id] = { current: null };
      });
      if (playlistID) {
        progressItemsTemp = {
          ...progressItemsTemp,
          ...(playlistsProgress[playlistID] || {}),
        };
      }
    });
    G.PlaylingItemVisitiedMap?.({
      ...(G.PPpastDateEvents || {}),
      ...progressItemsTemp,
    });
    refs.value = refsMap;
  };

  const toggleHide = () => {
    hide.value = !hide.value;
  };
  const setShowSettingsOptions = (v: boolean) => {
    showSettingsOptions.value = v;
  };
  const setOpenAttachLink = (v: boolean) => {
    openAttachLink.value = v;
  };
  const setQueueDeleteConfirm = (v: number) => {
    queueDeleteConfirm.value = v;
  };
  const setIsPlaybarInherited = (v: boolean) => {
    isPlaybarInherited.value = v;
  };

  const onClick = (params: any) => {
    const { key, dataItem, bulkAdd = false } = params;
    const data = bulkAdd ? { ...dataItem[0] } : { ...dataItem };

    const isLayers = G.PlayingPlaylists[key].isLayers;

    const th = G.PlayingPlaylists[key].list;
    let index = th.findIndex((ele: any) => ele.id === data.id);
    let subIndex = 0;

    if (bulkAdd || index === -1) {
      th.findIndex((item: any, i: any) => {
        const toBeMapped = item.additionalInfo.layers || [];
        if (Array.isArray(toBeMapped)) {
          const idMap: Record<string, number> = {};
          toBeMapped.forEach(({ id }, index: number) => {
            idMap[id] = index;
          });
          if (idMap[data.id] && idMap[data.id] !== 0) {
            index = i;
            subIndex = idMap[data.id] || 0;
          }
        }
      });
    }
    if (index > -1) {
      G.UpdateJustAddedToQueue(false);
      G.StayVIAPressOfButton = true;
      G.SetCurreIndexDirect({
        key: key,
        index: index,
        fromButton: G.CurrentIndexItem.fromButton || 1,
        isPreviousQueue: false,
        subIndex: subIndex,
      });
    }
  };

  const editDataFromPlaylist = (ids: any, key: string, play: boolean) => {
    const isShiftHold = G?.KEY_HOLD?.["shift"];

    const prevIds = {
      ...(G.PlayingPlaylistCheckedItems?.[G.PlayingPlaylistID] || {}),
    };

    const isArray = Array.isArray(ids);

    let newIds = isArray ? [...ids] : [ids];

    let firstIDIndex = -1;

    const newIdsmap: Record<string, boolean> = {};

    newIds.forEach((ele) => {
      newIdsmap[ele] = true;
    });

    let targetItem: any = [];

    newIds.forEach((id) => {
      prevIds[id] = !prevIds[id];
    });

    const playlist = G.PlayingPlaylists[key];

    let startI = Number.MAX_SAFE_INTEGER;
    let endI = Number.MIN_SAFE_INTEGER;

    playlist.list.forEach((ele: any, index: any) => {
      if (newIdsmap[ele.id]) {
        if (firstIDIndex === -1) {
          firstIDIndex = index;
        }
      }
    });

    if (isShiftHold) {
      const lastIdIndex = G.LAST_INDEX_CHECKLIST_CHECKED;
      startI = Math.min(lastIdIndex, firstIDIndex);
      endI = Math.max(lastIdIndex, firstIDIndex);
    }

    playlist.list.forEach((ele: any, index: any) => {
      if (newIdsmap[ele.id]) {
        if (firstIDIndex === -1) {
          firstIDIndex = index;
        }
      }
      if (newIdsmap[ele.id] && prevIds[ele.id]) {
        targetItem.push(ele);
      }
      if (startI <= index && index <= endI) {
        prevIds[ele.id] = true;
      }
    });

    G.LAST_INDEX_CHECKLIST_CHECKED = firstIDIndex;

    const thCurrent = playlist.list;

    if (targetItem.length > 1) {
      thCurrent.forEach((ele: any) => {
        if (Array.isArray(ele.additionalInfo)) {
          const isMatch = ele.additionalInfo.some((ele: any) => {
            return newIdsmap[ele.id];
          });
          if (isMatch) {
            targetItem = ele;
          }
        }
      });
    } else {
      targetItem = targetItem[0];
    }

    if (targetItem && play) {
      if (targetItem.type === "attachment-link") {
        invokeRenderLinkContent({
          ...targetItem,
          isLastItem: false,
          isFirstItem: false,
        });
      } else {
        const isBulk = Array.isArray(targetItem.additionalInfo);
        navigationWithDataItem(
          {
            dataItem: isBulk ? targetItem.additionalInfo : targetItem,
            bulkAdd: isBulk,
          },
          getPlaylistBot()
        );
      }
    }
    G.SetCheckedItemsPlayingPlaylist(prevIds);
  };

  // const tranformedList = globalThis.PlayingPlaylists?.[globalThis.CurrentIndexItem?.key]?.list;
  // const currentItem = tranformedList?.[globalThis.CurrentIndexItem?.index];

  const onDeleteFromQueue = (
    key: string,
    index: number,
    pId: string,
    id: string
  ) => {
    G.LAST_QUEUE_IIEM = {};
    G.SetPlayingPlaylists?.((prev: any) => {
      const oldPlayingList = {
        ...prev,
      };

      const oldKeyList = oldPlayingList[key]
        ? { ...oldPlayingList[key] }
        : null;
      let indexParent = -1;
      if (oldKeyList && index !== undefined) {
        const indexesToBeRemoved: Record<number, boolean> = {};
        let isDeletingCurrentPlayingItem = false;
        let list = [...oldKeyList.list];
        if (pId) {
          indexParent = list.findIndex((ele: any) => ele.id === pId);
          if (indexParent > -1) {
            list = [...list[indexParent].additionalInfo.layers];
          }
        }
        const i = Array.isArray(index) ? index : [index];
        i.forEach((ele: any) => {
          if (typeof ele === "number") {
            indexesToBeRemoved[ele] = true;
            const idOfItem = list[ele].id;
            if (
              idOfItem === playerState.value.currentItemID &&
              !isDeletingCurrentPlayingItem
            ) {
              isDeletingCurrentPlayingItem = true;
            }
          } else {
            const index = list.findIndex((e: any) => e.id === ele);
            if (index > -1) {
              indexesToBeRemoved[index] = true;
              if (
                playerState.value.currentItemID === ele &&
                !isDeletingCurrentPlayingItem
              ) {
                isDeletingCurrentPlayingItem = true;
              }
            }
          }
        });

        let nextActiveItemId = -1;
        let hasTouchedTheRemovedItem = false;

        list = list.filter((ele: any, index: number) => {
          if (
            !indexesToBeRemoved[index] &&
            nextActiveItemId === -1 &&
            hasTouchedTheRemovedItem
          ) {
            nextActiveItemId = ele.id;
          } else if (indexesToBeRemoved[index]) {
            hasTouchedTheRemovedItem = true;
          }
          return !indexesToBeRemoved[index];
        });

        if (list.length === 0 && !pId) {
          setTimeout(() => {
            onDeleteWholeQueue(parseInt(key));
          }, 100);
          return oldPlayingList;
        }

        if (nextActiveItemId === -1 && hasTouchedTheRemovedItem) {
          nextActiveItemId = list[list.length - 1].id;
        }

        const nextActiveItem = list.findIndex(
          (ele: any) => ele.id === nextActiveItemId
        );

        G.LastListState = {
          ...oldPlayingList,
        };

        G.LastCurrentIndexState = {
          ...G.CurrentIndexItem,
        };

        const isCurrentQueueDistrubed = G.CurrentIndexItem.key === key;

        if (isCurrentQueueDistrubed && !isDeletingCurrentPlayingItem) {
          const newIndexOfCurrentItem = list.findIndex(
            (ele: any) => ele.id === playerState.value.currentItemID
          );
          if (newIndexOfCurrentItem > -1) {
            G.SetCurreIndexDirect({
              key: key,
              index: pId ? G.CurrentIndexItem.index : newIndexOfCurrentItem,
              fromButton: G.CurrentIndexItem.fromButton || 1,
              isPreviousQueue: false,
              subIndex: pId ? newIndexOfCurrentItem : 0,
            });
          }
        }

        if (isDeletingCurrentPlayingItem) {
          if (pId && list.length === 0) {
            G.SetCurreIndexDirect({
              key: key,
              index: 0,
              fromButton: G.CurrentIndexItem.fromButton || 1,
              isPreviousQueue: false,
              subIndex: 0,
            });
          } else {
            G.SetCurreIndexDirect({
              key: key,
              index: pId ? G.CurrentIndexItem.index : nextActiveItem,
              fromButton: G.CurrentIndexItem.fromButton || 1,
              isPreviousQueue: false,
              subIndex: pId ? nextActiveItem : 0,
            });
          }
        } else {
          G.NotPlayThisTimeTheCurrentItem = true;
        }

        if (pId && indexParent) {
          oldKeyList.list[indexParent].additionalInfo.layers = list;
        } else {
          oldKeyList.list = list;
        }
        oldPlayingList[key] = oldKeyList;
      }

      ShowNotification({
        message: t("queueItemDeleted"),
        severity: "success",
        onUndoActions: () => {
          G.SetPlayingPlaylists?.({
            ...G.LastListState,
          });
          G.SetCurreIndexDirect?.({
            ...G.LastCurrentIndexState,
          });
          ShowNotification({
            message: t("undoActionSuccessfull", { heading }),
            severity: "success",
          });
        },
      });
      return oldPlayingList;
    });
  };

  const onDeleteWholeQueue = (key: number) => {
    G.LAST_QUEUE_IIEM = {};
    G.SetPlayingPlaylists?.((prev: any) => {
      const sortedKeys = Object.keys(prev).sort(
        (a, b) => Number(a) - Number(b)
      );
      // Last queue item should not be deleted
      if (sortedKeys.length === 1) {
        ShowNotification({
          message: t("lastQueueItemCannotBeDeleted"),
          severity: "error",
        });
        return prev;
      }
      const deleteIndex = sortedKeys.findIndex(
        (k) => String(k) === String(key)
      );
      if (deleteIndex === -1) {
        return prev;
      }
      const remainingKeys = sortedKeys.filter((_, i) => i !== deleteIndex);
      const oldToNew: Record<string, string> = {};
      remainingKeys.forEach((oldK, i) => {
        oldToNew[oldK] = String(i);
      });
      const newPlayingList: any = {};
      remainingKeys.forEach((oldK, i) => {
        newPlayingList[String(i)] = prev[oldK];
      });
      const curr = G.CurrentIndexItem;
      if (G.LAST_SQ_KEY_USED === key) {
        G.SET_JUST_ADDED_QUEUE?.(false);
      }
      if (curr?.key != null) {
        const currKeyStr = String(curr.key);
        const isDeletingCurrent = curr.key == key || currKeyStr === String(key);
        if (isDeletingCurrent) {
          const nextKeyOld: string =
            sortedKeys[deleteIndex + 1] ?? sortedKeys[deleteIndex - 1]!;
          G.SetCurreIndexDirect({
            key: oldToNew[nextKeyOld],
            index: 0,
            fromButton: curr.fromButton || 1,
            isPreviousQueue: false,
            subIndex: 0,
          });
        } else if (oldToNew[currKeyStr] !== undefined) {
          G.SetCurreIndexDirect({
            ...curr,
            key: oldToNew[currKeyStr],
          });
        }
      }
      return newPlayingList;
    });
  };

  const gotoCreate = (id = "default") => {
    // Get Data of each playlsit queu into sinlge array
    const data = Object.values(G.PlayingPlaylists)
      .map((playlist: any) => playlist.list)
      .flat();
    G[`${id}currentPlaylist`] = data;
    G.SetTab("create");
    G[`${"default"}mode`] = PlaylistModeTypes.playlist;
  };

  const massAdd = (items: any) => {
    G.SetQueue(items);
  };

  const attachLink = (title: string, link: string, linkState: any) => {
    G.SetQueue({
      content: title,
      additionalInfo: {
        link,
        ...linkState,
      },
      type: linkState.type === "text" ? "heading" : "attachment-link",
    });
    openAttachLink.value = false;
  };

  const togglePlaybarInherited = async () => {
    G.IsASwitchBetweenBar = true;
    if (isPlaybarInherited.value) {
      await setupNowBarControlApp({ force: true, parentId: parentIdStr });
    } else if (G.RemoveNowBarApp) {
      G.RemoveNowBarApp("player-playlist-bar");
      os.unregisterApp("playing-playlist-flaot");
    }
    isPlaybarInherited.value = !isPlaybarInherited.value;
  };

  const mount = () => {
    if (mounted) return () => {};
    mounted = true;
    rebuildRefs();
    effect(() => {
      G.SET_SHOW_CHECK && G.SET_SHOW_CHECK(1);
      return () => {
        G.SET_SHOW_CHECK && G.SET_SHOW_CHECK(false);
        G.LAST_QUEUE_IIEM = {};
      };
    });
    effect(() => {
      G.SetActiveDate = (v: any) => {
        activeDate.value = v;
      };
      G.PlaylistPlaytoggleHide = toggleHide;
      G.RenderPlaylist = () => {
        renderTick.value += 1;
      };
      G.RenderPlaylistPlaying = () => {
        renderPlaylistTick.value += 1;
      };
      G.SetItemsPlayer = (v: any) => {
        playerState.value =
          typeof v === "function"
            ? { ...playerState.value, ...v(playerState.value) }
            : { ...playerState.value, ...v };
      };
      G.SetIsPlaybarInherited = setIsPlaybarInherited;
      G.PlaylingItemVisitiedMap = (v: any) => {
        itemVisitedMap.value =
          typeof v === "function" ? v(itemVisitedMap.value) : v;
      };
      G.PlayingPlaylistSetHeading = (v: string) => {
        heading.value = v;
      };
      G.IsPlaybarInherited = isPlaybarInherited.value;
      return () => {
        G.SetActiveDate = null;
        G.PlaylistPlaytoggleHide = null;
        G.RenderPlaylist = null;
        G.SetItemsPlayer = null;
      };
    });
    effect(() => {
      void renderTick.value;
      rebuildRefs();
    });
    return () => {
      mounted = false;
    };
  };

  return {
    parentId: parentIdStr,
    get currentFormat() {
      return currentFormat;
    },
    renderTick,
    renderPlaylistTick,
    isPlaybarInherited,
    showSettingsOptions,
    openAttachLink,
    hide,
    queue,
    itemVisitedMap,
    heading,
    activeDate,
    queueDeleteConfirm,
    playerState,
    showMorePosition,
    refs,
    isMobile,
    mount,
    syncSession,
    toggleHide,
    setShowSettingsOptions,
    setOpenAttachLink,
    setQueueDeleteConfirm,
    setIsPlaybarInherited,
    onClick,
    editDataFromPlaylist,
    onDeleteFromQueue,
    onDeleteWholeQueue,
    gotoCreate,
    attachLink,
    massAdd,
    togglePlaybarInherited,
  };
}
