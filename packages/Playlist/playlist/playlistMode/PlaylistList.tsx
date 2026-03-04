const { useState, useLayoutEffect, useRef } = os.appHooks;
const G = globalThis;

const PlaylistRowItem = await thisBot.PlaylistRowItem();

const PlaylistList = (props: any) => {
  const {
    selectedChip,
    extraActions = () => {},
    mergeMode,
    selectedPlaylists,
    setSelectPlaylist,
    selectPlaylist = false,
    playLists,
    setPlayLists,
    creatingPlaylist = false,
    playingPlaylist,
    parentId,
    isLayers,
  } = props;

  const [draggedItemID, setDraggedItemID] = useState(null);
  const [opendedList, setOpenedList] = useState(false);
  const toBeSetItems = useRef(null);
  const [dragOverSet, setDragoverSetMutate] = useState({
    position: "top",
    itemId: "null",
  });

  const setDragoverSet = (newState: any) => {
    if (newState.itemId !== dragOverSet.itemId) {
      setDragoverSetMutate(newState);
    }
  };

  const handleDragStart = (index: number) => {
    toBeSetItems.current = playLists;
    const id = playLists[index].id;
    setDraggedItemID(id);
    // console.log('Drag Start:', { index, pseudoID, id });
  };

  const handleDragOver = (index: number) => {
    if (!draggedItemID) return;

    let draggedItemIndex = playLists.findIndex(
      (hist: any) => hist.id === draggedItemID
    );

    let draggedOverItem = playLists[index];

    let dragItem: any = [playLists[draggedItemIndex]];

    let newItems = [];

    let filterAbleItems = {
      [draggedItemID]: true,
    };

    if (dragItem.id === draggedOverItem.id) {
      toBeSetItems.current = playLists;
      setDragoverSet({
        itemId: "null",
        position: "Top",
      });
      return;
    }

    setDragoverSet({
      itemId: draggedOverItem.id,
      position: draggedItemIndex < index ? "Bottom" : "Top",
    });

    // Filter out the currently dragged item
    newItems = playLists.filter((hist: any) => !filterAbleItems[hist.id]);
    // Add the dragged item after the dragged over item
    newItems.splice(index, 0, ...dragItem);

    toBeSetItems.current = newItems;
  };

  const handleDragEnd = () => {
    if (mergeMode) {
      const dragItemIndex = playLists.findIndex(
        (ele: any) => ele.id === draggedItemID
      );
      const dragOverItemIndex = playLists.findIndex(
        (ele: any) => ele.id === dragOverSet.itemId
      );
      // console.log("dragItemIndex", dragItemIndex, dragOverItemIndex);
      if (
        dragOverItemIndex > -1 &&
        dragItemIndex > -1 &&
        dragItemIndex !== dragOverItemIndex
      ) {
        setPlayLists((prev: any) => {
          const old = [...prev];
          const oldItem = old[dragItemIndex];
          old[dragOverItemIndex].list.push({
            type: "playlist",
            ...oldItem,
          });
          old[dragOverItemIndex].nesting += 1;
          old.splice(dragItemIndex, 1);
          return old;
        });
      }
    } else {
      toBeSetItems.current && setPlayLists(toBeSetItems.current);
    }
    setDragoverSet({
      itemId: "null",
      position: "Top",
    });
    setDraggedItemID(null);
  };

  // For Greying While PLaying

  const [toggle, setToggle] = useState(false);

  useLayoutEffect(() => {
    if (playingPlaylist) {
      G[`${parentId}ToggleGreyCheckPLayingPlaylist`] = setToggle;
      G[`${parentId}SetOpenedList`] = setOpenedList;
    }
    return () => {
      G[`${parentId}SetOpenedList`] = null;
      G[`${parentId}ToggleGreyCheckPLayingPlaylist`] = null;
    };
  }, [toggle, opendedList, playingPlaylist]);

  return (
    <>
      <div
        onClick={() => extraActions()}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        {playLists.length === 0 && (
          <p>{isLayers ? t("noLayersToShow") : t("noPlaylistsToShow")}</p>
        )}
        {playLists
          .filter((pl: any) =>
            !playingPlaylist ? true : pl.id === playingPlaylist
          )
          .map((playlist: any, index: number) => {
            const {
              shareProfileName,
              access,
              name: playlistName,
              list,
              id,
              nesting,
              toggleRender,
              description,
              readingPlanEnabled,
              dateFormat,
              attachment,
              checklistEnabled,
              color,
              icon,
              isCustomColor,
              isCustomIcon,
              selectedTags,
              isLayers,
            } = playlist;

            return (
              <PlaylistRowItem
                selectPlaylist={selectPlaylist}
                shareProfileName={shareProfileName}
                selectedPlaylists={selectedPlaylists}
                access={access}
                setSelectPlaylist={setSelectPlaylist}
                isCustomIcon={isCustomIcon}
                toggle={toggle}
                totalItem={playLists.length}
                parentId={parentId}
                playingPlaylist={playingPlaylist}
                handleDragStart={handleDragStart}
                setOpenedList={setOpenedList}
                opendedList={opendedList}
                selectedTags={selectedTags}
                isLayers={isLayers}
                attachment={attachment}
                currentFormat={dateFormat}
                checklistEnabled={checklistEnabled}
                handleDragOver={handleDragOver}
                readingPlanEnabled={readingPlanEnabled}
                handleDragEnd={handleDragEnd}
                dragOverSet={dragOverSet}
                key={id}
                id={id}
                playListIndex={index}
                creatingPlaylist={creatingPlaylist}
                setPlaylists={setPlayLists}
                name={playlistName}
                list={list}
                color={color}
                icon={icon}
                isCustomColor={isCustomColor}
                description={description}
              />
            );
          })}
      </div>
    </>
  );
};

return PlaylistList;
