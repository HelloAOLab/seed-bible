os.unregisterApp("playlist-cont-ui");
os.registerApp("playlist-cont-ui");

const { useState, useEffect, useMemo } = os.appHooks;
const { Input, Modal, Button, ButtonsCover, Tooltip } = Components;

const PlaylistCont = await thisBot.PlaylistContainer();
// const PlaylistInfoItem = await thisBot.PlaylistInfoItem();
const History = await thisBot.History();
const CollectionsContainer = await thisBot.Collections();
// <PlaylistInfoItem />


const Playlist = ({id}) => {

    const [SplitAppPanel2, setSplitAppPanel2] = useState(null);

    // Hide / Show
    const [hide, setHide] = useState(false);

    const [editData, setEditData] = useState({
        color: null,
        id: null,
        name: null,
        description: null,
        icon: null
    });

    const isCustomIcon = (editData.icon || '')?.startsWith("https");

    const [queueOpen, setQueueOpen] = useState(false);

    useEffect(() => {
        globalThis.SetIsQueuePlaying = setQueueOpen;
    }, [queueOpen]);

    const [viewHistroy, setViewHistory] = useState(0);
    const [openModal, setOpenModal] = useState(false);

    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        globalThis.SetSidebarOpen = setSidebarOpen;
    }, [sidebarOpen]);

    const [open, setOpen] = useState(false);

    const [playingPlaylist, setPlayingPlaylist] = useState(false);


    const [playlists, setPlaylist] = useState(globalThis.PlaylistsGroups || {
        default: {
            active: true,
            deleteable: false,
            link: ''
        },
    });

    useEffect(() => {
        globalThis.isUIOpen = open;
    }, [open]);

    useEffect(() => {
        globalThis.SetHidePlaylist = setHide;
        globalThis.IsHidden = hide;
        return () => {
            globalThis.SetHidePlaylist = null
        }
    }, [hide]);


    const onAddPlaylist = () => {
        setPlaylist((prev) => {
            const id = createUUID();
            return {
                ...prev,
                [id]: {
                    active: true,
                    deleteable: true,
                    link: ''
                }
            }
        });
        setOpenModal(false);
    }

    useEffect(() => {
        globalThis.PlayingPlaylist = playingPlaylist;
        globalThis.PlaylistsGroups = playlists;
        globalThis.SetPlayingPlaylist = (val) => {
            setPlayingPlaylist(val);
            if (!val) setSplitAppPanel2(val);
        };
        globalThis.SetPlaylistGroups = setPlaylist;
        setPlaylistsLocale(playlists);
        globalThis.SetEditData = setEditData;
        return () => {
            globalThis.PlayingPlaylist = null;
            globalThis.SetPlayingPlaylist = null;
        }
    }, [playingPlaylist, playlists]);

    useEffect(() => {
        globalThis.SetSplitAppPanel2 = setSplitAppPanel2;
        return () => {
            globalThis.SetSplitAppPanel2 = null;
        }
    }, [SplitAppPanel2]);

    const activePlaylists = useMemo(() => {
        let id = null;
        Object.keys(playlists).forEach(pId => {
            const pls = globalThis[`${pId}playlists`];
            if (pls) {
                const plsIndex = pls.findIndex((pl) => pl.id === playingPlaylist);
                if (plsIndex > -1) {
                    id = pId;
                }
            }
        })
        return id ? [id] : Object.keys(playlists);
    }, [playingPlaylist, playlists]);

    const [collections, setCollections] = useState(globalThis.COLLECTIONS || {});
    const [currentCollection, setCurrentCollection] = useState(Object.keys(globalThis.COLLECTIONS || {})?.[0] || "");

    const setCollectionsMiddleware = (newCollections) => {
        const keys = Object.keys(newCollections);
        const oldKeys = Object.keys(collections);
        const firstId = keys?.[0] || "";
        if (!currentCollection || keys.length < oldKeys.length) {
            setCurrentCollection(firstId);
        }
        setCollections(newCollections);
        setCollectionsLocale(newCollections);
    }

    useEffect(() => {
        globalThis.COLLECTIONS = collections;
        globalThis.COLLECTION_SETTER = setCollectionsMiddleware;
    }, [collections, setCollections]);

    const collection = collections[currentCollection]?.collection;

    const collectionName = collections[currentCollection]?.name;


    const buttonConfigs = useMemo(() => [
        // {
        //     label: "History",
        //     value: 1,
        //     onClick: () => {
        //         setViewHistory(1);
        //     },
        //     icon: "history_toggle_off",
        // },
        {
            label: "Playlist",
            value: 0,
            onClick: () => {
                setViewHistory(0);
            },
            icon: "playlist_play",
        },
        // We  will add Collections Later
        // {
        //     label: "Collections",
        //     value: 2,
        //     onClick: () => {
        //         setViewHistory(2);
        //     },
        //     icon: "collections_bookmark",
        // }
    ], [setOpen, setViewHistory, setOpenModal, open]);

    //   <button onClick={() => {
    //                     setOpen(true);
    //                     setOpenModal(true);
    //                 }} className={`playlist-cont-button ${open ? "opened" : ""}`}>
    //                     <span class="material-symbols-outlined">
    //                         playlist_add
    //                     </span>
    //                 </button>
    //                 <button onClick={() => setOpen(p => !p)} className={`playlist-cont-button ${open ? "opened" : ""}`}>
    //                     <span class="material-symbols-outlined">
    //                         {open ? "playlist_remove" : "playlist_play"}
    //                     </span>
    //                 </button>

    useEffect(() => {
        const tt = setTimeout(() => {
            if (globalThis.hasASharedPlaylist) {
                const playlist = (globalThis['defaultplaylists'] || []).find(ele => ele.id === globalThis.hasASharedPlaylist);
                if (globalThis.DragDrop)
                    thisBot.Playlistplaying({
                        playingPlaylist: playlist.id,
                        startIndex: 0,
                        startSubIndex: -1,
                        parentId: 'default',
                        name: playlist.name
                    });
                globalThis.hasASharedPlaylist = false;
            }
        }, 200);
        return () => {
            clearTimeout(tt);
        }
    }, [])

    return <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <style>
            {`.playlist-cont-actions, .playlist-cont-parent {
                --width: ${viewHistroy === 1 ? 400 : viewHistroy === 2 ? ((collection?.length ? 1 : 1) || 1) * 400 : activePlaylists.length * 400}px 
            }`}
        </style>
        <style>{thisBot.tags['Linking.css']}</style>
        <style>{thisBot.tags["PlaylistContainer.css"]}</style>
        <style>{thisBot.tags["playlist.css"]}</style>
        {SplitAppPanel2}
        {openModal && (
            <Modal onClose={() => setOpenModal(false)}>
                <h2 style={{ fontSize: "1rem" }} >Do you want to add another Parallel Playlist?</h2>
                <ButtonsCover>
                    <Button onClick={() => onAddPlaylist()} varient="black">
                        Yes
                    </Button>
                    <Button onClick={() => setOpenModal(false)}>
                        Close
                    </Button>
                </ButtonsCover>
            </Modal >
        )}

        <div
            id="sidebar-bar"
            className={`playlist-cont-parent ${queueOpen && "queueOpen"} ${hide && "hide"} ${sidebarOpen ? "sidebarOpen" : ""}`}
            onPointerEnter={(e) => {
                if (e.currentTarget.id === "sidebar-bar") {
                    setTagMask(gridPortalBot, "portalZoomable", false);
                }
            }}
            onPointerLeave={(e) => {
                if (e.currentTarget.id === "sidebar-bar") {
                    setTagMask(gridPortalBot, "portalZoomable", true);
                }
            }}
        >
            <div>
                <div className={`playlist-cont-actions`}>
                    {editData.id && <span
                        class="material-symbols-outlined unfollow"
                        style={{
                            ...ButtonStyle,
                            fontSize: '24px',
                            padding: '0',
                            border: 'none',
                        }}
                        onClick={() => {
                            globalThis[`setOpenAttachLink`](false);
                            thisBot.resetEditingState({ id: editData.id });
                        }}
                    >
                        arrow_back
                    </span>}
                    {!editData.id && <div className="tabs-playlist">
                        {buttonConfigs.map(({ label, onClick, value, icon }) => <h4
                            onClick={() => onClick()}
                            style={{ width: `${100 / buttonConfigs.length}%` }}
                            className={`tabs-playlist-item ${value === viewHistroy ? 'active' : ''}`} >
                            <span>
                                {label}
                            </span>
                        </h4>)}
                    </div>}
                    {editData.id && <div className="align-center" style={{ marginLeft: '1rem' }}>
                        <div className="playlist-details-icon" style={{ backgroundColor: editData.color }}>
                            {isCustomIcon ?
                                <img src={editData.icon} style={{ width: '24px' }} />
                                :
                                <span class="material-symbols-outlined unfollow">
                                    {editData.icon}
                                </span>
                            }
                        </div>
                        <h4 style={{ marginLeft: '1rem', fontWeight: "500" }}>
                            <b>{editData.name}</b>
                            <p style={{ textAlign: 'left' }}>{editData.description || "No Description"}</p>
                        </h4>
                    </div>}
                    {!editData.id && <span
                        class="material-symbols-outlined unfollow"
                        style={{
                            ...ButtonStyle,
                            fontSize: '24px',
                            padding: '0',
                            border: 'none',
                            marginLeft: 'auto'
                        }}
                        onClick={() => {
                            // setHide(p => !p);
                            // globalThis.SetScreens(1);
                            DataManager.cancelCurrentPlayingSound();
                            // globalThis.SetPlayingPlaylist && globalThis.SetPlayingPlaylist(false);
                            globalThis[`defaultToggleGreyCheckPLayingPlaylist`] && globalThis[`defaultToggleGreyCheckPLayingPlaylist`](null);
                            globalThis.IsQueuePresent = false;
                            // os.unregisterApp("playing-playlist");
                            globalThis.IS_PLAYLIST_ACTIVE = false;
                            setSplitAppPanel2(null);
                            RemoveApplicationByID(id);
                            globalThis.PLAYLIST_PANEL_ID = null;
                            globalThis.makingPlaylist = false;
                            return;
                        }}
                    >
                        close
                    </span>}
                </div>
            </div>
            {viewHistroy === 1 ? <History id="default" playingPlaylist={playingPlaylist} />
                :
                viewHistroy === 2 ? <CollectionsContainer collectionName={collectionName} currentCollection={currentCollection} setCurrentCollection={setCurrentCollection} collection={collection} collections={collections} />
                    :
                    <div style={{ display: "flex", height: '100%' }}>
                        {(activePlaylists).map(ele => <PlaylistCont setOpenModal={setOpenModal} active={playlists[ele].active} playingPlaylist={playingPlaylist} id={ele} key={ele} />)}
                    </div>
            }
        </div>
    </div>
};




