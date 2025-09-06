const { playingPlaylist, startIndex, startSubIndex, parentId, name: playlistName, list = undefined } = that;

if (!globalThis.IsQueuePresent) {
    os.unregisterApp("playing-playlist");
    os.registerApp("playing-playlist");
    globalThis.IS_PLAYLIST_ACTIVE = 1;
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
    return;
}

const { useState, useEffect, useRef, useMemo, createRef } = os.appHooks;
const { Input, Modal, Button, ButtonsCover } = Components;

const AttachLink = await thisBot.AttachLink();
const VideoPlayer = await thisBot.VideoSmallScreen();
const AudioPlayer = await thisBot.AudioPlayer();

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

const isfirstItemPlaylist = !!thh[0].list;

if (startIndex === 0 && isfirstItemPlaylist) {
    subIndex = 0;
}

let firstIndex = 0;


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

const PlayingPlaylist = () => {

    // Audio
    const [mediaURL, setMediaURL] = useState('');
    const [videoSrc, setVideoSrc] = useState(false);

    const setIncrementalCount = async (data) => {
        if (!data) return;
        setMediaURL(data);
    };

    globalThis.SetIncrementalCountPlayingPlaylist = setIncrementalCount;
    globalThis.SetVideoSrc = setVideoSrc;
    globalThis.SetMediaURL = setMediaURL;


    const [openAttachLink, setOpenAttachLink] = useState(false);

    // May Use Later
    const [activeIndexs, setActiveIndexs] = useState({ ...closestNearDateEvent });

    const [hide, setHide] = useState(false);


    // useEffect(() => {
    //     globalThis.SetSubtractWidth(300);
    //     return () => {
    //         globalThis.SetSubtractWidth(0);
    //     }
    // }, []);

    const toggleHide = () => setHide(p => !p);

    const [queue, setQueue] = useState([]);

    const [playlists, setPlaylists] = useState({
        0: {
            name: playlistName,
            list: [...(thisBot.PlayingLayersConversion(playlist.list))],
            id: createUUID(),
            playlistID: playlist.id,
            isLayers: playlist.isLayers
        }
    });
    // const [dragList, setDragList] = useState([]);
    // const [oldList, setOldList] = useState([]);

    const [transformedHistory, setTransformedHistory] = useState(thh);
    const [heading, setHeading] = useState("");

    const [itemVisitedMap, setItemVisitedMap] = useState({ ...pastDateEvents });
    const [oldData, setOldData] = useState([]);

    const [checkedItems, setCheckedItems] = useState(readingPlanEnabled ? { ...pastDateEvents } : {});

    const [currIndex, setCurreIndex] = useState({
        key: 0,
        index: (checklistEnabled) ? -1 : readingPlanEnabled ? firstActiveIndex : firstIndex,
        fromButton: 0,
        isPreviousQueue: false,
        subIndex: subIndex,
        // index: startIndex,
        // Sub Index is not needed cause we have paused the Merging for now
        // subIndex,
        // fromButton: 0
    });

    const handlesetIndex = (index = 0, key) => {
        const nextItem = transformedHistory[index];
        const isPlaylist = !!nextItem?.list;
        if (isPlaylist) {
            setCurreIndex({
                index,
                key,
                fromButton: currIndex.fromButton,
                isPreviousQueue: false,
                subIndex: 0,
            });
        } else {
            setCurreIndex({
                index,
                key,
                fromButton: currIndex.fromButton,
                isPreviousQueue: false,
                subIndex: 0,
            });
        }
    }


    const refs = useMemo(() => {
        const refs = {};

        const playlistsProgress = globalThis[`${parentId}playlistProgress`];
        const playlistsChecked = globalThis[`${parentId}playlistChecked`];

        let progressItemsTemp = {};
        let checkedItemsTemp = {};

        Object.keys(playlists).forEach(key => {
            const { list, playlistID } = playlists[key];
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

        setCheckedItems(checkedItemsTemp);

        setItemVisitedMap({ ...pastDateEvents, ...progressItemsTemp });

        return refs;
    }, [playlists]);

    const handleOnButtonPress = (order = 0, getIndexOnly = false, directSet = false, directSetKey = false, newIndexs) => {
        const indexes = newIndexs ? newIndexs : { ...currIndex }


        let newIndex = directSet ? directSet : indexes.index + order;
        let newSubIndex = directSet ? 0 : indexes.subIndex;
        let newKey = directSetKey ? directSetKey : indexes.key;

        // const isLayer = playlists[indexes.key]?.isLayers;

        const tranformedList = playlists[indexes.key]?.list;
        const currentItem = tranformedList[indexes.index];

        const toBeMapArray = currentItem?.additionalInfo?.layers || [];
        // const isCurrentItemGroup = tranformedList[]

        const isCurrentItemChapterRange = currentItem?.type === "chapter-range" || !!currentItem.additionalInfo?.layers?.length;

        if (!isCurrentItemChapterRange) newSubIndex = 0;

        if (isCurrentItemChapterRange && !directSet) {
            const lengthOfChapterRange = toBeMapArray?.length;
            newIndex -= order;
            if (order > 0) {
                if (lengthOfChapterRange <= (newSubIndex + order)) {
                    const nextItem = tranformedList[indexes.index + 1];
                    // This Might Break When Order is > 1
                    newSubIndex = (newSubIndex + order) % lengthOfChapterRange;
                    if (nextItem) newIndex += 1;
                } else {
                    newSubIndex += order;
                }
            } else {
                if ((newSubIndex + order) < 0) {
                    const prevItem = tranformedList[indexes.index - 1];

                    const wasPrevItemArray = prevItem?.type === "chapter-range";

                    const prevItemList = wasPrevItemArray ? prevItem?.additionalInfo : !!prevItem?.additionalInfo?.layers?.length ? prevItem?.additionalInfo?.layers : [];
                    // This Might Break When Order is > 1
                    newSubIndex = (prevItemList.length + newSubIndex) + order;
                    if (prevItem) newIndex -= 1;
                } else {
                    newSubIndex += order;
                }
            }
        }

        if (!directSet) {
            if (order > 0) {
                const currentListLength = tranformedList.length;

                if ((currentListLength <= (indexes.index + order)) && (!isCurrentItemChapterRange || (indexes.subIndex + order) >= toBeMapArray?.length)) {
                    const allKeys = Object.keys(playlists);
                    const currentKeyIndex = allKeys.findIndex(ele => ele == indexes.key);
                    newKey = allKeys[currentKeyIndex + 1];
                    // newKey = parseInt(indexes.key) + 1;
                    newIndex = (indexes.index + order) % currentListLength;
                    newSubIndex = 0;
                }
            } else {
                if (indexes.index + order < 0 && (indexes.subIndex + order) < 0) {
                    const allKeys = Object.keys(playlists);
                    const currentKeyIndex = allKeys.findIndex(ele => ele == indexes.key);
                    newKey = allKeys[currentKeyIndex - 1];
                    newIndex = (playlists[newKey]?.list)?.length - 1;
                    newSubIndex = 0;
                }
            }
        }

        let newValues = {
            index: newIndex,
            key: newKey,
            fromButton: order,
            isPreviousQueue: false,
            subIndex: newSubIndex
        };

        const targetItem = getCurrentItem(newValues.key, newValues.index, playlists, newValues.subIndex, playlists[newValues.key]?.isLayers);

        const isLayersAndScripture = playlists[newValues.key]?.isLayers && targetItem.type !== 'attachment-link' && newValues.subIndex !== 0;

        if (["heading", 'date'].findIndex(ele => ele === targetItem?.type) > -1 || isLayersAndScripture) {

            if (targetItem.type === "date" && !getIndexOnly) {
                setItemVisitedMap(prev => ({ ...prev, [targetItem.id]: true }));
            }

            const newVals = handleOnButtonPress(order, getIndexOnly, directSet, directSetKey, newValues);
            return newVals;
        }

        if (getIndexOnly) return newValues;
        const id = targetItem.id;

        // console.log("CHECK", id, refs);
        // console.log("CHECK 2", refs[id]?.current);
        // console.log("CHECK 2", refs[id]?.current?.focus);
        if (refs[id]?.current.focus) {
            globalThis.ScrollTimerPlaylist && clearTimeout(globalThis.ScrollTimerPlaylist);
            globalThis.ScrollTimerPlaylist = setTimeout(() => {
                refs[id].current.focus();
            }, 1000)
        }

        if (targetItem.type === 'verse') {
            if (globalThis.FocusOnVerse) {
                FocusOnVerse(targetItem.additionalInfo.verse)
            }
        }

        justAddedQueue.current = false;
        globalThis.LAST_QUEUE_IIEM = {};
        setCurreIndex(newValues)
    }


    const justAddedQueue = useRef(false);

    const addToQueue = (item, combineLast) => {

        const isArr = Array.isArray(item);

        let toAddItems = [];

        if (isArr) {
            toAddItems = [...item.map(ele => ({ id: createUUID(), ...ele }))];
            globalThis.LAST_QUEUE_IIEM = item[item.length];

        } else {
            const isSame = objectComparator(item, (globalThis.LAST_QUEUE_IIEM || {}), ["content"]);

            if (isSame) return os.toast("Last Item Repeated!");
            toAddItems = [{ ...item, id: createUUID() }];
            globalThis.LAST_QUEUE_IIEM = item;
        }

        setPlaylists((prevPlaylists) => {
            let currentKey = currIndex.key;
            const currentPlaylist = prevPlaylists[currentKey];
            const playlistID = currentPlaylist.playlistID;

            if (!currentPlaylist) {
                console.error("Current playlist key does not exist!");
                return prevPlaylists;
            }

            const { list: currentList, SQ, isLayers } = currentPlaylist;
            let splitIndex = currIndex.index;

            let extraPoints = 0;

            const thh = currentList;

            thh.forEach((ele, index) => {
                if (index <= splitIndex) {
                    if (Array.isArray(ele.additionalInfo)) {
                        extraPoints += (ele.additionalInfo.length - 1);
                    }
                };
            });

            splitIndex += extraPoints;

            let totalQueue = 0;
            Object.keys(prevPlaylists).forEach(currentKeyItr => {
                if (prevPlaylists[currentKeyItr].SQ) totalQueue++;
            })

            const updatedPlaylists = { ...prevPlaylists };

            if ((SQ || justAddedQueue.current)) {
                if (justAddedQueue.current) {
                    currentKey = Number(currIndex.key) + 1;
                }
                if (combineLast) {
                    updatedPlaylists[currentKey].list.pop();
                }
                // Case: Adding to an existing special queue
                updatedPlaylists[currentKey].list = [
                    ...updatedPlaylists[currentKey].list,
                    ...toAddItems
                ];
            } else {
                // Case: Splitting a playlist
                const beforeCurrentIndex = currentList.slice(0, splitIndex + 1);
                const afterCurrentIndex = currentList.slice(splitIndex + 1);

                const newQueueKey = `${currIndex.key}.1` // Next numeric key
                const newQueue = {
                    name: `Queue ${totalQueue + 1}`,
                    list: [...toAddItems],
                    id: createUUID(),
                    SQ: true,// Mark this as a special queue,
                    playlistID: null
                };

                if (!checklistEnabled) {
                    // Update the current playlist with items before the split
                    updatedPlaylists[currentKey] = {
                        ...currentPlaylist,
                        list: beforeCurrentIndex
                    };
                }


                // if (!readingPlanEnabled) {
                // Add the new queue
                updatedPlaylists[newQueueKey] = newQueue;
                // } else if (findLastActiveIndex > -1) {
                //     findLastActiveIndex++;
                //     currentList.splice(findLastActiveIndex, 0, item);
                //     updatedPlaylists[currentKey].list = currentList;
                //     setActiveIndexs(prev => ({ ...prev, [item.id]: true }));
                // }


                if (!checklistEnabled) {
                    updatedPlaylists[currentKey].broken = true;
                    if (afterCurrentIndex.length > 0) {
                        updatedPlaylists[`${currIndex.key}.2`] = {
                            name: `${currentPlaylist.name}`,
                            list: [...afterCurrentIndex],
                            id: createUUID(),
                            SQ: false, // Mark this as a special queue
                            playlistID
                        };
                    }
                }
            }
            justAddedQueue.current = true;

            // Renumber keys to ensure sequential ordering
            const reorderedPlaylists = {};
            Object.keys(updatedPlaylists)
                .sort((a, b) => Number(a) - Number(b)) // Sort numerically
                .forEach((key, index) => {
                    reorderedPlaylists[index] = { ...updatedPlaylists[key] };
                });

            return reorderedPlaylists;
        });
    };


    useEffect(() => {
        globalThis.SetCurreIndexPlaylist = handlesetIndex;
        globalThis.HandleOnButtonPress = handleOnButtonPress;
        globalThis.ModifyTransformedHistory = setTransformedHistory;
        globalThis.IsPlaylistPlaying = true;
        globalThis.SetQueue = addToQueue;
        globalThis.SetPlayingList = setPlaylists;

        if (readingPlanEnabled) {
            globalThis.READING_PLAN_WORK = true;
            // globalThis.IS_PLAYLIST_ACTIVE = 0;
        }
        return () => {
            globalThis.SetCurreIndexPlaylist = null;
            globalThis.HandleOnButtonPress = null;
            globalThis.IsPlaylistPlaying = false;
            globalThis.ModifyTransformedHistory = null;
            globalThis.SetQueue = false;
            globalThis.SetPlayingList = () => { };
            globalThis.SetSelected && SetSelected({});
            globalThis.READING_PLAN_WORK = false;
            // globalThis.IS_PLAYLIST_ACTIVE = true;
        }
    }, [handleOnButtonPress, transformedHistory]);

    const [currentPlaylistName, currentItemID, typeContent, nextItemName, prevItemName, currentItemName] = useMemo(() => {
        const { name: currentPlaylistName } = playlists[currIndex.key];

        const targetItem = getCurrentItem(currIndex.key, currIndex.index, playlists, currIndex.subIndex, playlists[currIndex.key]?.isLayers);
        const currentItemName = targetItem;
        const currentItemType = targetItem?.type;


        const nextIndexes = handleOnButtonPress(1, true);
        const prevIndex = handleOnButtonPress(-1, true);

        const nextItem = getCurrentItem(nextIndexes.key, nextIndexes.index, playlists, nextIndexes.subIndex, playlists[nextIndexes.key]?.isLayers, true);
        const prevItem = (prevIndex.isPreviousQueue) ? oldData[oldData.length - 1] : getCurrentItem(prevIndex.key, prevIndex.index, playlists, prevIndex.subIndex, playlists[prevIndex.key]?.isLayers, true);

        // setOldData(prev => [...prev, targetItem]);
        setItemVisitedMap(prev => ({ ...prev, [targetItem.id]: true }));

        if (targetItem?.type === "attachment-link") {
            thisBot.RenderLinkContent({ ...targetItem, isLastItem: !nextItem, isFirstItem: !prevItem });
        } else if (currIndex.fromButton !== 0) {
            const isBulk = !!targetItem?.additionalInfo?.layers?.length || Array.isArray(targetItem.additionalInfo);

            const toBeMapArray = targetItem?.additionalInfo?.layers?.length ? targetItem?.additionalInfo?.layers : Array.isArray(targetItem.additionalInfo);

            if (targetItem?.type === "heading" || (!!targetItem?.nextTargetItem?.id && currIndex.fromButton === 1)) {
                if (targetItem?.type === "heading") setHeading(targetItem.content);
                const allKeys = Object.keys(playlists);

                const isFirstKey = currIndex.key == 0;
                const isLastKey = currIndex.key == allKeys[allKeys.length - 1];

                const th = playlists[currIndex.key].list;

                const isFirstItemAndBackButton = currIndex.fromButton < 0 && currIndex.index == 0 && isFirstKey;
                const isLastItemAndLastButton = currIndex.fromButton > 0 && isLastKey && currIndex.index == (th.length - 1);
                if (targetItem?.nextTargetItem) {
                    handleOnButtonPress(currIndex.fromButton);
                    globalThis[`${targetItem.id}OpenToggle`] && globalThis[`${targetItem.id}OpenToggle`](true);
                }
                if (!isFirstItemAndBackButton && !isLastItemAndLastButton) handleOnButtonPress(currIndex.fromButton);
            } else {
                const skip = thisBot.checkIfNeedToSkip({ dataItem: targetItem });
                if (skip) {
                    os.toast(`${targetItem.content} is Already Opened.Skipping it!`)
                    handleOnButtonPress(currIndex.fromButton);
                } else {
                    thisBot.navigationWithDataItem({ dataItem: isBulk ? toBeMapArray : targetItem, bulkAdd: isBulk });
                }
                // SetBlinker({});
            }
        }
        // nextItemName, nextItemType, prevItemName, prevItemType
        //  nextItemName, nextItemType, prevItemName, prevItemType
        return [currentPlaylistName, targetItem.id, currentItemType, nextItem, prevItem, currentItemName];
    }, [currIndex, playlists, queue, refs]);

    const onClick = ({ key, dataItem, bulkAdd = false, }) => {
        const data = bulkAdd ? { ...dataItem[0] } : { ...dataItem };

        const isLayers = playlists[key].isLayers;

        const th = playlists[key].list;
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
            justAddedQueue.current = false;
            setCurreIndex({
                key: key,
                index: index,
                fromButton: currIndex.fromButton || 1,
                isPreviousQueue: false,
                subIndex: 0
            });
        }
    }

    useEffect(() => {
        globalThis.SET_SHOW_CHECK && globalThis.SET_SHOW_CHECK(1);
        return () => {
            globalThis.SET_SHOW_CHECK && globalThis.SET_SHOW_CHECK(false);
            globalThis.LAST_QUEUE_IIEM = {};
        };
    }, []);


    const attachLink = (title, link, linkState) => {
        addToQueue(
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
        addToQueue(items);
    }

    const editDataFromPlaylist = (ids, key, play) => {

        const isShiftHold = globalThis?.KEY_HOLD?.['shift'];

        const prevIds = { ...checkedItems };

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

        const playlist = playlists[key];

        let startI = Number.MAX_SAFE_INTEGER;
        let endI = Number.MIN_SAFE_INTEGER;



        playlist.list.forEach((ele, index) => {
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

        playlist.list.forEach((ele, index) => {
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

        const thCurrent = playlist.list;

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

        setCheckedItems(prevIds);
    };


    const [activeDate, setActiveDate] = useState(null);

    useEffect(() => {
        const i = currIndex.index;
        const list = playlist.list;

        const gp = list;

        let lastActiveDateID = -1;

        for (let j = i; j > -1; j--) {
            const item = gp[j];
            if (item.type === "date" && lastActiveDateID === -1) {
                lastActiveDateID = item.id;
            }
        };

        setActiveDate(lastActiveDateID);
    }, [currIndex]);

    const tranformedList = playlists[currIndex.key]?.list;
    const currentItem = tranformedList[currIndex.index];

    return <>
        <style>{thisBot.tags['RecordingVoiceUI.css']}</style>

        <div className="playing-queue-container" style={{ height: hide ? '' : '100%' }}>
            <div className={`playing-queue reset-css ${(checklistEnabled) && "checklistEnabled"} ${hide && 'hide'}`}>
                <div className="header">
                    <h3>{currentPlaylistName}</h3>
                    {(!checklistEnabled) ? <span style={{ cursor: 'pointer' }} onClick={toggleHide} class="material-symbols-outlined unfollow">
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
                                    // os.unregisterApp("playing-playlist");
                                    globalThis.IS_PLAYLIST_ACTIVE = false;
                                    globalThis.SetSplitAppPanel2(null);
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

                    {false && (checklistEnabled) && <p className="align-center" style={{ justifyContent: "center" }}>
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
                                    checkListData={checkedItems}
                                    editDataFromPlaylist={editDataFromPlaylist}
                                    isPlayer={checklistEnabled}
                                    list={queue}
                                    setList={setQueue}
                                    embedding={null}
                                    currentDateActive={activeDate}
                                    deleteFromList={() => { }}
                                    creatingPlaylist={false}
                                    onClick={() => { }}
                                    currentFormat={currentFormat}
                                    activeItemID={currentItemID}
                                    oldItemsMap={itemVisitedMap}
                                    onClickItem={() => { }}
                                />
                            </>
                            :
                            null
                    }
                    {Object.keys(playlists).map((key, index) => {
                        const { name, list, broken, playlistID, id, isLayers } = playlists[key];
                        if (playlistID) {
                            if (!globalThis['defaultplaylistProgress']) globalThis['defaultplaylistProgress'] = {};
                            if (!globalThis['defaultplaylistChecked']) globalThis['defaultplaylistChecked'] = {};
                            globalThis['defaultplaylistProgress'][playlistID] = {
                                ...itemVisitedMap
                            };
                            globalThis['defaultplaylistChecked'][playlistID] = {
                                ...checkedItems
                            };
                            globalThis?.savePlaylistProgress && savePlaylistProgress(playlistID);
                        }
                        return <>
                            {index !== 0 && <h4 key={`heading${id}`}>{broken ? '' : 'Next in '}{name}</h4>}
                            <DragDrop
                                key={id}
                                setRef={refs}
                                isPlayer={checklistEnabled}
                                currentFormat={currentFormat}
                                list={list}
                                playingPlaylist={true}
                                layers={true}
                                currentDateActive={activeDate}
                                editDataFromPlaylist={(data, play = true) => editDataFromPlaylist(data, key, play)}
                                oldItemsMap={{ ...itemVisitedMap, ...checkedItems }}
                                checkListData={checkedItems}
                                setList={(newList) => {
                                    const listLatest = [...newList];
                                    if (typeof newList === 'function') {
                                        listLatest = newList(list);
                                    }
                                    setPlaylists(prev => ({
                                        ...prev,
                                        [key]: { name, list: listLatest }
                                    }));
                                    // setList((prev) => {
                                    //     const item = prev[currIndex.index];
                                    //     return [...oldList, item, ...listLatest]
                                    // });
                                }}
                                activeItemID={key == currIndex.key ? currentItemID : 0}
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
                (!checklistEnabled) && <div
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
                                globalThis.IS_PLAYLIST_ACTIVE = false;
                                globalThis.SetSplitAppPanel2(null);
                                // thisBot.showInfo(`History Mode`);
                            }} >
                            <span class="material-symbols-outlined unfollow" style={ButtonStyle}>
                                stop
                            </span>
                        </Button>
                    </div>
                    }
                    <div style={{
                        background: "white",
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        boxShadow: '0px 0px 9px 0px #00000026',
                        padding: '10px',
                        borderRadius: '8px'
                    }}>
                        {!!videoSrc &&
                            <VideoPlayer videoSrc={videoSrc} playlistItem={currentItem} />
                        }
                        {!!mediaURL && <AudioPlayer mediaURL={mediaURL} />}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                gap: '0.5rem',
                                width: "calc(100%)",
                            }}
                        >
                            <div style={{ width: '50%', flexDirection: 'column', display: 'flex' }}>
                                {nextItemName?.content ? <p style={{
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    display: "flex",
                                    alignItems: 'center',
                                    marginBottom: '0.5rem',
                                    fontFamily: 'DM Mono'
                                }}>
                                    Playing Next
                                </p> : null}
                                <div style={{ gap: '0.5rem', }} className="align-center">
                                    <div style={{ height: '2.5rem', width: '2.5rem', display: 'grid', placeItems: 'center', backgroundColor: '#D3643329', borderRadius: '0.25rem' }} >
                                        <span style={{ margin: '0', fontSize: '18px' }} class="material-symbols-outlined unfollow">
                                            {nextItemName?.type === 'attachment-link' ? 'media_link' : 'description'}
                                        </span>
                                    </div>
                                    <div>
                                        {nextItemName?.content ? < p style={{
                                            fontSize: '1rem',
                                            fontWeight: '600',
                                            display: "flex",
                                            alignItems: 'center',
                                            fontFamily: 'DM Sans'
                                        }}>
                                            {nextItemName?.content ? `${nextItemName?.content}${nextItemName?.prefix}`.substring(0, 16) : ""}{`${nextItemName?.content}${nextItemName?.prefix}`.length > 16 ? '...' : ""}
                                        </p> : null}
                                        <p
                                            style={{
                                                color: "green",
                                                fontSize: "12px",
                                                fontWeight: "900",
                                                fontFamily: 'DM Sans'
                                            }}
                                        >{nextItemName?.content ? "" : " (Playlist Ended)"}</p>
                                        {!globalThis.ValidTypes[nextItemName?.type] && <p style={{ fontSize: '12px', fontWeight: '400', color: '#0000001', textTransform: "capitalize" }}>{nextItemName?.type}</p>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex align-center" style={{ gap: '0.5rem' }}>
                                <p style={{ margin: '0', width: '36px', backgroundColor: '#D364334D', border: '1px solid #D36433' }} className="playlist-action small" onClick={toggleHide}>
                                    <img
                                        src="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/fe3ea1784fbed6a33fb06bc8885bca18211293462adcb06311db83f1450589b8.svg"
                                        class="material-symbols-outlined unfollow" style={{
                                            margin: '0',
                                            width: '12px'
                                        }}
                                    />

                                    {false && <span>
                                        {checklistEnabled ? "Player" : "Queue"}
                                    </span>}
                                </p>
                                <p
                                    onClick={() => {
                                        setOpenAttachLink(true);
                                    }}
                                    style={{ margin: '0', width: 'max-content' }}
                                    className="playlist-action small"
                                >
                                    <span style={{ margin: '0' }} class="material-symbols-outlined unfollow">
                                        add
                                    </span>
                                </p>
                            </div>
                        </div>

                        <p style={{ height: '1px', backgroundColor: '#000000', opacity: '0.1', width: '100%', margin: '0.5rem 0' }} />

                        <div style={{ display: 'flex', width: '100%', justifyContent: "space-between", alignItems: 'center' }}>

                            <Button
                                style={{
                                    fontSize: '12px',
                                    margin: '0',
                                    minWidth: 'auto',
                                    backgroundColor: '#F8E6DE',
                                    border: '1px solid #D36433',
                                    color: '#4459F3',
                                    padding: '8px',
                                    fontSize: '12px'
                                }}
                                onClick={() => {
                                    if (!prevItemName?.content) return;
                                    DataManager.cancelCurrentPlayingSound();
                                    handleOnButtonPress(-1);
                                }}
                            >
                                <span class="material-symbols-outlined unfollow">
                                    skip_previous
                                </span>
                            </Button>
                            <p
                                onClick={() => {
                                    DataManager.cancelCurrentPlayingSound();
                                    globalThis.SetSelected && SetSelected({});
                                    globalThis.SetHolded && SetHolded({});
                                    // globalThis.SetPlayingPlaylist && globalThis.SetPlayingPlaylist(false);
                                    globalThis[`${parentId}ToggleGreyCheckPLayingPlaylist`] && globalThis[`${parentId}ToggleGreyCheckPLayingPlaylist`](null);
                                    globalThis.IsQueuePresent = false;
                                    // os.unregisterApp("playing-playlist");
                                    globalThis.IS_PLAYLIST_ACTIVE = false;
                                    globalThis.SetSplitAppPanel2(null);
                                    // thisBot.showInfo(`History Mode`);
                                }}
                                style={{ margin: '0', width: '2.55rem', height: '2.55rem', borderRadius: '50%', border: 'none' }}
                                className="playlist-action small"
                            >
                                <span style={{ margin: '0', fontSize: '14px', backgroundColor: '#D36433' }} class="material-symbols-outlined unfollow">
                                    stop
                                </span>
                            </p>
                            <Button
                                style={{
                                    fontSize: '12px',
                                    margin: '0',
                                    minWidth: 'auto',
                                    backgroundColor: '#F8E6DE',
                                    border: '1px solid #D36433',
                                    color: '#4459F3',
                                    padding: '8px',
                                    fontSize: '12px'
                                }}
                                onClick={() => {
                                    DataManager.cancelCurrentPlayingSound();
                                    if (!!nextItemName?.content) {
                                        handleOnButtonPress(1);
                                        return;
                                    }
                                    // globalThis.SetPlayingPlaylist && globalThis.SetPlayingPlaylist(false);
                                    globalThis[`${parentId}ToggleGreyCheckPLayingPlaylist`] && globalThis[`${parentId}ToggleGreyCheckPLayingPlaylist`](null);
                                    globalThis.IsQueuePresent = false;
                                    globalThis.IS_PLAYLIST_ACTIVE = false;
                                    globalThis.SetSplitAppPanel2(null);
                                    // os.unregisterApp("playing-playlist");
                                    // thisBot.showInfo(`History Mode`);
                                }}
                            >
                                <span class="material-symbols-outlined unfollow">
                                    {!!nextItemName?.content ? "skip_next " : "last_page"}
                                </span>
                            </Button>
                        </div>
                    </div>
                </div>
            }
        </div >
    </>
}


if (playlist && !globalThis.IsQueuePresent) {
    globalThis.IsQueuePresent = true;
    globalThis.SetSplitAppPanel2(<PlayingPlaylist />);
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
//         <div style={{
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