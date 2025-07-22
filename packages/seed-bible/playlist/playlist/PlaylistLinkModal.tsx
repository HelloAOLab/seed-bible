os.unregisterApp("playlist-link-modal");
os.registerApp("playlist-link-modal");

const ButtonStyle = {
    cursor: "pointer",
    border: "1px solid grey",
    borderRadius: "40px",
    padding: "6px",
    fontSize: "14px",
    marginLeft: "4px",
}

const onClose = () => {
    os.unregisterApp("playlist-link-modal");
    os.unregisterApp('mouseCursor')
}

const playlistParentId = that.parentId;
const id = that.id;
const idsMap = that.idsMap;

const { Input, Modal, Button, ButtonsCover, Tooltip, Select } = Components;
const { useState, useEffect } = os.appHooks;

const PlaylistRowItem = await thisBot.PlaylistRowItem();
let playlistToLink = [];
let initialName = "";

if (idsMap) {
    const ids = Object.keys(idsMap);
    const tempArray = [];
    ids.forEach(id => {
        const pId = idsMap[id];
        const originalPlaylist = globalThis[`${pId}playlists`] || [];

        let plylist = { ...originalPlaylist.find((pl) => pl.id === id) };

        plylist.parentId = pId;
        tempArray.push(plylist);
    });
    playlistToLink = [...tempArray];

} else if (playlistParentId && id) {
    const originalPlaylist = globalThis[`${playlistParentId}playlists`] || [];

    playlistToLink = [{ ...originalPlaylist.find((pl) => pl.id === id) }];

    playlistToLink[0].parentId = playlistParentId;
} else {
    const cc = that?.currentCollection || [];
    playlistToLink = [...cc];
    initialName = that.name;
}

playlistToLink = CLONE_DATA(playlistToLink);

const allPlaylistGroups = globalThis.PlaylistsGroups;

