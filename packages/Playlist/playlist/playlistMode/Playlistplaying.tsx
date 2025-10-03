const { playingPlaylist, skipAll, startIndex, startSubIndex, parentId, name: playlistName, list = undefined } = that;
if (skipAll) {
    os.unregisterApp("playing-playlist");
    os.registerApp("playing-playlist");
    globalThis.IS_PLAYLIST_ACTIVE = 1;
} else {
    if (!globalThis.IsQueuePresent) {
        os.unregisterApp("playing-playlist");
        os.registerApp("playing-playlist");
        globalThis.IS_PLAYLIST_ACTIVE = 1;
        globalThis.PlayingPlaylists = {};
        globalThis.PlayingPlaylistCheckedItems = {};
        globalThis.CurrentIndexItem = {};
    } else {
        if (globalThis.READING_PLAN_WORK) return;
        let playlist = globalThis[`${parentId}playlists`].find(ele => ele.id === playingPlaylist);
        if (list) {
            playlist = {
                list: list,
                isLayers: false,
                id: createUUID(),
                playlistID: playingPlaylist,
                checklistEnabled: false,
                readingPlanEnabled: false
            }
        }
        globalThis.SetPlayingList(prev => {
            const keys = Object.keys(prev);
            const keyNumber = keys.length;
            return {
                ...prev,
                [keyNumber]: {
                    name: playlistName,
                    list: playlist.isLayers ? thisBot.PlayingLayersConversion(playlist.list) : playlist.list,
                    id: createUUID(),
                    playlistID: playlist.id,
                    isLayers: playlist.isLayers
                }
            }
        });
        if (!skipAll) {
            thisBot.CloseSelf();
        }
        return;
    }
}

const { useState, useLayoutEffect, useRef, useMemo, createRef } = os.appHooks;
const { Input, Modal, Button, ButtonsCover } = Components;

const AttachLink = await thisBot.AttachLink();
const PlaylistPlayerControls = await thisBot.PlaylistPlayerControls();

const paraStyle = {
    fontWeight: "400",
    padding: "8px",
    fontSize: "10px"
}

const ButtonStyle = {
    cursor: "pointer",
    border: "1px solid grey",
    borderRadius: "40px",
    padding: "6px",
    fontSize: "14px",
    marginLeft: "4px",
    background: "cadetblue",
}

let subIndex = startSubIndex;


let playlist = !playingPlaylist ? {} : globalThis[`${parentId}playlists`].find(ele => ele.id === playingPlaylist);

if (list) {
    playlist = {
        list: list,
        isLayers: false,
        id: createUUID(),
        playlistID: playingPlaylist,
        checklistEnabled: false,
        readingPlanEnabled: false
    }
}

const thh = playlist.list;

const checklistEnabled = playlist.checklistEnabled;

const readingPlanEnabled = playlist.readingPlanEnabled;

const currentFormat = playlist.dateFormat;

const videoTypes = {
    "video-recording": true,
    "screen-recording": true,
    "youtube": true,
}

const getCurrentItem = (key, index, playlists, subIndex, isHint = false) => {

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

    const isCurrentItemTargetItem = targetItem?.type === "chapter-range" || (!!targetItem?.additionalInfo?.layers?.length);

    if (isCurrentItemTargetItem) {
        if (subIndex === 0) {
            nextTargetItem = targetItem.additionalInfo.layers[subIndex + 1] || null;
            if (nextTargetItem && !isHint) {
                nextTargetItemVideo = globalThis.IsVideoAttachment(nextTargetItem);
                if (!nextTargetItemVideo || !nextTargetItem.autoPlay) {
                    nextTargetItem = null;
                }
            }
        }
        targetItem = targetItem.additionalInfo.layers[subIndex];
        isNested = true;
    }

    let prefix = '';

    if (targetItem?.type === "heading") prefix = " - 'Heading'"

    return { ...targetItem, prefix, isNested, nextTargetItem };
    // let targetItem = null;
    // if (subIndex > -1) {
    //     const th = thisBot.groupVerse(list[index].list);
    //     targetItem = th[subIndex];
    // } else {
    //     targetItem = list[index];
    // }
    // return targetItem;
}

const isfirstItemPlaylist = !!thh?.[0].list;

