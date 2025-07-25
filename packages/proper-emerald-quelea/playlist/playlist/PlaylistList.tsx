const { useState, useEffect, useRef } = os.appHooks;
const { Input } = Components;

const PlaylistRowItem = await thisBot.PlaylistRowItem();

const PlaylistList = ({ extraActions = () => { }, mergeMode, selectedPlaylists, setSelectPlaylist, selectPlaylist = false, playLists, setPlayLists, creatingPlaylist = false, playingPlaylist, parentId }) => {
    const [draggedItemID, setDraggedItemID] = useState(null);
    const [opendedList, setOpenedList] = useState(false);
    const toBeSetItems = useRef(null);
    const [dragOverSet, setDragoverSetMutate] = useState({
        position: "top",
        itemId: "null"
    });

    const setDragoverSet = (newState) => {
        if (newState.itemId !== dragOverSet.itemId) {
            setDragoverSetMutate(newState)
        }
    }

    const handleDragStart = (index) => {
        toBeSetItems.current = playLists;
        const id = playLists[index].id;
        setDraggedItemID(id);
        // console.log('Drag Start:', { index, pseudoID, id });
    };

    const handleDragOver = (index) => {

        if (!draggedItemID) return;

        let draggedItemIndex = playLists.findIndex(hist => hist.id === draggedItemID);

        let draggedOverItem = playLists[index];

        let dragItem = [playLists[draggedItemIndex]];

        let newItems = [];

        let filterAbleItems = {
            [draggedItemID]: true,
        };

        if (dragItem.id === draggedOverItem.id) {
            toBeSetItems.current = playLists;
            setDragoverSet({
                itemId: "null",
                position: "Top"
            });
            return;
        }

        setDragoverSet({
            itemId: draggedOverItem.id,
            position: draggedItemIndex < index ? "Bottom" : "Top"
        });

        // Filter out the currently dragged item
        newItems = playLists.filter((hist) => !filterAbleItems[hist.id]);
        // Add the dragged item after the dragged over item
        newItems.splice(index, 0, ...dragItem);

        console.log("CURRENT LIST", playLists);
        console.log("NEW LIST", newItems);

        toBeSetItems.current = newItems;

    };

    const handleDragEnd = () => {
        if (mergeMode) {
            const dragItemIndex = playLists.findIndex(({ id }) => id === draggedItemID);
            const dragOverItemIndex = playLists.findIndex(({ id }) => id === dragOverSet.itemId);
            // console.log("dragItemIndex", dragItemIndex, dragOverItemIndex);
            if (dragOverItemIndex > -1 && dragItemIndex > -1 && dragItemIndex !== dragOverItemIndex) {
                setPlayLists(prev => {
                    const old = [...prev];
                    const oldItem = old[dragItemIndex];
                    old[dragOverItemIndex].list.push({
                        type: "playlist",
                        ...oldItem
                    })
                    old[dragOverItemIndex].nesting += 1;
                    old.splice(dragItemIndex, 1);
                    return old;
                })
            }
        } else {
            toBeSetItems.current && setPlayLists(toBeSetItems.current);
        }
        setDragoverSet({
            itemId: "null",
            position: "Top"
        });
        setDraggedItemID(null);
    };


    // For Greying While PLaying

    const [toggle, setToggle] = useState(false);

    useEffect(() => {
        if (playingPlaylist) {
            globalThis[`${parentId}ToggleGreyCheckPLayingPlaylist`] = setToggle;
            globalThis[`${parentId}SetOpenedList`] = setOpenedList;
        }
        return () => {
            globalThis[`${parentId}SetOpenedList`] = null;
            globalThis[`${parentId}ToggleGreyCheckPLayingPlaylist`] = null;
        }
    }, [toggle, opendedList, playingPlaylist]);

    return <>
        <div onClick={() => extraActions()} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {playLists.length === 0 && <h4 style={{ margin: "8px 0" }} >No Playlists to show.</h4>}
            {playLists.filter(pl => !playingPlaylist ? true : pl.id === playingPlaylist).map(({ name: playlistName, list, id, nesting, toggleRender, description, readingPlanEnabled, dateFormat, attachment, checklistEnabled, color, icon, isCustomColor, isCustomIcon, selectedTags }, index) =>
                <PlaylistRowItem
                    selectPlaylist={selectPlaylist}
                    selectedPlaylists={selectedPlaylists}
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
                />)}
        </div>
    </>
}

return PlaylistList;