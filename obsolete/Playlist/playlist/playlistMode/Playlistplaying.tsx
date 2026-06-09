const {
  playingPlaylist,
  skipAll,
  startIndex,
  startSubIndex,
  parentId,
  name: playlistName,
  list = undefined,
} = that.remoteClick ? that.features : that;

const G = globalThis as any;

const AttachLink = await thisBot.AttachLink();

if (skipAll) {
  os.unregisterApp("playing-playlist");
  os.registerApp("playing-playlist", thisBot);
  G.IS_PLAYLIST_ACTIVE = 1;
} else {
  if (!G.IsQueuePresent) {
    os.unregisterApp("playing-playlist");
    os.registerApp("playing-playlist", thisBot);
    G.IS_PLAYLIST_ACTIVE = 1;
    G.PlayingPlaylists = {};
    G.CurrentIndexItem = {};
  } else {
    if (G.READING_PLAN_WORK) return;
    let playlist = G[`${parentId}playlists`].find(
      (ele: any) => ele.id === playingPlaylist
    );
    if (list) {
      playlist = {
        list: list,
        isLayers: false,
        id: G.createUUID(),
        playlistID: playingPlaylist,
        checklistEnabled: false,
        readingPlanEnabled: false,
      };
    }
    G.SetPlayingList((prev: any) => {
      const keys = Object.keys(prev);
      const keyNumber = keys.length;
      return {
        ...prev,
        [keyNumber]: {
          name: playlistName,
          list: playlist.isLayers
            ? thisBot.PlayingLayersConversion(playlist.list)
            : playlist.list,
          id: G.createUUID(),
          playlistID: playlist.id,
          isLayers: playlist.isLayers,
        },
      };
    });
    if (!skipAll) {
      thisBot.CloseSelf();
    }
    return;
  }
}

const { useState, useLayoutEffect, useRef, useMemo, createRef } = os.appHooks;
const { Button, Modal, ButtonsCover } = G.Components;

const PlaylistPlayerControls = await thisBot.PlaylistPlayerControls();

const paraStyle = {
  fontWeight: "400",
  padding: "8px",
  fontSize: "10px",
};

const ButtonStyle = {
  cursor: "pointer",
  border: "1px solid grey",
  borderRadius: "40px",
  padding: "6px",
  fontSize: "14px",
  marginLeft: "4px",
  background: "cadetblue",
};

let subIndex = startSubIndex;

let playlist = that.remoteClick
  ? { ...that.playlist }
  : !playingPlaylist
    ? {}
    : G[`${parentId}playlists`].find((ele: any) => ele.id === playingPlaylist);

if (!skipAll) {
  EmitData("playlistPlayed", { features: that, playlist });
}

if (list) {
  playlist = {
    list: list,
    isLayers: false,
    id: G.createUUID(),
    playlistID: playingPlaylist,
    checklistEnabled: false,
    readingPlanEnabled: false,
  };
}

const thh = playlist.list;

const checklistEnabled = playlist.checklistEnabled;

const readingPlanEnabled = playlist.readingPlanEnabled;

const currentFormat = playlist.dateFormat;

const videoTypes = {
  "video-recording": true,
  "screen-recording": true,
  youtube: true,
};

const getCurrentItem = (
  key: any,
  index: any,
  playlists: any,
  subIndex: any,
  isHint = false
) => {
  const list = playlists[key]?.list;

  let targetItem = null;
  let nextTargetItem = null;
  let nextTargetItemVideo = false;
  let isNested = false;

  // if (queue?.length) {
  //     targetItem = queue[0]
  // } else {
  // }

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
  // let targetItem = null;
  // if (subIndex > -1) {
  //     const th = thisBot.groupVerse(list[index].list);
  //     targetItem = th[subIndex];
  // } else {
  //     targetItem = list[index];
  // }
  // return targetItem;
};

const isfirstItemPlaylist = !!thh?.[0].list;

if (startIndex === 0 && isfirstItemPlaylist) {
  subIndex = 0;
}

let firstIndex = 0;

