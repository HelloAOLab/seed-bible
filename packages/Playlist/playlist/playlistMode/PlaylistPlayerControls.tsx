const { useState, useLayoutEffect, useRef, useMemo, createRef } = os.appHooks;
const { Button } = Components;
const VideoPlayer = await thisBot.VideoSmallScreen();
const AudioPlayer = await thisBot.AudioPlayer();
const AttachLink = await thisBot.AttachLink();

const EditPlaylist =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/a48b4bb0182ac0b5f8c8437e3d985f9af99c8b64c61249496ef797b9b8ac88df.svg";
const SharePlaylist =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/d205ab2613e2feb14123b39522527dc72a7b649078fd434c81b0b44ede4cdecf.svg";

const outerWebsiteItem = {
  youtube: true,
  iframe: true,
  video: true,
  Video: true,
  externalLink: true,
};

const PrevIcon = ({ fill = "#939393" }) => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg">
    <path
      d="M7.33325 24V8H9.99992V24H7.33325ZM24.6666 24L12.6666 16L24.6666 8V24Z"
      fill={fill}
    />
  </svg>
);

const NextIcon = ({ fill = "#939393" }) => (
  <svg
    width="18"
    height="16"
    viewBox="0 0 18 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg">
    <path
      d="M14.9999 16V0H17.6666V16H14.9999ZM0.333252 16V0L12.3333 8L0.333252 16Z"
      fill={fill}
    />
  </svg>
);

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

  const isCurrentItemTargetItem =
    targetItem?.type === "chapter-range" ||
    !!targetItem?.additionalInfo?.layers?.length;

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

