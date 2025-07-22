const { useState, useRef, useMemo } = os.appHooks;

const PlaylistRowItem = thisBot.PlaylistRowItem();
const AttachmentLinkItem = thisBot.AttachmentLinkItem();
const Linking = thisBot.LinkingItems();
const { Checkbox } = Components;

const isMobile = gridPortalBot.tags.pixelWidth < MOBILE_VIEWPORT_THRESHOLD;

// Replaced now with props toggleRemoved cause no need to show like this now use is to show active element
const toggle = 'null';

const DragDrop = ({ setRef = {}, selectedTags, playlistName, currentDateActive, clickPass, currentFormat, readingPlanEnabled, linkingMode, viewOnly, checkListData = {}, oldItemsMap = {}, parentId, list, isPlayer, playingPlaylist, activeItemList = {}, activeItemID, toggleRemoved, setList, editDataFromPlaylist, playListSubId, setPlaylistFromRow = () => { }, playListSubIndex = null, deleteFromList = () => { }, onClickItem = () => { }, onClick = () => { }, creatingPlaylist = false, color, icon, isCustomColor, description, isCustomIcon }) => {
    const [opendedList, setOpenedList] = useState("");

    const checklistEnabled = isPlayer;

    const toBeSetItems = useRef([]);
    const [dragOverSet, setDragoverSetMutate] = useState({
        position: "top",
        itemId: "null"
    });

    const setDragoverSet = (newState) => {
        if (newState.itemId !== dragOverSet.itemId) {
            setDragoverSetMutate(newState)
        }
    }

    const selectedCount = list.filter(ele => !!ele.readAlready);
    const unSelectedCount = list.length - selectedCount;

    const transformedHistory = useMemo(() => thisBot.groupVerse(list), [list, selectedCount, unSelectedCount]);

    const finalHistoryObject = useMemo(() => playingPlaylist ? thisBot.checkGreyOut(transformedHistory) : transformedHistory, [transformedHistory, toggle, playingPlaylist]);

    const [draggedItemID, setDraggedItemID] = useState(null);

    const handleDragStart = (index, pseudoID) => {
        toBeSetItems.current = list;
        const id = list[index].id;
        setDraggedItemID(pseudoID || id);
        // console.log('Drag Start:', { index, pseudoID, id });
    };

    const handleDragOver = (index, pseudoIndex = 1, pseudoID = null) => {
        if (!draggedItemID) return;

        let originalRespectiveIndex = index;

        let draggedItemIndex = list.findIndex(hist => hist.id === draggedItemID);

        let draggingGroupIndex;
        let draggingGroup;

        if (draggedItemIndex === -1) {

            draggingGroupIndex = finalHistoryObject.findIndex(hist => hist.id === draggedItemID);

            draggingGroup = finalHistoryObject[draggingGroupIndex];

            draggedItemIndex = draggingGroup.additionalInfo[0].originalIndex;

        }

        let draggedOverItem = list[index];

        if (pseudoID) {
            draggedOverItem = finalHistoryObject[index];
        }

        // console.log("DRAG OVER",{draggedOverItem});

        if (pseudoID) {
            originalRespectiveIndex = draggedOverItem.additionalInfo[0].originalIndex;
        }

        let dragItem = [list[draggedItemIndex]];
        let newIndex = (draggedItemIndex > originalRespectiveIndex) ? originalRespectiveIndex : originalRespectiveIndex + pseudoIndex - 1;


        // console.log("Drag Over:", { newIndex, draggedItemIndex,originalRespectiveIndex, pseudoIndex, index });

        let newItems = [];

        let filterAbleItems = {
            [draggedItemID]: true,
        };


        if (draggedItemID.startsWith(pseudoIndentifier)) {

            if (pseudoID === draggedItemID) {
                toBeSetItems.current = list;
                setDragoverSet({
                    itemId: "null",
                    position: originalRespectiveIndex > draggedItemIndex ? "Bottom" : "Top"
                });
                return;
            }

            draggingGroup?.additionalInfo?.forEach(ele => {
                filterAbleItems[ele.id] = true;
            });

            dragItem = draggingGroup?.additionalInfo || [];

            newIndex = originalRespectiveIndex > draggedItemIndex ? (newIndex - (dragItem.length - 1)) : newIndex;

        } else {
            // Ignore if the item is dragged over itself
            if (dragItem.id === draggedOverItem.id) {
                toBeSetItems.current = list;
                setDragoverSet({
                    itemId: "null",
                    position: originalRespectiveIndex > draggedItemIndex ? "Bottom" : "Top"
                });
                return;
            }
        }

        setDragoverSet({
            itemId: draggedOverItem.id,
            position: originalRespectiveIndex > draggedItemIndex ? "Bottom" : "Top"
        });


        // console.log("Drag Over Adjusted Index:", { newIndex });


        // Filter out the currently dragged item
        newItems = list.filter((hist) => !filterAbleItems[hist.id]);
        // Add the dragged item after the dragged over item
        newItems.splice(newIndex, 0, ...dragItem);

        toBeSetItems.current = newItems;

    };

    const handleDragEnd = () => {
        setDragoverSet({
            itemId: "null",
            position: "false"
        });
        toBeSetItems.current && setList(toBeSetItems.current);
        setDraggedItemID(null);
    };

    const { datesRepeat, datesInWrongOrder } = useMemo(() => {
        const datesRepeat = {}; // To track repeated dates with their IDs
        const datesInWrongOrder = {}; // To track dates that are out of order with their IDs

        const seenDates = new Map(); // To track seen dates and their IDs
        const dateObjects = finalHistoryObject.filter((obj) => obj.type === "date"); // Filter date objects

        for (let i = 0; i < dateObjects.length; i++) {
            const current = dateObjects[i];
            const currentDate = new Date(current.additionalInfo.date);

            // Check for repeated dates
            const dateKey = currentDate.getTime(); // Use time as a unique key
            if (seenDates.has(dateKey)) {
                const firstId = seenDates.get(dateKey); // Get the first occurrence ID
                datesRepeat[firstId] = datesRepeat[firstId] || [];
                datesRepeat[firstId].push(current.id); // Add the current ID to the list
                datesRepeat[current.id] = [firstId]; // Add the first occurrence ID to the current ID's list
            } else {
                seenDates.set(dateKey, current.id); // Store the date and its ID
            }

            // Check for wrong order
            if (i > 0) {
                const previousDate = new Date(dateObjects[i - 1].additionalInfo.date);
                if (previousDate > currentDate) {
                    const prevId = dateObjects[i - 1].id;
                    datesInWrongOrder[prevId] = datesInWrongOrder[prevId] || [];
                    datesInWrongOrder[prevId].push(current.id); // Link current ID to previous ID
                    datesInWrongOrder[current.id] = [prevId]; // Link previous ID to current ID
                }
            }
        }

        return { datesRepeat, datesInWrongOrder };
    }, [finalHistoryObject]);


    return <>
        {creatingPlaylist && Object.keys(datesRepeat).length > 0 && (
            <div className="mini-alert mini-alert-error">
                <span className="icon">🚨</span>
                <p>Please fix Repeating Dates.</p>
            </div>
        )}
        {creatingPlaylist && Object.keys(datesInWrongOrder).length > 0 && (
            <div className="mini-alert mini-alert-warning">
                <span className="icon">⚠️</span>
                <p>Plese fix dates in wrong order.</p>
            </div>
        )}

        {list.length === 0 && <h4 style={{ margin: "8px 0" }}>No Items Now.</h4>}
        {
            finalHistoryObject.map((data, index) => data.type?.includes("range")
                ?
                <PlaylistContentRenderer
                    linkingMode={linkingMode}
                    setRef={setRef}
                    playListSubId={playListSubId}
                    clickPass={clickPass}
                    playlistName={playlistName}
                    activeItemList={activeItemList}
                    activeItemID={activeItemID}
                    viewOnly={viewOnly}
                    playingPlaylist={playingPlaylist}
                    greyOut={data.greyOut}
                    onClick={onClick}
                    key={`${data.id}-${data.readAlready}`}
                    originalIndex={data.originalIndex}
                    checklistEnabled={checklistEnabled}
                    checkListData={checkListData}
                    dragOverSet={dragOverSet}
                    editDataFromPlaylist={editDataFromPlaylist}
                    creatingPlaylist={creatingPlaylist}
                    deleteFromList={deleteFromList}
                    index={index}
                    readingPlanEnabled={readingPlanEnabled}
                    handleDragStart={handleDragStart}
                    toggle={toggle || activeItemID}
                    oldItemsMap={oldItemsMap}
                    handleDragOver={handleDragOver}
                    onClickItem={onClickItem}
                    handleDragEnd={handleDragEnd} {...data}
                />
                :
                data.type === "playlist"
                    ?
                    <PlaylistRowItem
                        viewOnly={viewOnly}
                        toggle={toggle || activeItemID}
                        playingPlaylist={playingPlaylist}
                        activeItemList={activeItemList}
                        currentDateActive={currentDateActive}
                        activeItemID={activeItemID}
                        setRef={setRef}
                        currentFormat={currentFormat}
                        oldItemsMap={oldItemsMap}
                        checklistEnabled={checklistEnabled}
                        color={color}
                        icon={icon}
                        description={description}
                        isCustomColor={isCustomColor}
                        isCustomIcon={isCustomIcon}
                        checkListData={checkListData}
                        clickPass={clickPass}
                        handleDragEnd={handleDragEnd}
                        setOpenedList={setOpenedList}
                        readingPlanEnabled={readingPlanEnabled}
                        parentId={parentId}
                        attachment={data.attachment}
                        opendedList={opendedList}
                        handleDragStart={handleDragStart}
                        selectedTags={selectedTags}
                        dragOverSet={dragOverSet}
                        handleDragOver={handleDragOver}
                        playListIndex={data.originalIndex}
                        index={index}
                        list={data.list}
                        key={data.id}
                        id={data.id}
                        playListSubId={playListSubId}
                        creatingPlaylist={creatingPlaylist}
                        playListSubIndex={playListSubIndex}
                        playListSubIndex={playListSubIndex}
                        onClick={onClick}
                        name={data.name}
                        playlistParentName={playlistName}
                        setPlaylists={setPlaylistFromRow}
                    />
                    :
                    (data.type === "attachment-link" || data.type === "date")
                        ?
                        <AttachmentLinkItem
                            linkingMode={linkingMode}
                            viewOnly={viewOnly}
                            datesRepeat={datesRepeat}
                            datesInWrongOrder={datesInWrongOrder}
                            playlistName={playlistName}
                            currentFormat={currentFormat}
                            readingPlanEnabled={readingPlanEnabled}
                            oldItemsMap={oldItemsMap}
                            currentDateActive={currentDateActive}
                            originalIndex={data.originalIndex}
                            activeItemID={activeItemID}
                            clickPass={clickPass}
                            setRef={setRef}
                            activeItemList={activeItemList}
                            onClick={onClick}
                            playlistId={playListSubId}
                            onClickItem={onClickItem}
                            checklistEnabled={checklistEnabled}
                            checkListData={checkListData}
                            creatingPlaylist={creatingPlaylist}
                            index={index}
                            editDataFromPlaylist={editDataFromPlaylist}
                            handleDragStart={handleDragStart}
                            handleDragOver={handleDragOver}
                            toggle={toggle}
                            setList={setList}
                            handleDragEnd={handleDragEnd}
                            originalList={finalHistoryObject}
                            playListSubIndex={playListSubIndex}
                            deleteFromList={deleteFromList}
                            key={`${data.id}-${data.readAlready}`}
                            playingPlaylist={playingPlaylist}
                            data={data}
                        />
                        :
                        <div key={`${data.id}-${data.readAlready}`}
                            playingPlaylist={playingPlaylist}
                            draggable={!playingPlaylist && !viewOnly}
                            onDragStart={() => handleDragStart(data.originalIndex)}
                            onDragOver={() => handleDragOver(data.originalIndex)}
                            onDragEnd={handleDragEnd}
                            tabIndex={0}
                            // ref={(ref) => setRef.current[data.id] = ref}
                            style={{ display: "flex" }}
                            className={`history-item ${(data.greyOut || oldItemsMap[data.id]) && "greyed-out"} ${(toggle === data.id || activeItemList[data.id] || data.id === activeItemID) && "current-playing-item"} ${dragOverSet.itemId === data.id && `dropabble-${dragOverSet.position}`}`}
                            onPointerDown={() => {
                                if (!viewOnly) {
                                    globalThis.ADDING_TOPLAYLIST_TIMEOUT = setTimeout(() => {
                                        globalThis.ADDING_TOPLAYLIST_TIMEOUT = null;
                                        if (data.type !== "heading") onClickItem({ dataItem: data });
                                    }, 1000)
                                }
                            }}
                            onPointerUp={() => {
                                if (globalThis.ADDING_TOPLAYLIST_TIMEOUT) {
                                    clearInterval(globalThis.ADDING_TOPLAYLIST_TIMEOUT)
                                }
                            }}
                            onMouseLeave={() => {
                                if (globalThis.ADDING_TOPLAYLIST_TIMEOUT) clearInterval(globalThis.ADDING_TOPLAYLIST_TIMEOUT);
                            }}
                            onTouchEnd={() => {
                                if (globalThis.ADDING_TOPLAYLIST_TIMEOUT) clearInterval(globalThis.ADDING_TOPLAYLIST_TIMEOUT);
                            }}
                        >

                            <input
                                style={{ opacity: '0', 'pointer-events': 'none', position: 'absolute', 'left': 0, 'top': 0, zIndex: -1 }}
                                placeholder={'test'}
                                ref={(ref) => {
                                    if (setRef && setRef[data.id]) {
                                        setRef[data.id].current = ref
                                    }
                                }}
                            />

                            <div className="start-actions">

                                {data.type !== "heading" && checklistEnabled && !viewOnly ?
                                    <Checkbox
                                        small
                                        checked={checkListData[data.id] || data.readAlready}
                                        onClick={() => {
                                            editDataFromPlaylist(data.id, false);
                                        }}
                                    />
                                    :
                                    null
                                }

                                {false && <span class="material-symbols-outlined unfollow drag-item-icon">
                                    video_library
                                </span>}
                            </div>
                            <p
                                onPointerUp={() => {
                                    if (globalThis.ADDING_TOPLAYLIST_TIMEOUT) {
                                        clearInterval(globalThis.ADDING_TOPLAYLIST_TIMEOUT)
                                        if (!viewOnly && data.type !== "heading") {
                                            onClick({ dataItem: data, index });
                                            if (checklistEnabled) {
                                                editDataFromPlaylist(data.id);
                                            }
                                        }
                                    }
                                    if (clickPass && data.type !== "heading") {
                                        onClick({ dataItem: data, index });
                                        if (checklistEnabled) {
                                            editDataFromPlaylist(data.id);
                                        }
                                    }
                                }}
                                className={`playlist-item-type ${data.type !== "heading" && checklistEnabled && !viewOnly ? "" : 'no-left-padding'} playlist-item-${data.type}`}
                            >
                                {data.type === "headings" && <span class="material-symbols-outlined side-icon">
                                    format_h1 //Not NEEEDED FOR NOW
                                </span>}
                                {data.content}
                            </p>
                            <div className="actions">
                                {!playingPlaylist && creatingPlaylist && !viewOnly && <p className={`end-icon without-right-margin ${`${isMobile && "visible"} end-icon without-right-margin`}`} onClick={() => deleteFromList(data.originalIndex)} >
                                    <span class="material-symbols-outlined unfollow delete-icon">
                                        delete
                                    </span>
                                </p>}
                                <Linking linkingMode={linkingMode} data={data} playlistName={playlistName} playListId={playListSubId} />
                            </div>
                        </div>
            )
        }
    </>
}