const PlaylistLinkModal = () => {
    const [addList, setAddList] = useState(false);

    const [name, setName] = useState(initialName);
    const [playbackListID, setPlaybackListId] = useState("");
    const [playlistId, setPlaylistId] = useState("");

    const [collection, setCollection] = useState([...playlistToLink]);

    const onCurrentCollectionEdit = ({ data, playlistName, playListId, isDelete = false, index, removeID }) => {
        const currentData = thisBot.CURRENT_ACTIVE_LINK_ITEM_FLOAT;
        if (currentData?.id === data.id) {
            this.CURRENT_ACTIVE_LINK_ITEM_FLOAT = null;
            thisBot.cursorReset();
            return ShowNotification({ message: "Cannot Link with itself!", severity: "error" });
        };
        if (isDelete) {
            setCollection(prev => {
                const old = [...prev];
                const firstI = old.findIndex(e => e.id === playListId);
                if (firstI > -1) {
                    const secondIndex = old[firstI].list.findIndex(e => e.id === removeID);
                    if (secondIndex > -1) {
                        old[firstI].list[secondIndex].links?.splice(index, 1);
                    }
                }
                return old;
            });
        } else {
            setCollection(prev => {
                const old = [...prev];
                const firstI = old.findIndex(e => e.id === currentData.playListId);
                if (firstI > -1) {
                    const secondIndex = old[firstI].list.findIndex(e => e.id === currentData.id);
                    if (secondIndex > -1) {
                        if (old[firstI].list[secondIndex].links) {
                            const isPresent = old[firstI].list[secondIndex].links.findIndex(d => d.id === data.id) > -1;
                            if (isPresent) {
                                ShowNotification({ message: "Already Linked with the Item!", severity: "error" });
                            } else {
                                old[firstI].list[secondIndex].links.push({
                                    ...data,
                                    playlistName,
                                    playListId
                                });
                            }


                        } else {
                            old[firstI].list[secondIndex].links = [{
                                ...data,
                                playlistName,
                                playListId
                            }];
                        }
                    }
                }
                return old;
            });
        }
        this.CURRENT_ACTIVE_LINK_ITEM_FLOAT = null;
        thisBot.cursorReset();
    };

    useEffect(() => {
        globalThis.onCurrentCollectionEdit = onCurrentCollectionEdit;

        return () => {
            globalThis.onCurrentCollectionEdit = null;
        }
    }, [collection]);

    const PLAYBACK_OPTIONS = Object.keys(allPlaylistGroups).map((id, i) => ({
        label: `Playback List ${i + 1}`,
        value: id
    }));

    const PLAYLIST_OPTIONS = (globalThis[`${playbackListID}playlists`] || []).map((playlist) => ({
        label: playlist.name,
        value: playlist.id
    }));


    const onCloseAddList = () => {
        setPlaybackListId('');
        setPlaylistId("");
        setAddList(false);
    }

    const saveCollections = () => {
        if (!name) return ShowNotification({ message: "Please Enter a Name!", severity: "error" });
        const namesPresent = Object.keys(globalThis.COLLECTIONS || {}).map(ele => globalThis.COLLECTIONS[ele].name).filter(n => n !== initialName);
        if (namesPresent.findIndex(nam => nam.toLocaleLowerCase() === name.trim().toLocaleLowerCase()) > -1) return ShowNotification({ message: "Name Already Present!", severity: "error" });
        const idNew = globalThis.EDIT_COLLECTION_ID || createUUID();
        if (globalThis.COLLECTIONS) {
            globalThis.COLLECTIONS = {
                ...globalThis.COLLECTIONS,
                [idNew]: {
                    collection,
                    name: name.trim()
                }
            }
        } else {
            globalThis.COLLECTIONS = {
                [idNew]: {
                    collection,
                    name: name.trim()
                }
            }
        }
        if (globalThis.COLLECTION_SETTER) {
            COLLECTION_SETTER(globalThis.COLLECTIONS);
        }
        globalThis.EDIT_COLLECTION_ID = null;
        onClose();
    }

    return <>
        <Modal sxContainer={{ width: 'auto' }} title={initialName ? "Edit Your Collection" : "Add To Collection"} showIcon={false} styles={{ width: `${(Math.max((collection.length ? 1 : 1), 1) * 396) + 36}px` }} onClose={onClose}>
            <Input value={name} onChangeListener={setName} placeholder="Collection's Name" />
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexDirection: "column" }}>
                {collection.map(coll => <div style={{ display: "flex", flexDirection: "column", maxHeight: "90dvh", width: "100%", overflow: "auto", position: "relative" }}>
                    <PlaylistLinkedContainer playlist={coll} />
                    <span class="material-symbols-outlined unfollow" style={{
                        position: "absolute",
                        top: "15px",
                        right: "15px",
                        background: "white", ...ButtonStyle
                    }}
                        onClick={() => {
                            if (that.id === coll.id) return ShowNotification({ message: "Cannot Delete Original Playlist!", severity: "error" });
                            setCollection(prev => prev.filter(c => c.id !== coll.id));
                        }}
                    >
                        delete
                    </span>
                </div>)}

            </div>
            <ButtonsCover>
                <Button
                    secondary
                    isDisabled={!name}
                    onClick={saveCollections}
                >
                    Save
                </Button>
                <Button onClick={() => setAddList(true)} secondary>
                    {collection.length > 1 ? "Add Another Playlist" : "Add a Playlist"}
                </Button>
                <Button onClick={onClose} secondaryAlt>
                    Close
                </Button>
            </ButtonsCover>
        </Modal>

        {addList && <Modal showIcon={false} onClose={onCloseAddList}>
            <h4>Add Another Playlist:</h4>
            <div style={{ paddingTop: "4px" }} >
                <Select secondary value={playbackListID} onChangeListener={(val) => { setPlaybackListId(val); setPlaylistId("") }} name="Select Playback List:" options={[{ disabled: true, value: "", label: "Select Parallel List" }, ...PLAYBACK_OPTIONS]} />
            </div>
            <div style={{ paddingTop: "4px" }} >
                <Select secondary disabled={PLAYLIST_OPTIONS.length < 1} value={playlistId} onChangeListener={(val) => { setPlaylistId(val); }} name="Select Playlist:" options={[{ disabled: true, value: "", label: "Select Playlist List" }, ...PLAYLIST_OPTIONS]} />
            </div>

            <ButtonsCover>
                <Button onClick={onCloseAddList} secondaryAlt>
                    Close
                </Button>

                <Button
                    secondary
                    isDisabled={!playlistId}
                    onClick={() => {
                        if (collection.findIndex((pl) => pl.id === playlistId) > -1) return ShowNotification({ message: "Playlist Already Present!", severity: "error" });
                        const pl = globalThis[`${playbackListID}playlists`].find(({ id }) => id === playlistId);
                        setCollection(prev => [...prev, pl]);
                        onCloseAddList();
                    }}
                >
                    Add
                </Button>
            </ButtonsCover>
        </Modal>}
    </>
}


// <div style={{ position: "absolute", left: "0.5rem", top: "0.5rem" }} onClick={() => setAddList(true)}>
//     <span style={ButtonStyle} class="material-symbols-outlined">
//         library_add
//     </span>
// </div>
// <div style={{ position: "absolute", right: "0.5rem", top: "0.5rem" }} onClick={() => saveCollections()}>
//     <span style={ButtonStyle} class="material-symbols-outlined">
//         book
//     </span>
// </div>

const PlaylistLinkedContainer = ({ playlist }) => {
    return <PlaylistRowItem
        viewOnly={true}
        linkingMode={true}
        parentId={playlist.parentId}
        playingPlaylist={false}
        handleDragStart={() => { }}
        setOpenedList={() => { }}
        opendedList={playlist.id}
        handleDragOver={() => { }}
        handleDragEnd={() => { }}
        dragOverSet={() => { }}
        id={playlist.id}
        name={playlist.name}
        list={playlist.list}
    />
}

os.compileApp("playlist-link-modal", <PlaylistLinkModal />);