const pastDateEvents: Record<string, boolean> = {};
const closestNearDateEvent: Record<string, boolean> = {};
const currentDate = new Date(
  `${G.FORMAT_YYYY_MM_DD(new Date())}T00:00:00.000Z`
).getTime();
let lastActiveDate = new Date("01-01-1900").getTime();
let closestDateFound = false;
let futureDateBreak = false;
let findLastActiveIndex = -1;
let firstActiveIndex = -1;
let firstActiveItem: any = null;

function getUtcTimestamp(dateString: string) {
  const [year, month, day]: any = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getTime();
}

if (!skipAll) {
  for (let i = 0; i < thh.length; i++) {
    const ele = thh[i];
    if (ele.type !== "heading") {
      firstIndex = i;
      const firstInnerItem = ele?.additionalInfo?.layers?.[0];
      if (G.IsVideoAttachment(firstInnerItem) && firstInnerItem.autoPlay) {
        setTimeout(() => {
          G[`${ele.id}OpenToggle`] && G[`${ele.id}OpenToggle`](true);
        }, 200);
        subIndex = 1;
      } else {
        subIndex = 0;
      }
      break;
    }
  }

  if (readingPlanEnabled) {
    playlist.list.forEach((ele: any, index: any) => {
      if (ele.type === "date") {
        lastActiveDate = getUtcTimestamp(ele.additionalInfo.date);
        if (lastActiveDate >= currentDate) {
          if (closestDateFound) {
            futureDateBreak = true;
          }
          closestDateFound = true;
        }
        if (!futureDateBreak && !closestDateFound) {
          pastDateEvents[ele.id] = true;
          pastDateEvents[`${G.pseudoIndentifier}${ele.id}`] = true;
        }
      } else {
        if (lastActiveDate < currentDate) {
          pastDateEvents[ele.id] = true;
          pastDateEvents[`${G.pseudoIndentifier}${ele.id}`] = true;
        } else {
          if (!futureDateBreak) {
            closestNearDateEvent[ele.id] = true;
            findLastActiveIndex = index;
          }
          if (firstActiveIndex === -1 && ele.type !== "heading") {
            firstActiveIndex = index;
            firstActiveItem = ele;
          }
        }
      }
    });

    if (firstActiveIndex > -1) {
      firstActiveIndex = -1;

      thh.forEach((ele: any, i: any) => {
        if (ele.id === firstActiveItem.id) {
          firstActiveIndex = i;
        }
        if (firstActiveIndex === -1 && Array.isArray(ele.additionalInfo)) {
          ele.additionalInfo.forEach((item: any) => {
            if (item.id === firstActiveItem.id) {
              firstActiveIndex = i;
            }
          });
        }
      });
    }
  }

  if (!checklistEnabled) {
    const findIndex = readingPlanEnabled ? firstActiveIndex : firstIndex;
    const tgITM = getCurrentItem(
      0,
      findIndex,
      { 0: { list: thisBot.PlayingLayersConversion(playlist.list) } },
      0
    );

    if (tgITM.type === "attachment-link") {
      thisBot.RenderLinkContent({
        ...tgITM,
        isLastItem:
          thh.length === 1 &&
          (!isfirstItemPlaylist || thh[0].list.length === 1),
        isFirstItem: startIndex === 0 && subIndex < 1,
      });
    } else if (tgITM) {
      const isBulk = Array.isArray(tgITM.additionalInfo);
      const skip = await thisBot.checkIfNeedToSkip({ dataItem: tgITM });
      if (!skip) {
        thisBot.navigationWithDataItem({
          dataItem: isBulk ? tgITM.additionalInfo : tgITM,
        });
        // if (tgITM?.nextTargetItem) {
        //     if (tgITM.nextTargetItem.additionalInfo.type === "attachment-link") {
        //         thisBot.RenderLinkContent({ ...tgITM.nextTargetItem });
        //     } else {
        //         thisBot.navigationWithDataItem({ dataItem: tgITM.nextTargetItem, });

        //     }
        // }
      }
    }
    G[`${parentId}ToggleGreyCheckPLayingPlaylist`] &&
      G[`${parentId}ToggleGreyCheckPLayingPlaylist`](tgITM.id);
  }
  G.PPthh = thh;
  G.PPpastDateEvents = pastDateEvents;
  G.PPchecklistEnabled = checklistEnabled;
  G.PPreadingPlanEnabled = readingPlanEnabled;
  G.PlayingPlaylistID = playlist.id;
  G.PPfirstActiveIndex = firstActiveIndex;
  G.PPfirstIndex = firstIndex;
  G.PPplaylist = playlist;
  G.PPsubIndex = subIndex;
  G.PPplaylistName = playlistName;
  G.PPclosestNearDateEvent = closestNearDateEvent;
}