const PlayerControls = ({ parentId = "default" }) => {
  const [showCurrent, setShowCurrent] = useState(false);
  const [queue, setQueue] = useState([]);

  const [transformedHistory, setTransformedHistory] = useState(
    globalThis.PPthh
  );
  const [oldData, setOldData] = useState([]);
  const [openAttachLink, setOpenAttachLink] = useState(false);

  const [checkedItems, setCheckedItems] = useState(
    globalThis.PPreadingPlanEnabled ? { ...globalThis.PPpastDateEvents } : {}
  );

  const [currIndex, setCurreIndex] = useState({
    key: 0,
    index: globalThis.PPchecklistEnabled
      ? -1
      : globalThis.PPreadingPlanEnabled
      ? globalThis.PPfirstActiveIndex
      : globalThis.PPfirstIndex,
    fromButton: 0,
    isPreviousQueue: false,
    subIndex: globalThis.PPsubIndex,
  });

  const [playlists, setPlaylists] = useState({
    0: {
      name: globalThis.PPplaylistName,
      list: [
        ...thisBot.PlayingLayersConversion(globalThis.PPplaylist?.list || []),
      ],
      id: createUUID(),
      playlistID: globalThis.PPplaylist?.id,
      isLayers: globalThis.PPplaylist?.isLayers,
    },
  });

  // Audio
  const [mediaURL, setMediaURL] = useState("");
  const [videoSrc, setVideoSrc] = useState(false);

  const setIncrementalCount = async (data) => {
    if (!data) return;
    setMediaURL(data);
  };

  // May Use Later
  const [activeIndexs, setActiveIndexs] = useState({
    ...globalThis.PPclosestNearDateEvent,
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
  };

  const handleOnButtonPress = (
    order = 0,
    getIndexOnly = false,
    directSet = false,
    directSetKey = false,
    newIndexs
  ) => {
    const indexes = newIndexs ? newIndexs : { ...currIndex };

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
      !!currentItem.additionalInfo?.layers?.length;

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
            : !!prevItem?.additionalInfo?.layers?.length
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

    let newValues = {
      index: newIndex,
      key: newKey,
      fromButton: order,
      isPreviousQueue: false,
      subIndex: newSubIndex,
    };

    const targetItem = getCurrentItem(
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
      if (targetItem?.type === "date" && !getIndexOnly) {
        globalThis.PlaylingItemVisitiedMap?.((prev) => ({
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
      if (globalThis.FocusOnVerse) {
        FocusOnVerse(targetItem.additionalInfo.verse);
      }
    }

    justAddedQueue.current = false;
    globalThis.LAST_QUEUE_IIEM = {};
    setCurreIndex(newValues);
  };

  const justAddedQueue = useRef(false);

  const addToQueue = (item, combineLast) => {
    const isArr = Array.isArray(item);

    let toAddItems = [];

    if (isArr) {
      toAddItems = [...item.map((ele) => ({ id: createUUID(), ...ele }))];
      globalThis.LAST_QUEUE_IIEM = item[item.length];
    } else {
      const isSame = objectComparator(item, globalThis.LAST_QUEUE_IIEM || {}, [
        "content",
      ]);

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

      if (SQ || justAddedQueue.current) {
        if (justAddedQueue.current) {
          currentKey = Number(currIndex.key) + 1;
        }
        if (combineLast) {
          updatedPlaylists[currentKey]?.list.pop();
        }
        // Case: Adding to an existing special queue
        updatedPlaylists[currentKey].list = [
          ...updatedPlaylists[currentKey]?.list,
          ...toAddItems,
        ];
      } else {
        // Case: Splitting a playlist
        const beforeCurrentIndex = currentList.slice(0, splitIndex + 1);
        const afterCurrentIndex = currentList.slice(splitIndex + 1);

        const newQueueKey = `${currIndex.key}.1`; // Next numeric key
        const newQueue = {
          name: `Queue ${totalQueue + 1}`,
          list: [...toAddItems],
          id: createUUID(),
          SQ: true, // Mark this as a special queue,
          playlistID: null,
        };

        if (!globalThis.PPchecklistEnabled) {
          // Update the current playlist with items before the split
          updatedPlaylists[currentKey] = {
            ...currentPlaylist,
            list: beforeCurrentIndex,
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

        if (!globalThis.PPchecklistEnabled) {
          updatedPlaylists[currentKey].broken = true;
          if (afterCurrentIndex.length > 0) {
            updatedPlaylists[`${currIndex.key}.2`] = {
              name: `${currentPlaylist.name}`,
              list: [...afterCurrentIndex],
              id: createUUID(),
              SQ: false, // Mark this as a special queue
              playlistID,
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
    setOpenAttachLink(false);
  };

  useLayoutEffect(() => {
    globalThis.SetCurreIndexPlaylist = handlesetIndex;
    globalThis.SetCurreIndexDirect = setCurreIndex;
    globalThis.HandleOnButtonPress = handleOnButtonPress;
    globalThis.ModifyTransformedHistory = setTransformedHistory;
    globalThis.IsPlaylistPlaying = true;
    globalThis.SetQueue = addToQueue;
    globalThis.SetPlayingList = setPlaylists;
    globalThis.HandleOnButtonPress = handleOnButtonPress;

    globalThis.SetIncrementalCountPlayingPlaylist = setIncrementalCount;
    globalThis.SetVideoSrc = setVideoSrc;
    globalThis.SetMediaURL = setMediaURL;

    globalThis.PlayingPlaylistCheckedItems = checkedItems;
    globalThis.PlayingPlaylists = playlists;
    globalThis.SetPlayingPlaylists = setPlaylists;
    globalThis.CurrentIndexItem = currIndex;
    globalThis.SetCheckedItemsPlayingPlaylist = setCheckedItems;

    globalThis.UpdateJustAddedToQueue = (val) => {
      justAddedQueue.current = val;
    };

    if (globalThis.PPreadingPlanEnabled) {
      globalThis.READING_PLAN_WORK = true;
      // globalThis.IS_PLAYLIST_ACTIVE = 0;
    }
    return () => {
      globalThis.SetCurreIndexPlaylist = null;
      globalThis.HandleOnButtonPress = null;
      globalThis.ModifyTransformedHistory = null;
      globalThis.SetQueue = false;
      globalThis.SetCurreIndexDirect = null;
      globalThis.SetPlayingList = () => {};
      globalThis.SetSelected && SetSelected({});
      globalThis.READING_PLAN_WORK = false;
      globalThis.HandleOnButtonPress = null;
      globalThis.SetIncrementalCountPlayingPlaylist = null;
      globalThis.SetVideoSrc = null;
      globalThis.SetMediaURL = null;
      globalThis.PlayingPlaylistCheckedItems = null;
      globalThis.PlayingPlaylists = null;
      globalThis.SetPlayingPlaylists = null;
      globalThis.CurrentIndexItem = null;
      globalThis.SetCheckedItemsPlayingPlaylist = null;
      globalThis.UpdateJustAddedToQueue = null;
      // globalThis.IS_PLAYLIST_ACTIVE = true;
    };
  }, [handleOnButtonPress, transformedHistory]);

  useLayoutEffect(() => {
    return () => {
      globalThis.IsPlaylistPlaying = false;
      globalThis.IsQueuePresent = false;
    };
  }, []);

  const [
    currentPlaylistName,
    currentItemID,
    typeContent,
    nextItemName,
    prevItemName,
    currentItem,
  ] = useMemo(() => {
    const { name: currentPlaylistName } = playlists[currIndex.key];

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
      playlists[nextIndexes.key]?.isLayers,
      true
    );
    const prevItem = prevIndex.isPreviousQueue
      ? oldData[oldData.length - 1]
      : getCurrentItem(
          prevIndex.key,
          prevIndex.index,
          playlists,
          prevIndex.subIndex,
          playlists[prevIndex.key]?.isLayers,
          true
        );

    // setOldData(prev => [...prev, targetItem]);
    globalThis.PlaylingItemVisitiedMap?.((prev) => ({
      ...prev,
      [targetItem.id]: true,
    }));

    if (targetItem?.type === "attachment-link") {
      thisBot.RenderLinkContent({
        ...targetItem,
        isLastItem: !nextItem,
        isFirstItem: !prevItem,
      });
    } else if (currIndex.fromButton !== 0) {
      const isBulk =
        !!targetItem?.additionalInfo?.layers?.length ||
        Array.isArray(targetItem.additionalInfo);

      const toBeMapArray = targetItem?.additionalInfo?.layers?.length
        ? targetItem?.additionalInfo?.layers
        : Array.isArray(targetItem.additionalInfo);

      if (
        targetItem?.type === "heading" ||
        (!!targetItem?.nextTargetItem?.id && currIndex.fromButton === 1)
      ) {
        if (targetItem?.type === "heading")
          globalThis.PlayingPlaylistSetHeading(targetItem.content);
        const allKeys = Object.keys(playlists);

        const isFirstKey = currIndex.key == 0;
        const isLastKey = currIndex.key == allKeys[allKeys.length - 1];

        const th = playlists[currIndex.key]?.list;

        const isFirstItemAndBackButton =
          currIndex.fromButton < 0 && currIndex.index == 0 && isFirstKey;
        const isLastItemAndLastButton =
          currIndex.fromButton > 0 &&
          isLastKey &&
          currIndex.index == th.length - 1;
        if (targetItem?.nextTargetItem) {
          thisBot.navigationWithDataItem({
            dataItem: isBulk ? toBeMapArray : targetItem,
            bulkAdd: isBulk,
          });
          handleOnButtonPress(currIndex.fromButton);
          globalThis[`${targetItem.id}OpenToggle`] &&
            globalThis[`${targetItem.id}OpenToggle`](true);
        }
        if (!isFirstItemAndBackButton && !isLastItemAndLastButton)
          handleOnButtonPress(currIndex.fromButton);
      } else {
        const skip = thisBot.checkIfNeedToSkip({ dataItem: targetItem });
        if (skip) {
          os.toast(`${targetItem.content} is Already Opened.Skipping it!`);
          handleOnButtonPress(currIndex.fromButton);
        } else {
          thisBot.navigationWithDataItem({
            dataItem: isBulk ? toBeMapArray : targetItem,
            bulkAdd: isBulk,
          });
        }
        // SetBlinker({});
      }
    }

    if (globalThis.RenderPlaylistTimer) {
      clearTimeout(globalThis.RenderPlaylistTimer);
      globalThis.RenderPlaylistTimer = null;
    }
    globalThis.RenderPlaylistTimer = setTimeout(() => {
      thisBot.SetItemsPlayerPlaylist({
        currentPlaylistName: currentPlaylistName,
        currentItemID: targetItem.id,
        typeContent: currentItemType,
        nextItemName: nextItem,
        prevItemName: prevItem,
        currentItemName: currentItemName,
      });
      globalThis.RenderPlaylist && globalThis.RenderPlaylist();
      globalThis.RenderPlaylistTimer = null;
    }, 100);
    // nextItemName, nextItemType, prevItemName, prevItemType
    //  nextItemName, nextItemType, prevItemName, prevItemType
    return [
      currentPlaylistName,
      targetItem.id,
      currentItemType,
      nextItem,
      prevItem,
      currentItemName,
    ];
  }, [
    currIndex,
    playlists,
    queue,
    // refs
  ]);

  useLayoutEffect(() => {
    const i = currIndex.index;
    const list = globalThis.PPplaylist?.list;

    const gp = list;

    let lastActiveDateID = -1;

    for (let j = i; j > -1; j--) {
      const item = gp[j];
      if (item?.type === "date" && lastActiveDateID === -1) {
        lastActiveDateID = item.id;
      }
    }

    setShowCurrent(true);
    if (globalThis.TIMER_SHOW_NEXT) {
      clearTimeout(globalThis.TIMER_SHOW_NEXT);
      globalThis.TIMER_SHOW_NEXT = null;
    }
    globalThis.TIMER_SHOW_NEXT = setTimeout(() => {
      setShowCurrent(false);
    }, 3000);

    globalThis.SetActiveDate?.(lastActiveDateID);
  }, [currIndex]);

  const attachLink = (title, link, linkState) => {
    globalThis.SetQueue({
      content: title,
      additionalInfo: {
        link,
        ...linkState,
      },
      type: linkState.type === "text" ? "heading" : "attachment-link",
    });
    setOpenAttachLink(false);
  };

  const massAdd = (items) => {
    globalThis.SetQueue(items);
  };

  const isItemLink = outerWebsiteItem[currentItem?.additionalInfo?.type];

  return (
    <>
      <style>{thisBot.tags["Linking.css"]}</style>
      <style>{thisBot.tags["PlaylistContainer.css"]}</style>
      <style>{thisBot.tags["playlist.css"]}</style>

      {openAttachLink ? (
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
            height: "auto",
          }}
          className="flaoting-attach-link">
          <AttachLink
            canClose
            massAdd={massAdd}
            attachLink={attachLink}
            onClose={() => setOpenAttachLink(false)}
          />
        </div>
      ) : (
        <div
          style={{
            background: "white",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            boxShadow: "0px 0px 9px 0px #00000026",
            padding: "0.5rem",
            borderRadius: "8px",
            justifyContent: "center",
          }}>
          {!!videoSrc && (
            <VideoPlayer videoSrc={videoSrc} playlistItem={currentItem} />
          )}
          {!!mediaURL && <AudioPlayer mediaURL={mediaURL} />}
          {isItemLink && false && (
            <div>
              <p>Link showing refuse to connect Problems? </p>
              <a
                href={currentItem?.additionalInfo?.link}
                target="_blank"
                rel="noopener noreferrer"
                title="Visit link">
                Click here to open
              </a>
            </div>
          )}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              gap: "0.5rem",
              width: "calc(100%)",
            }}>
            <div
              style={{
                width: "50%",
                flexDirection: "column",
                display: "flex",
              }}>
              <p
                style={{
                  fontSize: "12px",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  margin: "0",
                  marginBottom: "0.5rem",
                  fontFamily: "DM Sans",
                  height: "12px",
                }}>
                {showCurrent
                  ? "Playing now"
                  : nextItemName?.content
                  ? "Playing Next"
                  : null}
              </p>
              <div style={{ gap: "0.5rem" }} className="align-center">
                <div
                  style={{
                    height: "2.5rem",
                    width: "2.5rem",
                    display: "grid",
                    placeItems: "center",
                    backgroundColor: "#D3643329",
                    borderRadius: "0.25rem",
                  }}>
                  <span
                    style={{ margin: "0", fontSize: "18px" }}
                    class="material-symbols-outlined unfollow">
                    {nextItemName?.type === "attachment-link"
                      ? "media_link"
                      : "description"}
                  </span>
                </div>
                <div style={{ position: "relative", flexGrow: "1" }}>
                  <div
                    className={`fade-in-animation  ${
                      showCurrent ? "" : "show"
                    }`}>
                    {nextItemName?.content ? (
                      <p
                        style={{
                          fontSize: "1rem",
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                          fontFamily: "DM Sans",
                          margin: "0",
                        }}>
                        {nextItemName?.content
                          ? `${nextItemName?.content}${nextItemName?.prefix}`.substring(
                              0,
                              16
                            )
                          : ""}
                        {`${nextItemName?.content}${nextItemName?.prefix}`
                          .length > 16
                          ? "..."
                          : ""}
                      </p>
                    ) : (
                      <p
                        style={{
                          color: "green",
                          fontSize: "12px",
                          fontWeight: "900",
                          fontFamily: "DM Sans",
                          margin: "0",
                        }}>
                        Playlist Ended
                      </p>
                    )}
                    {!globalThis.ValidTypes[nextItemName?.type] && (
                      <p
                        style={{
                          fontSize: "12px",
                          fontWeight: "400",
                          color: "#0000001",
                          margin: "0",
                          textTransform: "capitalize",
                        }}>
                        {nextItemName?.type}
                      </p>
                    )}
                  </div>
                  <div
                    style={{ width: "100%" }}
                    className={`fade-in-animation overlay-top-left  ${
                      showCurrent ? "show" : ""
                    }`}>
                    {currentItem?.content ? (
                      <p
                        style={{
                          fontSize: "1rem",
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                          fontFamily: "DM Sans",
                          margin: "0",
                        }}>
                        {currentItem?.content
                          ? `${currentItem?.content}${currentItem?.prefix}`.substring(
                              0,
                              16
                            )
                          : ""}
                        {`${currentItem?.content}${currentItem?.prefix}`
                          .length > 16
                          ? "..."
                          : ""}
                      </p>
                    ) : (
                      <p
                        style={{
                          color: "green",
                          fontSize: "12px",
                          fontWeight: "900",
                          fontFamily: "DM Sans",
                          margin: "0",
                        }}>
                        Playlist Ended
                      </p>
                    )}

                    {!globalThis.ValidTypes[currentItem?.type] && (
                      <p
                        style={{
                          fontSize: "12px",
                          fontWeight: "400",
                          color: "#0000001",
                          margin: "0",
                          textTransform: "capitalize",
                        }}>
                        {currentItem?.type}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex align-center" style={{ gap: "0.5rem" }}>
              <p
                style={{
                  margin: "0",
                  width: "24px",
                  backgroundColor: "#D364334D",
                  height: "24px",
                  border: "1px solid #D36433",
                }}
                className="playlist-action small"
                onClick={() => {
                  if (globalThis.makingPlaylist) {
                    // globalThis.PlaylistPlaytoggleHide();
                    thisBot.CloseSelf({ force: true });
                  } else {
                    thisBot.OpenSelf();
                  }
                }}>
                <img
                  src="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/fe3ea1784fbed6a33fb06bc8885bca18211293462adcb06311db83f1450589b8.svg"
                  class="material-symbols-outlined unfollow"
                  style={{
                    margin: "0",
                    width: "12px",
                  }}
                />

                {false && <span>{checklistEnabled ? "Player" : "Queue"}</span>}
              </p>
              <p
                onClick={() => {
                  setOpenAttachLink(true);
                }}
                style={{
                  margin: "0",
                  width: "26px",
                  height: "26px",
                  padding: "0",
                  borderRadius: "6px",
                  border: "0px solid #D36433",
                  backgroundColor: "#E6E6E6",
                }}
                className="playlist-action small">
                <span
                  style={{ margin: "0", fontSize: "20px" }}
                  class="material-symbols-outlined unfollow">
                  add
                </span>
              </p>
            </div>
          </div>

          <p
            style={{
              height: "1px",
              backgroundColor: "#000000",
              opacity: "0.1",
              width: "100%",
              margin: "0.5rem 0",
            }}
          />

          <div
            style={{
              display: "flex",
              width: "100%",
              gap: "1rem",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
            {false && (
              <img
                src={EditPlaylist}
                class="material-symbols-outlined unfollow"
                style={{
                  margin: "0",
                  width: "1rem",
                  marginRight: "1rem",
                  cursor: "pointer",
                }}
                onClick={globalThis.PlaylistPlaytoggleHide}
              />
            )}
            <Button
              style={{
                fontSize: "12px",
                margin: "0",
                minWidth: "auto",
                backgroundColor: "transparent",
                border: "0px solid #D36433",
                boxShadow: "none",
                padding: "8px",
                cursor: !prevItemName?.content ? "not-allowed" : "",
                fontSize: "12px",
              }}
              onClick={() => {
                if (!prevItemName?.content) return;
                DataManager.cancelCurrentPlayingSound();
                if (globalThis.HandleOnButtonPress)
                  globalThis.HandleOnButtonPress(-1);
              }}>
              <PrevIcon fill={!prevItemName?.content ? "#939393" : "#000"} />
            </Button>
            <p
              onClick={() => {
                globalThis.IsPlaylistPlaying = false;
                DataManager.cancelCurrentPlayingSound();
                globalThis.SetSelected && SetSelected({});
                globalThis.SetHolded && SetHolded({});
                // globalThis.SetPlayingPlaylist && globalThis.SetPlayingPlaylist(false);
                globalThis[`${parentId}ToggleGreyCheckPLayingPlaylist`] &&
                  globalThis[`${parentId}ToggleGreyCheckPLayingPlaylist`](null);
                globalThis.IsQueuePresent = false;
                // os.unregisterApp("playing-playlist");
                globalThis.IS_PLAYLIST_ACTIVE = false;
                globalThis.SetSplitAppPanel2 &&
                  globalThis.SetSplitAppPanel2(null);
                thisBot.OpenSelf();
                // thisBot.showInfo(`History Mode`);
                if (globalThis.RemoveNowBarApp) {
                  globalThis.RemoveNowBarApp("player-playlist-bar");
                }
                os.unregisterApp("playing-playlist-flaot");
                thisBot.CloseFloatingApp();
              }}
              style={{
                margin: "0",
                width: "2.55rem",
                height: "2.55rem",
                borderRadius: "50%",
                border: "none",
              }}
              className="playlist-action small">
              <span
                style={{
                  margin: "0",
                  fontSize: "14px",
                  backgroundColor: "#D36433",
                }}
                class="material-symbols-outlined unfollow">
                stop
              </span>
            </p>
            <Button
              style={{
                fontSize: "12px",
                margin: "0",
                minWidth: "auto",
                backgroundColor: "transparent",
                border: "0px solid #D36433",
                boxShadow: "none",
                color: "#000",
                padding: "8px",
                fontSize: "12px",
                cursor: !nextItemName?.content ? "not-allowed" : "",
              }}
              onClick={() => {
                if (!nextItemName?.content) return;
                DataManager.cancelCurrentPlayingSound();
                if (
                  !!nextItemName?.content &&
                  !!globalThis.HandleOnButtonPress
                ) {
                  globalThis.HandleOnButtonPress(1);
                  return;
                }
                // globalThis.SetPlayingPlaylist && globalThis.SetPlayingPlaylist(false);
                globalThis[`${parentId}ToggleGreyCheckPLayingPlaylist`] &&
                  globalThis[`${parentId}ToggleGreyCheckPLayingPlaylist`](null);
                globalThis.IsQueuePresent = false;
                globalThis.IS_PLAYLIST_ACTIVE = false;
                thisBot.CloseFloatingApp();
                globalThis.SetSplitAppPanel2(null);
                // os.unregisterApp("playing-playlist");
                // thisBot.showInfo(`History Mode`);
                os.unregisterApp("playing-playlist-flaot");
                if (globalThis.RemoveNowBarApp) {
                  globalThis.RemoveNowBarApp("player-playlist-bar");
                }
              }}>
              <NextIcon fill={!nextItemName?.content ? "#939393" : "#000"} />
            </Button>
            {false && (
              <img
                src={SharePlaylist}
                class="material-symbols-outlined unfollow"
                style={{
                  margin: "0",
                  marginLeft: "1rem",
                  width: "1rem",
                  cursor: "not-allowed",
                }}
                onClick={() => {
                  return ShowNotification({
                    message: "Coming Soon!",
                    severity: "error",
                  });
                }}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};

return PlayerControls;
