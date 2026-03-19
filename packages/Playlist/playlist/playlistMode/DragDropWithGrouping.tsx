const { useState, useRef, useMemo, useLayoutEffect } = os.appHooks;
const G = globalThis as any;

const PlaylistRowItem = await thisBot.PlaylistRowItem();
const AttachmentLinkItem = await thisBot.AttachmentLinkItem();
const AttachLink = await thisBot.AttachLink();
const Linking = await thisBot.LinkingItems();
const RenderHTMLContent = await thisBot.RenderHTMLContent();

const { Checkbox } = G.Components;

const isMobile =
  (window?.innerWidth || gridPortalBot.tags.pixelWidth) <
  G.MOBILE_VIEWPORT_THRESHOLD;

// Replaced now with props toggleRemoved cause no need to show like this now use is to show active element
const toggle = "null";

const DragDrop = (props: any) => {
  const {
    massAdd,
    attachLink,
    onGenClick = () => {},
    setItemSelected = () => {},
    itemSelected,
    access,
    isSomethingEmbededChecked,
    checkListEmbeded,
    setChecklistEmbeded,
    onDisembed = () => {},
    layers = true,
    embedding,
    setEmbedding = () => {},
    setRef = {},
    allowHeadingCheck,
    selectedTags,
    playlistName,
    currentDateActive,
    clickPass,
    currentFormat,
    readingPlanEnabled,
    linkingMode,
    viewOnly,
    checkListData = {},
    oldItemsMap = {},
    parentId,
    list,
    isPlayer,
    playingPlaylist,
    activeItemList = {},
    activeItemID,
    toggleRemoved,
    setList,
    editDataFromPlaylist,
    playListSubId,
    setPlaylistFromRow = () => {},
    playListSubIndex = null,
    deleteFromList = () => {},
    onClickItem = () => {},
    onClick,
    creatingPlaylist = false,
    color,
    icon,
    isCustomColor,
    description,
    isCustomIcon,
    onSelectPlaylist = null,
  } = props;

  const [opendedList, setOpenedList] = useState("");

  const checklistEnabled = isPlayer || embedding;

  const toBeSetItems = useRef<any[]>([]);
  const [dragOverSet, setDragoverSetMutate] = useState({
    position: "top",
    itemId: "null",
  });

  const setDragoverSet = (newState: any) => {
    if (
      newState.itemId !== dragOverSet.itemId ||
      newState.position !== dragOverSet.position
    ) {
      if (G[`${newState.itemId}OpenToggle`]) {
        G[`${newState.itemId}OpenToggle`](true);
      }
      setDragoverSetMutate(newState);
    }
  };

  const selectedCount = list.filter((ele: any) => !!ele.readAlready);
  const unSelectedCount = list.length - selectedCount;

  const transformedHistory = useMemo(
    () => (layers ? thisBot.groupVerse(list) : thisBot.groupVerse(list)),
    [list, selectedCount, unSelectedCount]
  );

  // const transformedHistory = useMemo(() => playingPlaylist ? thisBot.checkGreyOut(transformedHistory) : transformedHistory, [transformedHistory, toggle, playingPlaylist]);

  const [draggedItemID, setDraggedItemID] = useState(null);

  const [draggedParent, setDraggedItemParent] = useState<string | null>(null);

  const handleDragStart = (index: number, pId?: string) => {
    toBeSetItems.current = transformedHistory;
    if (pId) {
      setDraggedItemParent(pId);
      const pIndex = transformedHistory.findIndex((ele: any) => ele.id === pId);
      const itemId =
        transformedHistory[pIndex].additionalInfo.layers[index]?.id;
      setDraggedItemID(itemId);
    } else {
      const id = transformedHistory[index].id;
      setDraggedItemID(id);
    }
    // console.log('Drag Start:', { index, pseudoID, id });
  };

  const handleDragOver = (
    index: number,
    pseudoIndex: number | null = 1,
    pseudoID?: string | null,
    event?: any
  ) => {
    event.preventDefault(); // Needed to allow drop

    const rect = event.currentTarget.getBoundingClientRect();
    const mouseY = event.clientY;
    // const mouseX = event.clientX;

    const middleVertical = rect.top + rect.height / 2;
    // const middleHorizontal = rect.left + rect.width / 2;

    const distanceThreshold = 10; // pixels around the center

    const isNearCenter = Math.abs(mouseY - middleVertical) < distanceThreshold;

    if (!draggedItemID) return;

    let originalRespectiveIndex = index;

    let draggedItemIndex = transformedHistory.findIndex(
      (hist: any) => hist.id === draggedItemID
    );
    let parentIdx = transformedHistory.findIndex(
      (ele: any) => ele.id === draggedParent
    );

    let dragItem: any = [transformedHistory[draggedItemIndex]];

    if (draggedItemIndex === -1 && parentIdx > -1) {
      draggedItemIndex = transformedHistory[
        parentIdx
      ].additionalInfo.layers?.findIndex(
        (hist: any) => hist.id === draggedItemID
      );
      dragItem = [
        transformedHistory[parentIdx].additionalInfo.layers[draggedItemIndex],
      ];
    }

    let draggedOverItem = transformedHistory[index];

    if (pseudoID) {
      const parentIndexDragOver = transformedHistory.findIndex(
        (ele: any) => ele.id === pseudoID
      );
      draggedOverItem =
        transformedHistory[parentIndexDragOver].additionalInfo.layers[index];
    }

    let newIndex = originalRespectiveIndex;

    // console.log("Drag Over:", { newIndex, draggedItemIndex,originalRespectiveIndex, pseudoIndex, index });

    let newItems: any[] = [];

    let filterAbleItems = {
      [draggedItemID]: true,
    };

    // Ignore if the item is dragged over itself
    if (dragItem.id === draggedOverItem.id) {
      toBeSetItems.current = list;
      setDragoverSet({
        itemId: null,
        position: originalRespectiveIndex > draggedItemIndex ? "Bottom" : "Top",
      });
      return;
    }

    if (dragItem.id !== draggedOverItem.id) {
      setDragoverSet({
        itemId: draggedOverItem.id,
        position:
          isNearCenter && !pseudoID
            ? "Embed"
            : originalRespectiveIndex > draggedItemIndex
              ? "Bottom"
              : "Top",
      });
    }

    // Filter out the currently dragged item
    newItems = [
      ...transformedHistory.filter((hist: any) => !filterAbleItems[hist.id]),
    ];
    newItems = JSON.parse(JSON.stringify(newItems));
    if (parentIdx > -1) {
      newItems[parentIdx].additionalInfo.layers = [
        ...newItems[parentIdx].additionalInfo.layers.filter(
          (hist: any) => !filterAbleItems[hist.id]
        ),
      ];
    }
    if (pseudoID && pseudoIndex !== null) {
      newItems[pseudoIndex].additionalInfo.layers.splice(
        newIndex,
        0,
        ...dragItem
      );
    } else if (isNearCenter) {
      const indexForNew = newItems.findIndex(
        (ele: any) => ele.id === draggedOverItem.id
      );
      // Add the dragged item after the dragged over item
      if (indexForNew > -1) {
        if (!newItems[indexForNew].additionalInfo.layers) {
          newItems[indexForNew].additionalInfo.layers = [];
        }
        newItems[indexForNew].additionalInfo.layers = [
          ...newItems[indexForNew].additionalInfo.layers,
          ...dragItem,
        ];
      }
    } else {
      // Add the dragged item after the dragged over item
      newItems.splice(newIndex, 0, ...dragItem);
    }

    toBeSetItems.current = newItems;
  };

  const handleDragEnd = () => {
    const dragOverItem = transformedHistory.find(
      (ele: any) => ele.id === dragOverSet.itemId
    );

    setDragoverSet({
      itemId: null,
      position: "false",
    });
    setDraggedItemID(null);
    setDraggedItemParent(null);
    if (dragOverSet.position === "Embed") {
      let draggedItemIndex = transformedHistory.findIndex(
        (hist: any) => hist.id === draggedItemID
      );

      let dragItem = transformedHistory[draggedItemIndex];

      let parentIdx = transformedHistory.findIndex(
        (ele: any) => ele.id === draggedParent
      );

      if (draggedItemIndex === -1 && parentIdx > -1) {
        draggedItemIndex = transformedHistory[
          parentIdx
        ].additionalInfo.layers?.findIndex(
          (hist: any) => hist.id === draggedItemID
        );
        dragItem =
          transformedHistory[parentIdx].additionalInfo.layers[draggedItemIndex];
      }

      if (
        dragOverItem?.type === "attachment-link" ||
        dragOverItem?.type === "heading"
      ) {
        ShowNotification({
          message: t("youCannotEmbedItemsIntoAttachmentItem"),
          severity: "error",
        });
        return;
      }

      if (dragItem.additionalInfo.layers?.length) {
        ShowNotification({
          message: t("cannotEmbedEmbeddedItem"),
          severity: "error",
        });
        return;
      }
    }
    toBeSetItems.current && setList(toBeSetItems.current);
  };

  const autoPlayToggle = (index: number, pId: string, id: string) => {
    setList((prev: any) => {
      const old = [...prev];
      const pIndex = old.findIndex((ele) => ele.id === pId);
      if (pIndex > -1) {
        const attachmentIndex = old[pIndex]?.additionalInfo?.layers?.findIndex(
          (ele: any) => ele.id === id
        );
        if (attachmentIndex === 0) {
          old[pIndex].additionalInfo.layers[0].autoPlay =
            !old[pIndex].additionalInfo.layers[0].autoPlay;
        }
      }
      return old;
    });
  };

  const { datesRepeat, datesInWrongOrder } = useMemo(() => {
    const datesRepeat: any = {}; // To track repeated dates with their IDs
    const datesInWrongOrder: any = {}; // To track dates that are out of order with their IDs

    const seenDates = new Map(); // To track seen dates and their IDs
    const dateObjects = transformedHistory.filter(
      (obj: any) => obj.type === "date"
    ); // Filter date objects

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
  }, [transformedHistory]);

  return (
    <>
      {creatingPlaylist && Object.keys(datesRepeat).length > 0 && (
        <div className="mini-alert mini-alert-error">
          <span className="icon">🚨</span>
          <p>{t("pleaseFixRepeatingDates")}</p>
        </div>
      )}
      {creatingPlaylist && Object.keys(datesInWrongOrder).length > 0 && (
        <div className="mini-alert mini-alert-warning">
          <span className="icon">⚠️</span>
          <p>{t("pleaseFixDatesInWrongOrder")}</p>
        </div>
      )}

      {list.length === 0 && (
        <div className="no-items-box">
          <h4 style={{ margin: "8px 0" }}>{t("addItemsBelow")}</h4>
          {DEV_ENV && (
            <>
              <p className="or" />
              <p onClick={onGenClick}>{t("clickHereToGeneratePlaylist")}</p>
            </>
          )}
        </div>
      )}
      {transformedHistory.map((data: any, index: number) =>
        data.type?.includes("range") ||
        (data.additionalInfo?.layers?.length > 0 && layers) ? (
          <PlaylistContentRenderer
            linkingMode={linkingMode}
            isAdditionalInfo={
              data.type?.includes("range") &&
              !data.additionalInfo?.layers?.length
            }
            embedding={embedding}
            itemSelected={itemSelected}
            setItemSelected={setItemSelected}
            attachLink={attachLink}
            massAdd={massAdd}
            draggedItemID={draggedItemID}
            setRef={setRef}
            datesRepeat={datesRepeat}
            clickPass={clickPass}
            datesInWrongOrder={datesInWrongOrder}
            currentFormat={currentFormat}
            currentDateActive={currentDateActive}
            setList={setList}
            transformedHistory={transformedHistory}
            playListSubIndex={playListSubIndex}
            setEmbedding={setEmbedding}
            data={data}
            checkListEmbeded={checkListEmbeded}
            setChecklistEmbeded={setChecklistEmbeded}
            playListSubId={playListSubId}
            isSomethingEmbededChecked={isSomethingEmbededChecked}
            onDisembed={onDisembed}
            layers={layers}
            playlistName={playlistName}
            activeItemList={activeItemList}
            activeItemID={activeItemID}
            viewOnly={viewOnly}
            playingPlaylist={playingPlaylist}
            greyOut={data.greyOut}
            onClick={onClick}
            key={`${data.id}-${data.readAlready}`}
            originalIndex={index}
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
            autoPlayToggle={autoPlayToggle}
            handleDragOver={handleDragOver}
            onClickItem={onClickItem}
            handleDragEnd={handleDragEnd}
            {...data}
          />
        ) : data.type === "playlist" ? (
          <PlaylistRowItem
            access={access}
            viewOnly={viewOnly}
            toggle={toggle || activeItemID}
            playingPlaylist={playingPlaylist}
            activeItemList={activeItemList}
            layers={layers}
            currentDateActive={currentDateActive}
            activeItemID={activeItemID}
            setRef={setRef}
            currentFormat={currentFormat}
            oldItemsMap={oldItemsMap}
            checklistEnabled={checklistEnabled}
            color={color}
            isSomethingEmbededChecked={isSomethingEmbededChecked}
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
            playListIndex={index}
            index={index}
            list={data.list}
            key={data.id}
            id={data.id}
            playListSubId={playListSubId}
            creatingPlaylist={creatingPlaylist}
            playListSubIndex={playListSubIndex}
            onClick={onClick}
            name={data.name}
            playlistParentName={playlistName}
            setPlaylists={setPlaylistFromRow}
          />
        ) : data.type === "attachment-link" || data.type === "date" ? (
          <AttachmentLinkItem
            linkingMode={linkingMode}
            viewOnly={viewOnly}
            isSomethingEmbededChecked={isSomethingEmbededChecked}
            datesRepeat={datesRepeat}
            datesInWrongOrder={datesInWrongOrder}
            embedding={embedding}
            playlistName={playlistName}
            currentFormat={currentFormat}
            readingPlanEnabled={readingPlanEnabled}
            autoPlayToggle={autoPlayToggle}
            layers={layers}
            dragOverSet={dragOverSet}
            oldItemsMap={oldItemsMap}
            currentDateActive={currentDateActive}
            originalIndex={null}
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
            originalList={transformedHistory}
            playListSubIndex={playListSubIndex}
            deleteFromList={deleteFromList}
            key={`${data.id}-${data.readAlready}`}
            playingPlaylist={playingPlaylist}
            data={data}
          />
        ) : (
          <>
            <div
              key={`${data.id}-${data.readAlready}`}
              draggable={!playingPlaylist && !viewOnly}
              onMouseDown={(e) => e.stopPropagation()} // block parent drag
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(index, null, null, e)}
              onDragEnd={handleDragEnd}
              tabIndex={0}
              // ref={(ref) => setRef.current[data.id] = ref}
              style={{ display: "flex" }}
              className={`history-item ${embedding === data.id ? "embedding-on" : ""} ${(data.greyOut || oldItemsMap[data.id]) && "greyed-out"} ${(toggle === data.id || activeItemList[data.id] || data.id === activeItemID) && "current-playing-item"} ${dragOverSet.itemId === data.id && `dropabble-${dragOverSet.position}`}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!viewOnly) {
                  if (data.type === "heading" && !embedding) {
                    // ShowNotification({ message: `Headings & Media cannot be embeded!`, severity: "error" });
                  } else {
                    const isMultiFunctionHold = CheckMultiFuntionHold();

                    if (!isMultiFunctionHold && !checklistEnabled)
                      setItemSelected((prev: any) =>
                        prev === data.id ? null : data.id
                      );
                  }
                }
                if (!viewOnly) {
                  G.ADDING_TOPLAYLIST_TIMEOUT = setTimeout(() => {
                    G.ADDING_TOPLAYLIST_TIMEOUT = null;
                    if (data.type !== "heading")
                      onClickItem({ dataItem: data });
                  }, 1000);
                }
              }}
              onPointerUp={() => {
                if (G.ADDING_TOPLAYLIST_TIMEOUT) {
                  clearInterval(G.ADDING_TOPLAYLIST_TIMEOUT);
                }
              }}
              onMouseLeave={() => {
                if (G.ADDING_TOPLAYLIST_TIMEOUT)
                  clearInterval(G.ADDING_TOPLAYLIST_TIMEOUT);
              }}
              onTouchEnd={() => {
                if (G.ADDING_TOPLAYLIST_TIMEOUT)
                  clearInterval(G.ADDING_TOPLAYLIST_TIMEOUT);
              }}
            >
              <input
                style={{
                  opacity: "0",
                  "pointer-events": "none",
                  position: "absolute",
                  left: 0,
                  top: 0,
                  zIndex: -1,
                }}
                placeholder={"test"}
                ref={(ref) => {
                  if (setRef && setRef[data.id]) {
                    setRef[data.id].current = ref;
                  }
                }}
              />

              <div className="start-actions">
                {(data.type !== "heading" || allowHeadingCheck) &&
                checklistEnabled &&
                !viewOnly ? (
                  <Checkbox
                    small
                    // disabled={embedding === data.id || isSomethingEmbededChecked}
                    disabled={embedding === data.id}
                    checked={
                      checkListData[data.id] ||
                      data.readAlready ||
                      embedding === data.id
                    }
                    onClick={() => {
                      const isShiftHold = G?.KEY_HOLD?.["shift"];
                      if (isShiftHold) {
                        let upperLimit = Math.max(index, G.LAST_CLICK_ID);
                        let lowerLimit = Math.min(index, G.LAST_CLICK_ID);
                        const idsFilter = transformedHistory
                          .filter(
                            (el: any, indexInner: number) =>
                              indexInner <= upperLimit &&
                              indexInner >= lowerLimit &&
                              indexInner !== G.LAST_CLICK_ID &&
                              el.id !== embedding
                          )
                          .map((ele: any) => ele.id);
                        editDataFromPlaylist(idsFilter, false);
                        G.LAST_CLICK_ID = index;
                        return;
                      } else {
                        G.LAST_CLICK_ID = index;
                      }

                      if (!embedding && layers && !playingPlaylist) {
                        if (G.KEY_HOLD?.["control"] || G.KEY_HOLD?.["meta"]) {
                          setEmbedding(data.id);
                          return;
                        }
                      }
                      editDataFromPlaylist(data.id, false);
                    }}
                  />
                ) : null}

                {false && (
                  <span class="material-symbols-outlined unfollow drag-item-icon">
                    video_library
                  </span>
                )}
              </div>
              <p
                onClick={() => {
                  if (G.ADDING_TOPLAYLIST_TIMEOUT) {
                    clearInterval(G.ADDING_TOPLAYLIST_TIMEOUT);
                    if (
                      !viewOnly &&
                      (data.type !== "heading" || allowHeadingCheck)
                    ) {
                      onClick({ dataItem: data, index });
                      if (checklistEnabled) {
                        editDataFromPlaylist(data.id);
                      }
                    }
                  }
                  if (
                    clickPass &&
                    (data.type !== "heading" || allowHeadingCheck)
                  ) {
                    onClick({ dataItem: data, index });
                    if (checklistEnabled) {
                      editDataFromPlaylist(data.id);
                    }
                  }
                }}
                style={{
                  border: data.id === itemSelected ? "1px solid #D36433" : "",
                  backgroundColor: data.id === itemSelected ? "#D364334D" : "",
                }}
                className={`playlist-item-type ${(data.type !== "heading" || allowHeadingCheck) && checklistEnabled && !viewOnly ? "" : "no-left-padding"} playlist-item-${data.type}`}
              >
                {data.type === "headings" && (
                  <span class="material-symbols-outlined side-icon">
                    format_h1 //Not NEEEDED FOR NOW
                  </span>
                )}
                {data.type === "heading" ? (
                  <RenderHTMLContent htmlContent={data.content} />
                ) : (
                  data.content
                )}
              </p>
              <div
                className="actions"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                {data.type === "heading" && !playingPlaylist ? (
                  <p
                    className={`end-icon without-right-margin ${`${isMobile && "visible"} end-icon without-right-margin`}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      G.SetEditRichText?.({
                        id: data.id,
                        text: data.content,
                      });
                    }}
                  >
                    <span class="material-symbols-outlined">edit</span>
                  </p>
                ) : null}
                {!playingPlaylist &&
                  data.type !== "heading" &&
                  !embedding &&
                  layers &&
                  creatingPlaylist &&
                  !viewOnly && (
                    <p
                      className={`end-icon without-right-margin ${`${isMobile && "visible"} end-icon without-right-margin`}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (data.type === "heading") {
                          ShowNotification({
                            message: `Headings & Media cannot be embeded!`,
                            severity: "error",
                          });
                        } else {
                          setEmbedding(data.id);
                          if (checkListData[data.id]) {
                            editDataFromPlaylist(data.id, false);
                          }
                        }
                      }}
                    >
                      <span class="material-symbols-outlined">pip</span>
                    </p>
                  )}
                {!playingPlaylist && creatingPlaylist && !viewOnly && (
                  <p
                    className={`end-icon without-right-margin ${`${isMobile && "visible"} end-icon without-right-margin`}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFromList(index);
                    }}
                  >
                    <span class="material-symbols-outlined unfollow delete-icon">
                      delete
                    </span>
                  </p>
                )}
                <Linking
                  linkingMode={linkingMode}
                  data={data}
                  playlistName={playlistName}
                  playListId={playListSubId}
                />
              </div>
            </div>
            {itemSelected === data.id && !draggedItemID && !embedding && (
              <div style={{ padding: "1rem" }}>
                <AttachLink attachLink={attachLink} massAdd={massAdd} />
              </div>
            )}
          </>
        )
      )}
    </>
  );
};