const PlaylistContentRenderer = ({ setRef, originalIndex, clickPass, activeItemID, activeItemList, oldItemsMap, playListSubId, viewOnly, linkingMode, creatingPlaylist, checkListData, checklistEnabled, playlistName, editDataFromPlaylist, type, toggle, playingPlaylist, greyOut, content, id, additionalInfo, handleDragStart, handleDragOver, handleDragEnd, index, onClickItem, onClick, deleteFromList, dragOverSet }) => {
    const [open, setOpen] = useState(false);
    const dragged = useRef(false);

    const isChecked = additionalInfo.every(ele => ele.readAlready || checkListData[ele.id]);
    const isGreyout = additionalInfo.every(ele => oldItemsMap[ele.id]);
    const isActive = additionalInfo.some(ele => ele.id === activeItemID || activeItemList[ele.id]);
    const allIds = additionalInfo.map(ele => ele.id);

    const extraClasses = `${(toggle === id || activeItemID === id || activeItemList[id] || isActive) && "current-playing-item"} ${(greyOut || oldItemsMap[id] || isGreyout) && "greyed-out"} ${dragOverSet.itemId === id && `dropabble-${dragOverSet.position}`}`;

    return <div>
        <div
            draggable={!playingPlaylist && !viewOnly}
            tabIndex={0}
            className={`history-item ${extraClasses}`}
            onPointerDown={() => {
                if (!viewOnly) {
                    globalThis.ADDING_TOPLAYLIST_TIMEOUT = setTimeout(() => {
                        globalThis.ADDING_TOPLAYLIST_TIMEOUT = null;
                        onClickItem({ dataItem: additionalInfo, bulkAdd: true })
                    }, 1000);
                }
            }}
            onPointerUp={() => {
                if (dragged.current) {
                    dragged.current = false;
                }
                if (globalThis.ADDING_TOPLAYLIST_TIMEOUT) {
                    clearInterval(globalThis.ADDING_TOPLAYLIST_TIMEOUT)
                    globalThis.ADDING_TOPLAYLIST_TIMEOUT = null;
                }
            }}
            onMouseLeave={() => {
                if (globalThis.ADDING_TOPLAYLIST_TIMEOUT) clearInterval(globalThis.ADDING_TOPLAYLIST_TIMEOUT);
            }}
            onTouchEnd={() => {
                if (globalThis.ADDING_TOPLAYLIST_TIMEOUT) clearInterval(globalThis.ADDING_TOPLAYLIST_TIMEOUT);
            }}
            onDragStart={() => {
                dragged.current = true;
                handleDragStart(index, id);
            }}
            onDragOver={() => handleDragOver(index, additionalInfo.length, id)}
            onDragEnd={handleDragEnd}
        >
            <input
                style={{ opacity: '0', 'pointer-events': 'none', position: 'absolute', 'left': 0, 'top': 0, zIndex: -1 }}
                placeholder={'test'}
                ref={(ref) => {
                    if (setRef && setRef[id]) {
                        setRef[id].current = ref
                    }
                }}
            />
            <div className="start-actions">
                {checklistEnabled && !viewOnly ?
                    <Checkbox
                        checked={isChecked}
                        small
                        onClick={() => {
                            editDataFromPlaylist(allIds, false);
                        }}
                    />
                    :
                    null}
                {false && <span class="material-symbols-outlined unfollow drag-item-icon">
                    table_view
                </span>}
            </div>

            {additionalInfo.map((data) => <input
                style={{ opacity: '0', 'pointer-events': 'none', position: 'absolute', 'left': 0, 'top': 0, zIndex: -1 }}
                placeholder={'test'}
                ref={(ref) => {
                    if (setRef && setRef[data.id]) {
                        setRef[data.id].current = ref
                    }
                }}
            />)}


            <p
                onPointerUp={() => {
                    if (dragged.current) {
                        dragged.current = false;
                    }
                    if (globalThis.ADDING_TOPLAYLIST_TIMEOUT && !viewOnly) {
                        clearInterval(globalThis.ADDING_TOPLAYLIST_TIMEOUT)
                        globalThis.ADDING_TOPLAYLIST_TIMEOUT = null;
                        onClick({ dataItem: additionalInfo, bulkAdd: true, index });
                        if (checklistEnabled) {
                            editDataFromPlaylist(allIds);
                        }
                    }
                    if (clickPass) {
                        globalThis.ADDING_TOPLAYLIST_TIMEOUT = null;
                        onClick({ dataItem: additionalInfo, bulkAdd: true, index });
                        if (checklistEnabled) {
                            editDataFromPlaylist(allIds);
                        }
                    }
                }}
                className={`playlist-item-type ${checklistEnabled && !viewOnly ? '' : 'no-left-padding'} playlist-item-${type}`}
            >
                {content}
            </p>
            <div className="actions">
                {!playingPlaylist && creatingPlaylist && !viewOnly &&
                    <p className="without-right-margin end-icon">
                        <span onClick={() => {
                            deleteFromList(additionalInfo.map(data => data.id));
                        }} class="material-symbols-outlined unfollow delete-icon">
                            delete
                        </span>
                    </p>
                }
                <p className="without-right-margin end-icon visible">
                    <span onClick={() => {
                        if (!dragged.current) {
                            setOpen(p => !p);
                        }
                    }} class="material-symbols-outlined unfollow " style={{ fontSize: '1.2rem' }}>
                        {open ? "collapse_content" : "expand_content"}
                    </span>
                </p>
            </div>
        </div>
        <div style={{ height: open ? "auto" : '0', transition: "all 0.2s linear", overflow: 'hidden', padding: "0 8px" }}>
            {additionalInfo.map((data) => {
                return <div
                    key={`${data.id}-${data.readAlready}`}
                    draggable={!playingPlaylist}
                    onDragStart={() => { if (open) handleDragStart(data.originalIndex) }}
                    tabIndex={0}
                    // ref={ref => setRef.current[data.id] = ref}
                    onDragOver={() => {
                        if (open) {
                            handleDragOver(data.originalIndex);
                        }
                    }}
                    onDragEnd={() => { if (open) handleDragEnd(); }}
                    className={`history-item ${(oldItemsMap[data.id]) && "greyed-out"} ${(toggle === data.id || activeItemList[data.id] || activeItemID === data.id) && "current-playing-item"} ${dragOverSet.itemId === data.id && `dropabble-${dragOverSet.position}`}`}
                    onPointerDown={() => {
                        if (!viewOnly) {
                            globalThis.ADDING_TOPLAYLIST_TIMEOUT = setTimeout(() => {
                                globalThis.ADDING_TOPLAYLIST_TIMEOUT = null;
                                if (data.type !== "heading") onClickItem({ dataItem: data })
                            }, 1000);
                        }
                    }}
                    onPointerUp={() => {
                        if (globalThis.ADDING_TOPLAYLIST_TIMEOUT) {
                            clearInterval(globalThis.ADDING_TOPLAYLIST_TIMEOUT)
                        };
                    }}
                    onMouseLeave={() => {
                        if (globalThis.ADDING_TOPLAYLIST_TIMEOUT) clearInterval(globalThis.ADDING_TOPLAYLIST_TIMEOUT);
                    }}
                    onTouchEnd={() => {
                        if (globalThis.ADDING_TOPLAYLIST_TIMEOUT) clearInterval(globalThis.ADDING_TOPLAYLIST_TIMEOUT);
                    }}
                >
                    <div className="start-actions">
                        {data.type !== "heading" && checklistEnabled && open && !viewOnly ?
                            <Checkbox
                                small
                                checked={checkListData[data.id] || data.readAlready}
                                onClick={() => {
                                    editDataFromPlaylist(data.id, false);
                                }}
                            />
                            :
                            null
                        }
                        {false && <span class="material-symbols-outlined unfollow drag-item-icon">
                            featured_play_list
                        </span>}
                    </div>
                    <p
                        onPointerUp={() => {
                            if (globalThis.ADDING_TOPLAYLIST_TIMEOUT && !viewOnly) {
                                clearInterval(globalThis.ADDING_TOPLAYLIST_TIMEOUT)
                                if (data.type !== "heading") {
                                    if (checklistEnabled) {
                                        editDataFromPlaylist(data.id);
                                    }
                                    onClick({ dataItem: data, index });
                                }
                            };
                        }}
                        className={`playlist-item-type ${(data.type !== "heading" && checklistEnabled && open && !viewOnly) ? "" : 'no-left-padding'} playlist-item-${data.type}`}
                    >
                        {data.type === "headings" && <span class="material-symbols-outlined side-icon">
                            format_h1 //Not NEEEDED FOR NOW
                        </span>}
                        {data.content}
                    </p>
                    <div className="actions">
                        {!playingPlaylist && creatingPlaylist && open && !viewOnly && <p className={`end-icon without-right-margin ${`${isMobile && "visible"} end-icon without-right-margin`}`} onClick={() => deleteFromList(data.originalIndex)} >
                            <span class="material-symbols-outlined unfollow delete-icon">
                                delete
                            </span>
                        </p>}


                        {open && <Linking linkingMode={linkingMode} playListId={playListSubId} playlistName={playlistName} data={data} />}
                    </div>
                </div>
            })}
        </div>
    </div >;
}


return DragDrop;