// <div className={`playlist-cont-actions  ${open ? "opened" : ""}`}>
//             <button onClick={() => {
//                 setOpen(true);
//                 setViewHistory(1);
//             }} className={`playlist-cont-button ${open ? "opened" : ""}`}>
//                 <span class="material-symbols-outlined">
//                     history_toggle_off
//                 </span>
//             </button>
//             <button onClick={() => {
//                 setOpen(true);
//                 setViewHistory(0);
//             }} className={`playlist-cont-button ${open ? "opened" : ""}`}>
//                 <span class="material-symbols-outlined">
//                     playlist_play
//                 </span>
//             </button>
//             <button onClick={() => {
//                 setOpen(true);
//                 setViewHistory(2);
//             }} className={`playlist-cont-button ${open ? "opened" : ""}`}>
//                 <span class="material-symbols-outlined">
//                     collections_bookmark
//                 </span>
//             </button>

//             <button onClick={() => {
//                 setOpen(true);
//                 setOpenModal(true);
//             }} className={`playlist-cont-button ${open ? "opened" : ""}`}>
//                 <span class="material-symbols-outlined">
//                     playlist_add
//                 </span>
//             </button>
//             <button onClick={() => setOpen(p => !p)} className={`playlist-cont-button ${open ? "opened" : ""}`}>
//                 <span class="material-symbols-outlined">
//                     {open ? "playlist_remove" : "playlist_play"}
//                 </span>
//             </button>
//         </div>
// globalThis.SetSplitAppPanel(<Playlist />)

// os.compileApp("playlist-cont-ui", <Playlist />);

return Playlist;