if (startIndex === 0 && isfirstItemPlaylist) {
    subIndex = 0;
}

let firstIndex = 0;

const pastDateEvents = {};
const closestNearDateEvent = {};
const currentDate = new Date(`${FORMAT_YYYY_MM_DD(new Date())}T00:00:00.000Z`).getTime();
let lastActiveDate = new Date('01-01-1900').getTime();
let closestDateFound = false;
let futureDateBreak = false;
let findLastActiveIndex = -1;
let firstActiveIndex = -1;
let firstActiveItem = null;

function getUtcTimestamp(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day)).getTime();
}



if (!skipAll) {

    for (let i = 0; i < thh.length; i++) {
        const ele = thh[i];
        if (ele.type !== 'heading') {
            firstIndex = i;
            const firstInnerItem = ele?.additionalInfo?.layers?.[0];
            if (globalThis.IsVideoAttachment(firstInnerItem) && firstInnerItem.autoPlay) {
                setTimeout(() => {
                    globalThis[`${ele.id}OpenToggle`] && globalThis[`${ele.id}OpenToggle`](true);
                }, 200);
                subIndex = 1;
            }
            break;
        }

    }

    if (readingPlanEnabled) {
        playlist.list.forEach((ele, index) => {
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
                    pastDateEvents[`${pseudoIndentifier}${ele.id}`] = true;
                }
            } else {
                if (lastActiveDate < currentDate) {
                    pastDateEvents[ele.id] = true;
                    pastDateEvents[`${pseudoIndentifier}${ele.id}`] = true;
                } else {
                    if (!futureDateBreak) {
                        closestNearDateEvent[ele.id] = true;
                        findLastActiveIndex = index;
                    }
                    if (firstActiveIndex === -1 && ele.type !== 'heading') {
                        firstActiveIndex = index;
                        firstActiveItem = ele;
                    }
                }
            }
        });

        if (firstActiveIndex > -1) {

            firstActiveIndex = -1;

            thh.forEach((ele, i) => {
                if (ele.id === firstActiveItem.id) {
                    firstActiveIndex = i;
                }
                if (firstActiveIndex === -1 && Array.isArray(ele.additionalInfo)) {
                    ele.additionalInfo.forEach(item => {
                        if (item.id === firstActiveItem.id) {
                            firstActiveIndex = i;
                        }
                    });
                }
            })
        }
    }


    if (!checklistEnabled) {
        const findIndex = readingPlanEnabled ? firstActiveIndex : firstIndex;
        const tgITM = getCurrentItem(0, findIndex, { 0: { list: thisBot.PlayingLayersConversion(playlist.list) } }, 0);


        if (tgITM.type === "attachment-link") {
            thisBot.RenderLinkContent({ ...tgITM, isLastItem: thh.length === 1 && (!isfirstItemPlaylist || thh[0].list.length === 1), isFirstItem: startIndex === 0 && subIndex < 1 });
        } else if (tgITM) {
            const isBulk = Array.isArray(tgITM.additionalInfo);
            const skip = await thisBot.checkIfNeedToSkip({ dataItem: tgITM });
            if (!skip) {
                thisBot.navigationWithDataItem({ dataItem: isBulk ? tgITM.additionalInfo : tgITM, });
                // if (tgITM?.nextTargetItem) {
                //     if (tgITM.nextTargetItem.additionalInfo.type === "attachment-link") {
                //         thisBot.RenderLinkContent({ ...tgITM.nextTargetItem });
                //     } else {
                //         thisBot.navigationWithDataItem({ dataItem: tgITM.nextTargetItem, });

                //     }
                // }
            }
        }
        globalThis[`${parentId}ToggleGreyCheckPLayingPlaylist`] && globalThis[`${parentId}ToggleGreyCheckPLayingPlaylist`](tgITM.id);
    }

    globalThis.PPthh = thh;
    globalThis.PPpastDateEvents = pastDateEvents;
    globalThis.PPchecklistEnabled = checklistEnabled;
    globalThis.PPreadingPlanEnabled = readingPlanEnabled;
    globalThis.PPfirstActiveIndex = firstActiveIndex;
    globalThis.PPfirstIndex = firstIndex;
    globalThis.PPplaylist = playlist;
    globalThis.PPsubIndex = subIndex;
    globalThis.PPplaylistName = playlistName;
    globalThis.PPclosestNearDateEvent = closestNearDateEvent;
}


