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
const { Button } = G.Components;

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

if (G.AddNowBarApp && !G.IsQueuePresent) {
  const id = "player-playlist-bar";
  G.AddNowBarApp(<PlaylistPlayerControls parentId={parentId} />, id);
} else if (!G.IsQueuePresent) {
  os.unregisterApp("playing-playlist-flaot");
  os.registerApp("playing-playlist-flaot", thisBot);
  const FloatApp = () => {
    return (
      <div
        style={{
          top: "1rem",
          left: "1rem",
          zIndex: "10000",
          position: "fixed",
        }}
      >
        <PlaylistPlayerControls parentId={parentId} />
      </div>
    );
  };
  os.compileApp("playing-playlist-flaot", <FloatApp />);
}

const PlayingPlaylist = () => {
  const [render, setRender] = useState(0);
  const [renderPlaylist, setRenderPlaylist] = useState(0);

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

    if (bulkAdd || index === -1) {
      th.findIndex((item: any, i: any) => {
        const toBeMapped = item.additionalInfo.layers || [];
        if (Array.isArray(toBeMapped)) {
          const idMap: Record<string, boolean> = {};
          toBeMapped.forEach(({ id }) => {
            idMap[id] = true;
          });
          if (idMap[data.id]) {
            index = i;
          }
        }
      });
    }
    if (index > -1) {
      G.UpdateJustAddedToQueue(false);
      G.SetCurreIndexDirect({
        key: key,
        index: index,
        fromButton: G.CurrentIndexItem.fromButton || 1,
        isPreviousQueue: false,
        subIndex: 0,
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
    return () => {
      G.SetActiveDate = null;
      G.PlaylistPlaytoggleHide = null;
      G.RenderPlaylist = null;
      G.SetItemsPlayer = null;
    };
  }, []);

  // const tranformedList = globalThis.PlayingPlaylists?.[globalThis.CurrentIndexItem?.key]?.list;
  // const currentItem = tranformedList?.[globalThis.CurrentIndexItem?.index];

  return (
    <>
      <style>{thisBot.tags["RecordingVoiceUI.css"]}</style>

      <div
        className="playing-queue-container"
        style={{ height: hide ? "" : "100%" }}
      >
        <div
          className={`playing-queue reset-css ${
            G.PPchecklistEnabled && "checklistEnabled"
          } ${hide && "hide"}`}
        >
          <div className="header">
            <h3>{currentPlaylistName}</h3>
            <span
              style={{ cursor: "pointer" }}
              onClick={toggleHide}
              class="material-symbols-outlined unfollow"
            >
              close
            </span>
          </div>
          <div className="playing-queue-content">
            {false && G.PPchecklistEnabled && (
              <p className="align-center" style={{ justifyContent: "center" }}>
                <span
                  class="material-symbols-outlined unfollow"
                  style={{ color: "lightgreen", marginRight: "8px" }}
                >
                  check_circle
                </span>
                <span>Mark as Visited</span>
              </p>
            )}

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
                  deleteFromList={() => {}}
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
              if (playlistID) {
                if (!G["defaultplaylistProgress"])
                  G["defaultplaylistProgress"] = {};
                if (!G["defaultplaylistChecked"])
                  G["defaultplaylistChecked"] = {};
                G["defaultplaylistProgress"][playlistID] = {
                  ...itemVisitedMap,
                };
                G["defaultplaylistChecked"][playlistID] = {
                  ...(G.PlayingPlaylistCheckedItems?.[G.PlayingPlaylistID] ||
                    {}),
                };
                G?.savePlaylistProgress && G.savePlaylistProgress(playlistID);
              }
              return (
                <>
                  {index !== 0 && (
                    <h4 key={`heading${id}`}>
                      {broken ? "" : "Next in "}
                      {name}
                    </h4>
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
                      editDataFromPlaylist(data, key, play)
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
                        [key]: { name, list: listLatest },
                      }));
                      // setList((prev) => {
                      //     const item = prev[currIndex.index];
                      //     return [...oldList, item, ...listLatest]
                      // });
                    }}
                    activeItemID={
                      key == G.CurrentIndexItem.key ? currentItemID : 0
                    }
                    // activeItemList={false ? activeIndexs : {}}
                    deleteFromList={() => {}}
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
                        key,
                      });
                    }}
                    onClickItem={() => {}}
                  />
                </>
              );
            })}
            <div className="mobile-pseudogap-element playing-playlist" />
          </div>
        </div>

        {!G.PPchecklistEnabled && (
          <div
            style={{
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
            {false && (
              <span className="item-ribbon">
                <span>
                  {"playlistName"} {!!heading && ` - ${heading}`}
                </span>
              </span>
            )}
            {false && (
              <div className="stop-buttom-playing-list">
                <Button
                  style={{
                    fontSize: "12px",
                    margin: "0",
                    minWidth: "auto",
                    padding: "0",
                    border: "none",
                  }}
                  onClick={() => {
                    // globalThis.SetPlayingPlaylist && globalThis.SetPlayingPlaylist(false);
                    G[`${parentId}ToggleGreyCheckPLayingPlaylist`] &&
                      G[`${parentId}ToggleGreyCheckPLayingPlaylist`](null);
                    G.IsQueuePresent = false;
                    // os.unregisterApp("playing-playlist");
                    thisBot.CloseFloatingApp();
                    G.IS_PLAYLIST_ACTIVE = false;
                    G.SetSplitAppPanel2 && G.SetSplitAppPanel2(null);
                    // thisBot.showInfo(`History Mode`);
                  }}
                >
                  <span
                    class="material-symbols-outlined unfollow"
                    style={ButtonStyle}
                  >
                    stop
                  </span>
                </Button>
              </div>
            )}
            {false && (
              <div
                style={{
                  background: "white",
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  boxShadow: "0px 0px 9px 0px #00000026",
                  padding: "10px",
                  borderRadius: "8px",
                }}
              >
                <PlaylistPlayerControls />
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

if ((playlist && !G.IsQueuePresent) || skipAll) {
  G.IsQueuePresent = true;
  G.SetSplitAppPanel2 && G.SetSplitAppPanel2(<PlayingPlaylist />);
  if (!skipAll) {
    thisBot.CloseSelf();
  }
  // os.compileApp("playing-playlist", <PlayingPlaylist />)
}

//  <h4>Now Playing</h4>
//                 <div
//                     className={`history-item current-playing-item`}
//                 >
//                     <p
//                         className={`playlist-item-type playlist-item-book`}
//                     >
//                         {name}
//                     </p>
//                 </div>

// <h4>More in {playlistName}</h4>
// <DragDrop
//     list={oldList}
//     setList={(newList) => {
//         const listLatest = [...newList];
//         if (typeof newList === 'function') {
//             listLatest = newList(oldList);
//         }
//         setOldList(listLatest);
//         setList((prev) => {
//             const item = prev[currIndex.index];
//             return [...listLatest, item, ...dragList]
//         });
//     }}
//     deleteFromList={() => { }}
//     creatingPlaylist={false}
//     onClick={onClick}
//     onClickItem={() => { }}
// />

//  <p style={{
//             margin: "12px 0",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "space-between",
//         }}>
//             Current Item:
//             <span
//                 style={{
//                     fontWeight: "400",
//                     padding: "8px",
//                     position: "relative"
//                 }}
//                 className={typeContent} >
//                 {name}
//             </span>
//         </p>
//         <div style={{[0]
//             display: "flex",
//             alignItems: "center",
//             fontSize: "12px",
//             justifyContent: "space-between",
//             margin: "12px 0",
//             gap: "8px"
//         }} >

//             {prevItemName ?
//                 <p style={{ fontSize: "10px" }} className="prev-tag-item" >
//                     Previous Item:
//                     <span
//                         style={paraStyle}
//                         className={prevItemType} >{prevItemName}</span>
//                 </p>
//                 : <p />}

//             {nextItemName ?
//                 <p style={{ fontSize: "10px" }} className="next-tag-item">
//                     Next Item:
//                     <span
//                         style={paraStyle}
//                         className={nextItemType}
//                     >
//                         {nextItemName}
//                     </span>
//                 </p>
//                 : <p
//                     style={paraStyle}
//                 > <i>The end</i>  </p>}
//         </div>