await thisBot.setupNowBarControlApp({ parentId: parentId });

G.SetDontShowMobileBottomNavbar(true);

const PlayingPlaylist = () => {
  const [render, setRender] = useState(0);
  const [renderPlaylist, setRenderPlaylist] = useState(0);

  const [isPlaybarInherited, setIsPlaybarInherited] = useState(false);
  const [showSettingsOptions, setShowSettingsOptions] = useState(false);
  const showMorePosition = useRef(getPosition());

  const [openAttachLink, setOpenAttachLink] = useState(false);

  const DragDropT = useMemo(() => {
    return G.DragDrop;
  }, []);

  const [{ currentPlaylistName, currentItemID }, setItemsPlayer] = useState({
    currentPlaylistName: G.PPcurrentPlaylistName,
    currentItemID: G.PPcurrentItemID,
    typeContent: G.PPtypeContent,
    nextItemName: G.PPnextItemName,
    prevItemName: G.PPprevItemName,
    currentItemName: G.PPcurrentItemName,
  });

  const [hide, setHide] = useState(false);

  const toggleHide = () => setHide((p) => !p);

  const [queue, setQueue] = useState([]);

  const [itemVisitedMap, setItemVisitedMap] = useState({
    ...G.PPpastDateEvents,
  });
  const [heading, setHeading] = useState("");

  G.PlaylingItemVisitiedMap = setItemVisitedMap;
  G.PlayingPlaylistSetHeading = setHeading;

  const refs = useMemo(() => {
    const refs: Record<string, any> = {};

    const playlistsProgress = G[`${parentId}playlistProgress`] || {};
    const playlistsChecked = G[`${parentId}playlistChecked`] || {};

    let progressItemsTemp = {};
    let checkedItemsTemp = {};

    Object.keys(G.PlayingPlaylists).forEach((key) => {
      const { list, playlistID } = G.PlayingPlaylists[key];
      list.forEach((ele: any) => {
        refs[ele.id] = createRef();
      });

      if (playlistID) {
        const itemsProg = { ...(playlistsProgress[playlistID] || {}) };
        const itemsCheck = { ...(playlistsChecked[playlistID] || {}) };
        progressItemsTemp = { ...progressItemsTemp, ...itemsProg };
        checkedItemsTemp = { ...checkedItemsTemp, ...itemsCheck };
      }
    });

    // G.SetCheckedItemsPlayingPlaylist?.(checkedItemsTemp);

    G.PlaylingItemVisitiedMap?.({
      ...G.PPpastDateEvents,
      ...progressItemsTemp,
    });

    return refs;
  }, [render]);

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

  useLayoutEffect(() => {
    G.SET_SHOW_CHECK && G.SET_SHOW_CHECK(1);
    return () => {
      G.SET_SHOW_CHECK && G.SET_SHOW_CHECK(false);
      G.LAST_QUEUE_IIEM = {};
    };
  }, []);

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
        thisBot.RenderLinkContent({
          ...targetItem,
          isLastItem: false,
          isFirstItem: false,
        });
      } else {
        const isBulk = Array.isArray(targetItem.additionalInfo);
        thisBot.navigationWithDataItem({
          dataItem: isBulk ? targetItem.additionalInfo : targetItem,
          bulkAdd: isBulk,
        });
      }
    }
    G.SetCheckedItemsPlayingPlaylist(prevIds);
  };

  const [activeDate, setActiveDate] = useState(null);

  useLayoutEffect(() => {
    G.SetActiveDate = setActiveDate;
    G.PlaylistPlaytoggleHide = toggleHide;
    G.RenderPlaylist = () => setRender((p) => p + 1);
    G.RenderPlaylistPlaying = () => setRenderPlaylist((p) => p + 1);
    G.SetItemsPlayer = setItemsPlayer;
    G.SetIsPlaybarInherited = setIsPlaybarInherited;
    return () => {
      G.SetActiveDate = null;
      G.PlaylistPlaytoggleHide = null;
      G.RenderPlaylist = null;
      G.SetItemsPlayer = null;
    };
  }, []);

  G.IsPlaybarInherited = isPlaybarInherited;

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
            if (idOfItem === currentItemID && !isDeletingCurrentPlayingItem) {
              isDeletingCurrentPlayingItem = true;
            }
          } else {
            const index = list.findIndex((e: any) => e.id === ele);
            if (index > -1) {
              indexesToBeRemoved[index] = true;
              if (currentItemID === ele && !isDeletingCurrentPlayingItem) {
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
            (ele: any) => ele.id === currentItemID
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

  const [queueDeleteConfirm, setQueueDeleteConfirm] = useState(-1);

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

  const isMobile =
    (window?.innerWidth || gridPortalBot.tags.pixelWidth) <
    G.MOBILE_VIEWPORT_THRESHOLD;

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
    setOpenAttachLink(false);
  };

  return (
    <>
      <style>{thisBot.tags["RecordingVoiceUI.css"]}</style>
      <style>{thisBot.tags["PlaylistContainer.css"]}</style>
      {queueDeleteConfirm > -1 && (
        <Modal
          title={t("deleteQueue")}
          showIcon={false}
          onClose={() => setQueueDeleteConfirm(-1)}
          onConfirm={() => onDeleteWholeQueue(queueDeleteConfirm)}
        >
          <p>{t("deleteQueueConfirmation")}</p>
          <ButtonsCover>
            <Button secondary onClick={() => setQueueDeleteConfirm(-1)}>
              {t("cancel")}
            </Button>
            <Button
              secondaryAlt
              onClick={() => {
                onDeleteWholeQueue(queueDeleteConfirm);
                setQueueDeleteConfirm(-1);
              }}
            >
              {t("delete")}
            </Button>
          </ButtonsCover>
        </Modal>
      )}

      {showSettingsOptions && (
        <>
          <div
            className="backdrop"
            style={{ zIndex: 10001 }}
            onClick={() => setShowSettingsOptions(false)}
          />
          <div
            style={{
              ...showMorePosition.current,
              left: "none",
              right: "4rem",
              width: "236px",
              padding: "1rem",
              top: "3rem",
            }}
            className="overlay linked-item-custom"
          >
            <p style={{ marginBottom: "0" }}>
              <b>{t("playlistActions")}</b>
            </p>
            <span style={{ fontSize: "12px", marginBottom: "6px" }}>
              {t("playlistActionsDesc")}
            </span>
            {isMobile ? null : (
              <div
                className="align-center"
                style={{
                  cursor: "pointer",
                }}
                onClick={async () => {
                  G.IsASwitchBetweenBar = true;
                  if (isPlaybarInherited) {
                    await thisBot.setupNowBarControlApp({
                      force: true,
                      parentId: parentId,
                    });
                  } else {
                    if (G.RemoveNowBarApp) {
                      G.RemoveNowBarApp("player-playlist-bar");
                    }
                    os.unregisterApp("playing-playlist-flaot");
                  }
                  setIsPlaybarInherited((p: boolean) => !p);
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <div
                    className={`settings-toggle ${isPlaybarInherited ? "active" : ""}`}
                  >
                    <div className="settings-toggle-knob" />
                  </div>
                  <div className="item-text"> {t("movePlaybarInside")}</div>
                </div>
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "0.5rem",
                paddingTop: "0.5rem",
                borderTop: isMobile ? "none" : "1px solid var(--gray2-color)",
              }}
            >
              <Button
                secondary
                onClick={() => {
                  G.StopPlayingPlaylistModal(true);
                  G.PendingAction = gotoCreate;
                }}
              >
                {t("convertThisToPlaylist")}
              </Button>
            </div>
            <p className="info-type">{t("infoTextToConvertPLaylist")}</p>
          </div>
        </>
      )}

      <div
        className={`playing-queue-container${
          hide ? " playing-queue-container--minimized" : ""
        }`}
        style={{
          height: "100%",
          backgroundColor: !hide ? "var(--panelBackground)" : "transparent",
        }}
      >
        <div
          className={`playing-queue reset-css ${
            G.PPchecklistEnabled && "checklistEnabled"
          }${hide ? " playing-queue--minimized" : ""}`}
          style={{ height: hide ? "56px" : "100%" }}
        >
          {hide && <p className="current-playing-title">Current Playing:</p>}
          <div
            className="header"
            style={{ paddingTop: hide ? "0" : "10px" }}
            role={hide ? "button" : undefined}
            tabIndex={hide ? 0 : undefined}
            onClick={hide ? () => toggleHide() : undefined}
            onKeyDown={
              hide
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleHide();
                    }
                  }
                : undefined
            }
          >
            <h3
              title={currentPlaylistName}
              className="align-center"
              style={{ gap: "0.5rem" }}
            >
              {hide
                ? currentPlaylistName.substring(0, 10)
                : currentPlaylistName}
              {hide ? (currentPlaylistName.length > 10 ? "..." : "") : ""}
            </h3>
            <div className="align-center" style={{ gap: "0.5rem" }}>
              {!hide && (
                <div
                  className="publish-setting"
                  style={{
                    height: "22px",
                    minWidth: "22px",
                    padding: "0",
                    display: "grid",
                    placeItems: "center",
                  }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();

                    const x = rect.left; // X position where the element starts (from left of screen)
                    const y = rect.bottom; // Y position where the element ends (bottom of element from top of screen)

                    G.LastClickX = x;
                    G.LastClickY = y;
                    showMorePosition.current = { ...getPosition() };
                    setShowSettingsOptions(true);
                  }}
                >
                  <img
                    style={{ height: "18px", width: "18px" }}
                    className="img-icon"
                    src={G.Settings_Icon}
                    alt="Settings_Icon"
                  />
                </div>
              )}
              <span
                style={{
                  cursor: "pointer",
                  border: "1px solid var(--secondaryColor)",
                  borderRadius: "3px",
                  color: "var(--secondaryColor)",
                  fontSize: "14px",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleHide();
                }}
                className="material-symbols-outlined unfollow"
              >
                {hide ? "pip_exit" : "check_indeterminate_small"}
              </span>
              {isMobile ? (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    G.StopPlayingPlaylistModal(true);
                  }}
                  style={{
                    margin: "0",
                    width: "20px",
                    height: "20px",
                    borderRadius: "6px",
                    border: "none",
                  }}
                  className="playlist-action small"
                >
                  <span
                    style={{
                      margin: "0",
                      fontSize: "15px",
                    }}
                    class="material-symbols-outlined unfollow"
                  >
                    close
                  </span>
                </span>
              ) : null}
            </div>
          </div>
          <div
            className="playing-queue-content"
            style={{ paddingBottom: isPlaybarInherited ? "8rem" : "14px" }}
          >
            {queue.length ? (
              <>
                <h4>Next in Queue</h4>
                <DragDropT
                  checkListData={
                    G.PlayingPlaylistCheckedItems?.[G.PlayingPlaylistID] || {}
                  }
                  editDataFromPlaylist={editDataFromPlaylist}
                  isPlayer={G.PPchecklistEnabled}
                  list={queue}
                  setList={setQueue}
                  embedding={null}
                  PlayingPlaylist={true}
                  currentDateActive={activeDate}
                  deleteFromList={(key: any, index: any) => {
                    // onDeleteFromQueue(key, index);
                  }}
                  creatingPlaylist={false}
                  onClick={() => {}}
                  currentFormat={currentFormat}
                  activeItemID={currentItemID}
                  // oldItemsMap={itemVisitedMap}
                  onClickItem={() => {}}
                />
              </>
            ) : null}
            {Object.keys(G.PlayingPlaylists).map((key, index) => {
              const { name, list, broken, playlistID, id, isLayers } =
                G.PlayingPlaylists[key];
              return (
                <>
                  <PlaylistQueueContainer
                    name={name}
                    list={list}
                    broken={broken}
                    playlistID={playlistID}
                    id={id}
                    isLayers={isLayers}
                    itemVisitedMap={itemVisitedMap}
                    refs={refs}
                    activeDate={activeDate}
                    editDataFromPlaylist={editDataFromPlaylist}
                    currentItemID={currentItemID}
                    onDeleteFromQueue={onDeleteFromQueue}
                    onClick={onClick}
                    setQueueDeleteConfirm={setQueueDeleteConfirm}
                    queueKeyName={key}
                    index={index}
                  />
                </>
              );
            })}
            {isMobile ? (
              openAttachLink ? (
                <AttachLink
                  canClose
                  canRecord={false}
                  massAdd={massAdd}
                  sSelectedType="SCRIPTURE"
                  attachLink={attachLink}
                  onClose={() => setOpenAttachLink(false)}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0 0.5rem",
                    marginTop: "0.5rem",
                  }}
                  onClick={() => {
                    if (G.RemotePlaylistPlayed) {
                      return ShowNotification({
                        message: t("onlyHostCanAddItemsToQueue"),
                        severity: "error",
                      });
                    }
                    setOpenAttachLink(true);
                  }}
                >
                  <p
                    style={{
                      margin: "0",
                      width: "26px",
                      height: "26px",
                      padding: "0",
                      borderRadius: "6px",
                      border: "0px solid var(--secondaryColor)",
                      backgroundColor: "var(--sidebarShadow)",
                    }}
                    className="playlist-action small"
                  >
                    <span
                      style={{ margin: "0", fontSize: "20px" }}
                      class="material-symbols-outlined unfollow"
                    >
                      add
                    </span>
                  </p>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      fontFamily: "DM Sans",
                      color: "var(--secondaryColor)",
                    }}
                  >
                    {t("addToTheCurrentQueue")}
                  </p>
                </div>
              )
            ) : null}
            <div className="mobile-pseudogap-element playing-playlist" />
          </div>
        </div>
        {isPlaybarInherited && (
          <div
            style={{
              display: hide ? "none" : "block",
              opacity: hide ? 0 : 1,
              transition: "opacity 0.3s ease-in-out",
              zIndex: "1001",
              textTransform: " capitalize",
              padding: "12px",
              backgroundColor: "transparent",
              borderRadius: "4px",
              position: "absolute",
              bottom: "0",
              right: "0",
              fontWeight: "600",
              width: "calc(100%)",
              // borderTop: "1px solid #DADADA",
            }}
            className="reset-css"
          >
            <PlaylistPlayerControls parentId={parentId} inheritedBar={true} />
          </div>
        )}
      </div>
    </>
  );
};