if (globalThis.AddNowBarApp && !globalThis.IsQueuePresent) {
    const id = 'player-playlist-bar';
    globalThis.AddNowBarApp(<PlaylistPlayerControls parentId={parentId} />, id);
} else if (!globalThis.IsQueuePresent) {
    os.unregisterApp("playing-playlist-flaot");
    os.registerApp("playing-playlist-flaot");
    const FloatApp = () => {
        return <div style={{ top: '1rem', left: '1rem', zIndex: '10000', position: 'fixed' }}>
            <PlaylistPlayerControls parentId={parentId} />
        </div>
    }
    os.compileApp("playing-playlist-flaot", <FloatApp />)
}

const PlayingPlaylist = () => {

    const [render, setRender] = useState(0);

    const [openAttachLink, setOpenAttachLink] = useState(false);

    const [{
        currentPlaylistName,
        currentItemID,
    }, setItemsPlayer] = useState({
        currentPlaylistName: globalThis.PPcurrentPlaylistName,
        currentItemID: globalThis.PPcurrentItemID,
        typeContent: globalThis.PPtypeContent,
        nextItemName: globalThis.PPnextItemName,
        prevItemName: globalThis.PPprevItemName,
        currentItemName: globalThis.PPcurrentItemName,
    });

    const [hide, setHide] = useState(false);

    const toggleHide = () => setHide(p => !p);

    const [queue, setQueue] = useState([]);

    const [itemVisitedMap, setItemVisitedMap] = useState({ ...globalThis.PPpastDateEvents });
    const [heading, setHeading] = useState("");

    globalThis.PlaylingItemVisitiedMap = setItemVisitedMap;
    globalThis.PlayingPlaylistSetHeading = setHeading;

    const refs = useMemo(() => {
        const refs = {};

        const playlistsProgress = globalThis[`${parentId}playlistProgress`] || {};
        const playlistsChecked = globalThis[`${parentId}playlistChecked`] || {};

        let progressItemsTemp = {};
        let checkedItemsTemp = {};

        Object.keys(globalThis.PlayingPlaylists).forEach(key => {
            const { list, playlistID } = globalThis.PlayingPlaylists[key];
            list.forEach(ele => {
                refs[ele.id] = createRef();
            });

            if (playlistID) {
                const itemsProg = { ...(playlistsProgress[playlistID] || {}) };
                const itemsCheck = { ...(playlistsChecked[playlistID] || {}) };
                progressItemsTemp = { ...progressItemsTemp, ...itemsProg }
                checkedItemsTemp = { ...checkedItemsTemp, ...itemsCheck }
            }
        });

        globalThis.SetCheckedItemsPlayingPlaylist?.(checkedItemsTemp);

        globalThis.PlaylingItemVisitiedMap?.({ ...globalThis.PPpastDateEvents, ...progressItemsTemp });

        return refs;
    }, [render]);



    const onClick = ({ key, dataItem, bulkAdd = false, }) => {
        const data = bulkAdd ? { ...dataItem[0] } : { ...dataItem };

        const isLayers = globalThis.PlayingPlaylists[key].isLayers;

        const th = globalThis.PlayingPlaylists[key].list;
        let index = th.findIndex(ele => ele.id === data.id);

        if (bulkAdd || index === -1) {
            th.findIndex((item, i) => {
                const toBeMapped = item.additionalInfo.layers || [];
                if (Array.isArray(toBeMapped)) {
                    const idMap = {};
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
            globalThis.UpdateJustAddedToQueue(false);
            globalThis.SetCurreIndexDirect({
                key: key,
                index: index,
                fromButton: globalThis.CurrentIndexItem.fromButton || 1,
                isPreviousQueue: false,
                subIndex: 0
            });
        }
    }

    useLayoutEffect(() => {
        globalThis.SET_SHOW_CHECK && globalThis.SET_SHOW_CHECK(1);
        return () => {
            globalThis.SET_SHOW_CHECK && globalThis.SET_SHOW_CHECK(false);
            globalThis.LAST_QUEUE_IIEM = {};
        };
    }, []);

    const attachLink = (title, link, linkState) => {
        globalThis.SetQueue(
            {
                content: title,
                additionalInfo: {
                    link,
                    ...linkState,
                },
                type: linkState.type === "text" ? "heading" : "attachment-link",
            }
        );
        setOpenAttachLink(false);
    };

    const massAdd = (items) => {
        globalThis.SetQueue(items);
    }

    const editDataFromPlaylist = (ids, key, play) => {

        const isShiftHold = globalThis?.KEY_HOLD?.['shift'];

        const prevIds = { ...globalThis.PlayingPlaylistCheckedItems };

        const isArray = Array.isArray(ids);

        let newIds = isArray ? [...ids] : [ids];

        let firstIDIndex = -1;

        const newIdsmap = {};

        newIds.forEach(ele => {
            newIdsmap[ele] = true;
        })

        let targetItem = [];

        newIds.forEach((id) => {
            prevIds[id] = !prevIds[id];
        });

        const playlist = globalThis.PlayingPlaylists[key];

        let startI = Number.MAX_SAFE_INTEGER;
        let endI = Number.MIN_SAFE_INTEGER;



        globalThis.PPplaylist.list.forEach((ele, index) => {
            if (newIdsmap[ele.id]) {
                if (firstIDIndex === -1) {
                    firstIDIndex = index;
                }
            }
        });

        if (isShiftHold) {
            const lastIdIndex = globalThis.LAST_INDEX_CHECKLIST_CHECKED;
            startI = Math.min(lastIdIndex, firstIDIndex);
            endI = Math.max(lastIdIndex, firstIDIndex);
        }

        globalThis.PPplaylist.list.forEach((ele, index) => {
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

        globalThis.LAST_INDEX_CHECKLIST_CHECKED = firstIDIndex;

        const thCurrent = globalThis.PPplaylist.list;

        if (targetItem.length > 1) {
            thCurrent.forEach(ele => {
                if (Array.isArray(ele.additionalInfo)) {
                    const isMatch = ele.additionalInfo.some(ele => {
                        return newIdsmap[ele.id]
                    });
                    if (isMatch) {
                        targetItem = ele;
                    };
                }
            })
        } else {
            targetItem = targetItem[0];
        }

        if (targetItem && play) {
            if (targetItem.type === "attachment-link") {
                thisBot.RenderLinkContent({ ...targetItem, isLastItem: false, isFirstItem: false });
            } else {
                const isBulk = Array.isArray(targetItem.additionalInfo);
                thisBot.navigationWithDataItem({ dataItem: isBulk ? targetItem.additionalInfo : targetItem, bulkAdd: isBulk });
            }
        }

        globalThis.SetCheckedItemsPlayingPlaylist(prevIds);
    };


    const [activeDate, setActiveDate] = useState(null);

    useLayoutEffect(() => {
        globalThis.SetActiveDate = setActiveDate;
        globalThis.PlaylistPlaytoggleHide = toggleHide;
        globalThis.PlayingsetOpenAttachLink = setOpenAttachLink;
        globalThis.RenderPlaylist = () => setRender(p => p + 1);
        globalThis.SetItemsPlayer = setItemsPlayer;
        return () => {
            globalThis.SetActiveDate = null;
            globalThis.PlaylistPlaytoggleHide = null;
            globalThis.PlayingsetOpenAttachLink = null;
            globalThis.RenderPlaylist = null;
            globalThis.SetItemsPlayer = null;
        }
    }, [])

    // const tranformedList = globalThis.PlayingPlaylists?.[globalThis.CurrentIndexItem?.key]?.list;
    // const currentItem = tranformedList?.[globalThis.CurrentIndexItem?.index];

    return <>
        <style>{thisBot.tags['RecordingVoiceUI.css']}</style>

        <div className="playing-queue-container" style={{ height: hide ? '' : '100%' }}>
            <div className={`playing-queue reset-css ${(globalThis.PPchecklistEnabled) && "checklistEnabled"} ${hide && 'hide'}`}>
                <div className="header">
                    <h3>{currentPlaylistName}</h3>
                    {(!globalThis.PPchecklistEnabled) ? <span style={{ cursor: 'pointer' }} onClick={toggleHide} class="material-symbols-outlined unfollow">
                        close
                    </span> :
                        <div className="align-center" style={{ gap: '0.5rem' }}>
                            <p
                                onClick={() => {
                                    setOpenAttachLink(true);
                                }}
                                style={{ margin: '0', padding: '-0.5rem' }}
                                className="playlist-action small secondary self-start"
                            >
                                <span>
                                    Add Link to Queue
                                </span>
                            </p>
                            <p
                                onClick={() => {
                                    DataManager.cancelCurrentPlayingSound();
                                    globalThis.SetSelected && SetSelected({});
                                    globalThis.SetHolded && SetHolded({});
                                    // globalThis.SetPlayingPlaylist && globalThis.SetPlayingPlaylist(false);
                                    globalThis[`${parentId}ToggleGreyCheckPLayingPlaylist`] && globalThis[`${parentId}ToggleGreyCheckPLayingPlaylist`](null);
                                    globalThis.IsQueuePresent = false;
                                    thisBot.CloseFloatingApp();
                                    // os.unregisterApp("playing-playlist");
                                    globalThis.IS_PLAYLIST_ACTIVE = false;
                                    thisBot.OpenSelf();
                                    globalThis.SetSplitAppPanel2 && globalThis.SetSplitAppPanel2(null);
                                    // thisBot.showInfo(`History Mode`);
                                }}
                                style={{ margin: '0', width: '2.55rem', height: '2.55rem', borderRadius: '50%' }}
                                className="playlist-action small"
                            >
                                <span style={{ margin: '0', fontSize: '14px', backgroundColor: '#D36433' }} class="material-symbols-outlined unfollow">
                                    stop
                                </span>
                            </p>

                        </div>
                    }
                </div>
                <div className="playing-queue-content">

                    {false && (globalThis.PPchecklistEnabled) && <p className="align-center" style={{ justifyContent: "center" }}>
                        <span class="material-symbols-outlined unfollow" style={{ color: "lightgreen", marginRight: "8px" }}>
                            check_circle
                        </span>
                        <span>
                            Mark as Visited
                        </span>
                    </p>
                    }

                    {
                        queue.length
                            ?
                            <>
                                <h4>Next in Queue</h4>
                                <DragDrop
                                    checkListData={globalThis.PlayingPlaylistCheckedItems}
                                    editDataFromPlaylist={editDataFromPlaylist}
                                    isPlayer={globalThis.PPchecklistEnabled}
                                    list={queue}
                                    setList={setQueue}
                                    embedding={null}
                                    PlayingPlaylist={true}
                                    currentDateActive={activeDate}
                                    deleteFromList={() => { }}
                                    creatingPlaylist={false}
                                    onClick={() => { }}
                                    currentFormat={currentFormat}
                                    activeItemID={currentItemID}
                                    // oldItemsMap={itemVisitedMap}
                                    onClickItem={() => { }}
                                />
                            </>
                            :
                            null
                    }
                    {Object.keys(globalThis.PlayingPlaylists).map((key, index) => {
                        const { name, list, broken, playlistID, id, isLayers } = globalThis.PlayingPlaylists[key];
                        if (playlistID) {
                            if (!globalThis['defaultplaylistProgress']) globalThis['defaultplaylistProgress'] = {};
                            if (!globalThis['defaultplaylistChecked']) globalThis['defaultplaylistChecked'] = {};
                            globalThis['defaultplaylistProgress'][playlistID] = {
                                ...itemVisitedMap
                            };
                            globalThis['defaultplaylistChecked'][playlistID] = {
                                ...globalThis.PlayingPlaylistCheckedItems
                            };
                            globalThis?.savePlaylistProgress && savePlaylistProgress(playlistID);
                        }
                        return <>
                            {index !== 0 && <h4 key={`heading${id}`}>{broken ? '' : 'Next in '}{name}</h4>}
                            <DragDrop
                                key={id}
                                setRef={refs}
                                isPlayer={globalThis.PPchecklistEnabled}
                                currentFormat={currentFormat}
                                list={list}
                                playingPlaylist={true}
                                layers={true}
                                currentDateActive={activeDate}
                                editDataFromPlaylist={(data, play = true) => editDataFromPlaylist(data, key, play)}
                                // oldItemsMap={{ ...itemVisitedMap, ...checkedItems }}
                                checkListData={globalThis.PlayingPlaylistCheckedItems}
                                setList={(newList) => {
                                    const listLatest = [...newList];
                                    if (typeof newList === 'function') {
                                        listLatest = newList(list);
                                    }
                                    globalThis.SetPlayingPlaylists?.(prev => ({
                                        ...prev,
                                        [key]: { name, list: listLatest }
                                    }));
                                    // setList((prev) => {
                                    //     const item = prev[currIndex.index];
                                    //     return [...oldList, item, ...listLatest]
                                    // });
                                }}
                                activeItemID={key == globalThis.CurrentIndexItem.key ? currentItemID : 0}
                                // activeItemList={false ? activeIndexs : {}}
                                deleteFromList={() => { }}
                                creatingPlaylist={false}
                                onClick={({ dataItem, bulkAdd, justPlay }) => {
                                    DataManager.cancelCurrentPlayingSound();
                                    if (justPlay) {
                                        thisBot.navigationWithDataItem({ dataItem });
                                        return;
                                    }
                                    onClick({
                                        dataItem,
                                        bulkAdd,
                                        key
                                    });
                                }}
                                onClickItem={() => { }}
                            />
                        </>
                    })}

                    {openAttachLink && (
                        <div
                            style={{
                                position: "relative",
                                // bottom: (checklistEnabled) ? 'calc(62px)' : "calc(62px + 153px)",
                                // left: "0px",
                                // zIndex: "1001",
                                textTransform: "capitalize",
                                // padding: "12px",
                                background: "white",
                                borderRadius: "4px",
                                fontWeight: "600",
                                width: "calc(100%)",
                                // borderTop: "1px solid #DADADA",
                                backgroundColor: "#F7F7F5",
                                height: 'auto'
                            }}
                        >
                            <AttachLink
                                massAdd={massAdd}
                                attachLink={attachLink}
                                onClose={() => setOpenAttachLink(false)}
                            />
                        </div>
                    )
                    }
                </div>
            </div >



            {
                (!globalThis.PPchecklistEnabled) && <div
                    style={{
                        zIndex: "1001",
                        textTransform: " capitalize",
                        padding: "12px",
                        backgroundColor: "transparent",
                        borderRadius: "4px",
                        position: 'absolute',
                        bottom: '0',
                        right: '0',
                        fontWeight: "600",
                        width: "calc(100%)",
                        borderTop: "1px solid #DADADA",
                    }}
                    className="reset-css"
                >
                    {false && <span className="item-ribbon">
                        <span>
                            {'playlistName'} {!!heading && ` - ${heading}`}
                        </span>
                    </span>}
                    {false && <div className="stop-buttom-playing-list">
                        <Button style={{ fontSize: '12px', margin: '0', minWidth: 'auto', padding: "0", border: "none" }}
                            onClick={() => {
                                // globalThis.SetPlayingPlaylist && globalThis.SetPlayingPlaylist(false);
                                globalThis[`${parentId}ToggleGreyCheckPLayingPlaylist`] && globalThis[`${parentId}ToggleGreyCheckPLayingPlaylist`](null);
                                globalThis.IsQueuePresent = false;
                                // os.unregisterApp("playing-playlist");
                                thisBot.CloseFloatingApp();
                                globalThis.IS_PLAYLIST_ACTIVE = false;
                                globalThis.SetSplitAppPanel2 && globalThis.SetSplitAppPanel2(null);
                                // thisBot.showInfo(`History Mode`);
                            }} >
                            <span class="material-symbols-outlined unfollow" style={ButtonStyle}>
                                stop
                            </span>
                        </Button>
                    </div>
                    }
                    {false && < div style={{
                        background: "white",
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        boxShadow: '0px 0px 9px 0px #00000026',
                        padding: '10px',
                        borderRadius: '8px'
                    }}>
                        <PlaylistPlayerControls />
                    </div>}
                </div>
            }
        </div >
    </>
}


if ((playlist && !globalThis.IsQueuePresent) || skipAll) {
    globalThis.IsQueuePresent = true;
    globalThis.SetSplitAppPanel2 && globalThis.SetSplitAppPanel2(<PlayingPlaylist />);
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