const PlaylistContentRenderer = (props: any) => {
  const {
    setItemSelected,
    datesRepeat,
    itemSelected,
    attachLink,
    massAdd,
    datesInWrongOrder,
    currentFormat,
    draggedItemID,
    readingPlanEnabled,
    currentDateActive,
    setList,
    transformedHistory,
    playListSubIndex,
    isSomethingEmbededChecked,
    checkListEmbeded,
    setChecklistEmbeded,
    onDisembed,
    setRef,
    layers,
    embedding,
    setEmbedding,
    originalIndex,
    clickPass,
    activeItemID,
    activeItemList,
    oldItemsMap,
    playListSubId,
    data,
    viewOnly,
    linkingMode,
    creatingPlaylist,
    checkListData,
    checklistEnabled,
    playlistName,
    editDataFromPlaylist,
    type,
    toggle,
    playingPlaylist,
    greyOut,
    content,
    id,
    additionalInfo,
    handleDragStart,
    autoPlayToggle,
    handleDragOver,
    handleDragEnd,
    index,
    onClickItem,
    onClick,
    deleteFromList,
    dragOverSet,
    isAdditionalInfo,
  } = props;
  const [open, setOpen] = useState(false);
  const prevAutoOpen = useRef(false);

  useLayoutEffect(() => {
    G[`${id}OpenToggle`] = setOpen;
    return () => {
      G[`${id}OpenToggle`] = null;
    };
  }, [open]);

  const dragged = useRef(false);

  const dataLength = layers ? 0 : (additionalInfo || []).length;

  const itemToBeShared = layers ? [data] : additionalInfo;

  const toBeMapArray = layers
    ? additionalInfo.layers || []
    : additionalInfo || [];

  const isChecked = itemToBeShared.every(
    (ele: any) => ele.readAlready || checkListData?.[ele.id]
  );

  const isGreyout = itemToBeShared.every((ele: any) => oldItemsMap?.[ele.id]);
  const isActive = itemToBeShared.some(
    (ele: any) => ele.id === activeItemID || activeItemList?.[ele.id]
  );
  const allIds = itemToBeShared.map((ele: any) => ele.id);

  const extraClasses = `${(toggle === id || activeItemID === id || activeItemList?.[id] || isActive) && "current-playing-item"} ${(greyOut || oldItemsMap?.[id] || isGreyout) && "greyed-out"} ${embedding === data.id ? "embedding-on" : ""} ${dragOverSet.itemId === id && `dropabble-${dragOverSet.position}`}`;

  useLayoutEffect(() => {
    if (!prevAutoOpen.current) {
      if (activeItemID === id || activeItemList?.[id] || isActive) {
        setOpen(true);
        prevAutoOpen.current = true;
      }
    } else {
      if (activeItemID !== id || activeItemList?.[id] || isActive) {
        prevAutoOpen.current = false;
      }
    }
  }, [data, activeItemID]);

  return (
    <div>
      <div
        draggable={!playingPlaylist && !viewOnly}
        tabIndex={0}
        className={`history-item ${extraClasses}`}
        onClick={(e) => {
          e.stopPropagation();
          if (!viewOnly) {
            // globalThis.ADDING_TOPLAYLIST_TIMEOUT = setTimeout(() => {
            //     globalThis.ADDING_TOPLAYLIST_TIMEOUT = null;
            //     onClickItem({ dataItem: itemToBeShared, bulkAdd: true })
            // }, 1000);
          }
          if (!viewOnly) {
            const isMultiFunctionHold = CheckMultiFuntionHold();

            if (!isMultiFunctionHold && !checklistEnabled)
              setItemSelected((prev: any) =>
                prev === data.id ? null : data.id
              );
          }
        }}
        onPointerUp={() => {
          if (dragged.current) {
            dragged.current = false;
          }
          if (G.ADDING_TOPLAYLIST_TIMEOUT) {
            clearInterval(G.ADDING_TOPLAYLIST_TIMEOUT);
            G.ADDING_TOPLAYLIST_TIMEOUT = null;
          }
        }}
        onMouseLeave={() => {
          if (G.ADDING_TOPLAYLIST_TIMEOUT)
            clearInterval(G.ADDING_TOPLAYLIST_TIMEOUT);
        }}
        onTouchEnd={() => {
          if (G.ADDING_TOPLAYLIST_TIMEOUT)
            clearInterval(G.ADDING_TOPLAYLIST_TIMEOUT);
        }}
        onMouseDown={(e) => e.stopPropagation()} // block parent drag
        onDragStart={() => {
          dragged.current = true;
          handleDragStart(index, null);
        }}
        onDragOver={(e) => handleDragOver(index, null, null, e)}
        onDragEnd={handleDragEnd}
      >
        <input
          style={{
            opacity: "0",
            "pointer-events": "none",
            position: "absolute",
            left: 0,
            top: 0,
            zIndex: -1,
          }}
          placeholder={"test"}
          ref={(ref) => {
            if (setRef && setRef[id]) {
              setRef[id].current = ref;
            }
          }}
        />
        <div className="start-actions">
          {checklistEnabled && !viewOnly ? (
            <Checkbox
              checked={isChecked || embedding === data.id}
              // disabled={embedding === data.id || isSomethingEmbededChecked}
              disabled={embedding === data.id}
              small
              onClick={() => {
                const isShiftHold = G?.KEY_HOLD?.["shift"];
                if (isShiftHold) {
                  let upperLimit = Math.max(index, G.LAST_CLICK_ID);
                  let lowerLimit = Math.min(index, G.LAST_CLICK_ID);
                  const idsFilter = transformedHistory
                    .filter(
                      (el: any, indexInner: number) =>
                        indexInner <= upperLimit &&
                        indexInner >= lowerLimit &&
                        indexInner !== G.LAST_CLICK_ID &&
                        el.id !== embedding
                    )
                    .map((ele: any) => ele.id);
                  editDataFromPlaylist(idsFilter, false);
                  G.LAST_CLICK_ID = index;
                  return;
                } else {
                  G.LAST_CLICK_ID = index;
                }
                if (!embedding && layers && !playingPlaylist) {
                  if (G.KEY_HOLD?.["control"] || G.KEY_HOLD?.["meta"]) {
                    setEmbedding(data.id);
                    return;
                  }
                }
                editDataFromPlaylist(allIds, false);
              }}
            />
          ) : null}
          {false && (
            <span class="material-symbols-outlined unfollow drag-item-icon">
              table_view
            </span>
          )}
        </div>

        {!isAdditionalInfo &&
          toBeMapArray.map((data: any) => (
            <input
              style={{
                opacity: "0",
                "pointer-events": "none",
                position: "absolute",
                left: 0,
                top: 0,
                zIndex: -1,
              }}
              placeholder={"test"}
              ref={(ref) => {
                if (setRef && setRef[data.id]) {
                  setRef[data.id].current = ref;
                }
              }}
            />
          ))}

        <p
          onClick={() => {
            if (dragged.current) {
              dragged.current = false;
            }
            if (!viewOnly) {
              clearInterval(G.ADDING_TOPLAYLIST_TIMEOUT);
              G.ADDING_TOPLAYLIST_TIMEOUT = null;
              onClick({ dataItem: itemToBeShared, bulkAdd: true, index });
              if (checklistEnabled) {
                editDataFromPlaylist(allIds);
              }
            }
            if (clickPass) {
              G.ADDING_TOPLAYLIST_TIMEOUT = null;
              onClick({ dataItem: itemToBeShared, bulkAdd: true, index });
              if (checklistEnabled) {
                editDataFromPlaylist(allIds);
              }
            }
          }}
          style={{
            border: data.id === itemSelected ? "1px solid #D36433" : "",
            backgroundColor: data.id === itemSelected ? "#D364334D" : "",
          }}
          className={`playlist-item-type ${checklistEnabled && !viewOnly ? "" : "no-left-padding"} playlist-item-${type}`}
        >
          {content}
        </p>
        <div
          className="actions"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {!playingPlaylist &&
            layers &&
            !embedding &&
            creatingPlaylist &&
            !viewOnly && (
              <p
                className={`end-icon without-right-margin ${`${isMobile && "visible"} end-icon without-right-margin`}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setEmbedding(data.id);
                }}
              >
                <span class="material-symbols-outlined">pip</span>
              </p>
            )}
          {!playingPlaylist && creatingPlaylist && !viewOnly && (
            <p className="without-right-margin end-icon">
              <span
                onClick={() => {
                  deleteFromList(itemToBeShared.map((data: any) => data.id));
                }}
                class="material-symbols-outlined unfollow delete-icon"
              >
                delete
              </span>
            </p>
          )}
          {!isAdditionalInfo && toBeMapArray.length > 0 && (
            <p className="without-right-margin end-icon visible">
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  if (!dragged.current) {
                    setOpen((p) => !p);
                  }
                }}
                className="material-symbols-outlined unfollow"
                style={{ fontSize: "1.2rem" }}
              >
                {open ? "collapse_content" : "expand_content"}
              </span>
            </p>
          )}
        </div>
      </div>
      <div
        style={{
          height: open ? "auto" : "0",
          transition: "all 0.2s linear",
          overflow: "hidden",
          padding: "0 8px",
        }}
      >
        {!isAdditionalInfo &&
          toBeMapArray.map((data: any, index: number) => {
            return data.type === "attachment-link" || data.type === "date" ? (
              <AttachmentLinkItem
                linkingMode={linkingMode}
                viewOnly={viewOnly}
                isSomethingEmbededChecked={isSomethingEmbededChecked}
                datesRepeat={datesRepeat}
                datesInWrongOrder={datesInWrongOrder}
                playlistName={playlistName}
                currentFormat={currentFormat}
                autoPlayToggle={autoPlayToggle}
                readingPlanEnabled={readingPlanEnabled}
                layers={layers}
                dragOverSet={dragOverSet}
                draggable={!playingPlaylist}
                oldItemsMap={oldItemsMap}
                currentDateActive={currentDateActive}
                originalIndex={originalIndex}
                activeItemID={activeItemID}
                clickPass={clickPass}
                setRef={setRef}
                checked={
                  layers
                    ? !!checkListEmbeded?.[data.id]
                    : checkListData?.[data.id] || data.readAlready
                }
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
                embedding={embedding}
                handleDragOver={handleDragOver}
                toggle={toggle}
                setList={setList}
                pId={id}
                handleDragEnd={handleDragEnd}
                originalList={transformedHistory}
                playListSubIndex={playListSubIndex}
                deleteFromList={deleteFromList}
                key={`${data.id}-${data.readAlready}`}
                playingPlaylist={playingPlaylist}
                data={data}
                onClickCheckbox={() => {
                  const isShiftHold = G?.KEY_HOLD?.["shift"];
                  if (isShiftHold && id === G.LAST_CLICK_EMBED_PARENT) {
                    let upperLimit = Math.max(index, G.LAST_CLICK_EMBED_ID);
                    let lowerLimit = Math.min(index, G.LAST_CLICK_EMBED_ID);
                    const idsFilter = toBeMapArray
                      .filter(
                        (el: any, indexInner: number) =>
                          indexInner <= upperLimit &&
                          indexInner >= lowerLimit &&
                          indexInner !== G.LAST_CLICK_EMBED_ID &&
                          el.id !== embedding
                      )
                      .map((ele: any) => ele.id);
                    setChecklistEmbeded(idsFilter, false);
                    G.LAST_CLICK_EMBED_PARENT = id;
                    G.LAST_CLICK_EMBED_ID = index;

                    return;
                  } else {
                    G.LAST_CLICK_EMBED_PARENT = id;
                    G.LAST_CLICK_EMBED_ID = index;
                  }
                  if (layers) {
                    setChecklistEmbeded(data.id, id);
                  } else {
                    editDataFromPlaylist(data.id, false);
                  }
                }}
                onDisembed={() => {
                  onDisembed({ id: data.id, pId: id });
                }}
                justPlay={true}
              />
            ) : (
              <div
                key={`${data.id}-${data.readAlready}`}
                style={{ display: data.id === id ? "none" : "" }}
                draggable={!playingPlaylist}
                onDragStart={() => {
                  if (open) handleDragStart(index, id);
                }}
                tabIndex={0}
                onMouseDown={(e) => e.stopPropagation()} // block parent drag
                // ref={ref => setRef.current[data.id] = ref}
                onDragOver={(e) => {
                  if (open) {
                    handleDragOver(index, originalIndex, id, e);
                  }
                }}
                onDragEnd={() => {
                  if (open) handleDragEnd();
                }}
                className={`history-item ${(oldItemsMap[data.id] || !!embedding) && "greyed-out"} ${(toggle === data.id || activeItemList[data.id] || activeItemID === data.id) && "current-playing-item"} ${dragOverSet.itemId === data.id && `dropabble-${dragOverSet.position}`}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!viewOnly) {
                    G.ADDING_TOPLAYLIST_TIMEOUT = setTimeout(() => {
                      G.ADDING_TOPLAYLIST_TIMEOUT = null;
                      if (data.type !== "heading")
                        onClickItem({ dataItem: data });
                    }, 1000);
                  }
                }}
                onPointerUp={() => {
                  if (G.ADDING_TOPLAYLIST_TIMEOUT) {
                    clearInterval(G.ADDING_TOPLAYLIST_TIMEOUT);
                  }
                }}
                onMouseLeave={() => {
                  if (G.ADDING_TOPLAYLIST_TIMEOUT)
                    clearInterval(G.ADDING_TOPLAYLIST_TIMEOUT);
                }}
                onTouchEnd={() => {
                  if (G.ADDING_TOPLAYLIST_TIMEOUT)
                    clearInterval(G.ADDING_TOPLAYLIST_TIMEOUT);
                }}
              >
                <div className="start-actions">
                  {data.type !== "heading" &&
                  checklistEnabled &&
                  open &&
                  !viewOnly ? (
                    <Checkbox
                      small
                      disabled={!!embedding}
                      checked={
                        layers
                          ? !!checkListEmbeded?.[data.id]
                          : checkListData?.[data.id] || data.readAlready
                      }
                      onClick={() => {
                        const isShiftHold = G?.KEY_HOLD?.["shift"];
                        if (isShiftHold && id === G.LAST_CLICK_EMBED_PARENT) {
                          let upperLimit = Math.max(
                            index,
                            G.LAST_CLICK_EMBED_ID
                          );
                          let lowerLimit = Math.min(
                            index,
                            G.LAST_CLICK_EMBED_ID
                          );
                          const idsFilter = toBeMapArray
                            .filter(
                              (el: any, indexInner: number) =>
                                indexInner <= upperLimit &&
                                indexInner >= lowerLimit &&
                                indexInner !== G.LAST_CLICK_EMBED_ID &&
                                el.id !== embedding
                            )
                            .map((ele: any) => ele.id);
                          setChecklistEmbeded(idsFilter, false);
                          G.LAST_CLICK_EMBED_PARENT = id;
                          G.LAST_CLICK_EMBED_ID = index;
                          return;
                        } else {
                          G.LAST_CLICK_EMBED_PARENT = id;
                          G.LAST_CLICK_EMBED_ID = index;
                        }
                        if (layers) {
                          setChecklistEmbeded(data.id, id);
                        } else {
                          editDataFromPlaylist(data.id, false);
                        }
                      }}
                    />
                  ) : null}
                  {false && (
                    <span class="material-symbols-outlined unfollow drag-item-icon">
                      featured_play_list
                    </span>
                  )}
                </div>
                <p
                  onClick={() => {
                    if (G.ADDING_TOPLAYLIST_TIMEOUT && !viewOnly) {
                      clearInterval(G.ADDING_TOPLAYLIST_TIMEOUT);
                      if (data.type !== "heading") {
                        if (checklistEnabled) {
                          editDataFromPlaylist(data.id);
                        }
                        onClick({ dataItem: data, index, justPlay: !!layers });
                      }
                    }
                  }}
                  className={`playlist-item-type ${data.type !== "heading" && (embedding || checklistEnabled) && open && !viewOnly ? "" : "no-left-padding"} playlist-item-${data.type}`}
                >
                  {data.type === "headings" && (
                    <span class="material-symbols-outlined side-icon">
                      format_h1 //Not NEEEDED FOR NOW
                    </span>
                  )}
                  {data.type === "heading" ? (
                    <RenderHTMLContent htmlContent={data.content} />
                  ) : (
                    data.content
                  )}
                </p>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="actions"
                >
                  {data.type === "heading" && !playingPlaylist ? (
                    <p
                      className={`end-icon without-right-margin ${`${isMobile && "visible"} end-icon without-right-margin`}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        G.SetEditRichText?.({
                          id: data.id,
                          text: data.content,
                          parentID: id,
                        });
                      }}
                    >
                      <span class="material-symbols-outlined">edit</span>
                    </p>
                  ) : null}
                  {!playingPlaylist &&
                    layers &&
                    creatingPlaylist &&
                    open &&
                    !viewOnly && (
                      <p
                        className={`end-icon without-right-margin ${`${isMobile && "visible"} end-icon without-right-margin`}`}
                        onClick={() => onDisembed({ id: data.id, pId: id })}
                      >
                        <span class="material-symbols-outlined unfollow delete-icon">
                          link_off
                        </span>
                      </p>
                    )}
                  {!playingPlaylist &&
                    creatingPlaylist &&
                    open &&
                    !viewOnly && (
                      <p
                        className={`end-icon without-right-margin ${`${isMobile && "visible"} end-icon without-right-margin`}`}
                        onClick={() => deleteFromList(index, id)}
                      >
                        <span class="material-symbols-outlined unfollow delete-icon">
                          delete
                        </span>
                      </p>
                    )}
                  {open && (
                    <Linking
                      linkingMode={linkingMode}
                      playListId={playListSubId}
                      playlistName={playlistName}
                      data={data}
                    />
                  )}
                </div>
              </div>
            );
          })}
      </div>
      {itemSelected === data.id && !draggedItemID && !embedding && (
        <div style={{ padding: "1rem" }}>
          <AttachLink attachLink={attachLink} massAdd={massAdd} />
        </div>
      )}
    </div>
  );
};

return DragDrop;