const PlaylistQueueContainer = (props: any) => {
  const {
    name,
    list,
    broken,
    playlistID,
    id,
    isLayers,
    itemVisitedMap,
    refs,
    activeDate,
    editDataFromPlaylist,
    currentItemID,
    onDeleteFromQueue,
    onClick,
    setQueueDeleteConfirm,
    queueKeyName,
    index,
  } = props;

  const playlistListUiRef = useRef<HTMLDivElement | null>(null);

  const runBlinkLastPlaylistItem = () => {
    const root = playlistListUiRef.current;
    if (!root) return;
    const nodes = root.querySelectorAll(".playlist-item-type");
    const last = nodes[nodes.length - 1] as HTMLElement | undefined;
    if (!last) return;
    last.classList.remove("playlist-item-blink");
    void last.offsetWidth;
    const done = () => {
      last.classList.remove("playlist-item-blink");
    };
    const safety = window.setTimeout(done, 1800);
    last.addEventListener(
      "animationend",
      () => {
        window.clearTimeout(safety);
        done();
      },
      { once: true }
    );
    last.classList.add("playlist-item-blink");
    last.scrollIntoView({ behavior: "smooth" });
  };

  if (playlistID) {
    if (!G["defaultplaylistProgress"]) G["defaultplaylistProgress"] = {};
    if (!G["defaultplaylistChecked"]) G["defaultplaylistChecked"] = {};
    G["defaultplaylistProgress"][playlistID] = {
      ...itemVisitedMap,
    };
    G["defaultplaylistChecked"][playlistID] = {
      ...(G.PlayingPlaylistCheckedItems?.[G.PlayingPlaylistID] || {}),
    };
    G?.savePlaylistProgress && G.savePlaylistProgress(playlistID);
  }

  const DragDropT = useMemo(() => {
    return G.DragDrop;
  }, []);

  useLayoutEffect(() => {
    if (G.BlinkAfterPlaylistAddRef != queueKeyName) return;
    if (G.BlinkAfterPlaylistAddRef == queueKeyName) {
      G.BlinkAfterPlaylistAddRef = false;
    }
    runBlinkLastPlaylistItem();
  }, [list]);

  useLayoutEffect(() => {
    return () => {
      if (G.BlinkAfterPlaylistAddRef == queueKeyName) {
        G.BlinkAfterPlaylistAddRef = false;
      }
    };
  }, []);

  return (
    <div
      ref={playlistListUiRef}
      className={`link-playlist`}
      style={{ width: "100%" }}
    >
      {index !== 0 && (
        <div className="align-center justify-between heading-queue">
          <h4 key={`heading${id}`} style={{ margin: "0" }}>
            {broken ? "" : "Next in "}
            {name}
          </h4>
          <span
            onClick={() => {
              setQueueDeleteConfirm(parseInt(queueKeyName));
            }}
            style={{ cursor: "pointer" }}
            className="material-symbols-outlined unfollow"
          >
            delete
          </span>
        </div>
      )}
      <DragDropT
        key={id}
        setRef={refs}
        isPlayer={G.PPchecklistEnabled}
        currentFormat={currentFormat}
        list={list}
        playingPlaylist={true}
        layers={true}
        currentDateActive={activeDate}
        editDataFromPlaylist={(data: any, play = true) =>
          editDataFromPlaylist(data, queueKeyName, play)
        }
        // oldItemsMap={{ ...itemVisitedMap, ...checkedItems }}
        checkListData={
          G.PlayingPlaylistCheckedItems?.[G.PlayingPlaylistID] || {}
        }
        setList={(newList: any) => {
          let listLatest = [...newList];
          if (typeof newList === "function") {
            listLatest = newList(list);
          }
          G.SetPlayingPlaylists?.((prev: any) => ({
            ...prev,
            [queueKeyName]: { name, list: listLatest },
          }));
          // setList((prev) => {
          //     const item = prev[currIndex.index];
          //     return [...oldList, item, ...listLatest]
          // });
        }}
        activeItemID={
          queueKeyName == G.CurrentIndexItem.key ? currentItemID : 0
        }
        // activeItemList={false ? activeIndexs : {}}
        deleteFromList={(index: any, pId: any, id: any) => {
          onDeleteFromQueue(queueKeyName, index, pId, id);
        }}
        isDeleteShow
        creatingPlaylist={false}
        onClick={(params: any) => {
          const { dataItem, bulkAdd, justPlay } = params;
          DataManager.cancelCurrentPlayingSound();
          if (justPlay) {
            thisBot.navigationWithDataItem({ dataItem });
            return;
          }
          onClick({
            dataItem,
            bulkAdd,
            key: queueKeyName,
          });
        }}
        onClickItem={() => {}}
      />
    </div>
  );
};

if ((playlist && !G.IsQueuePresent) || skipAll) {
  G.IsQueuePresent = true;
  G.SetSplitAppPanel2 && G.SetSplitAppPanel2(<PlayingPlaylist />);
  if (!skipAll) {
    thisBot.CloseSelf();
  }
}
