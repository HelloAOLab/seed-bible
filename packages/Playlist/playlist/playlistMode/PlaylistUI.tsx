os.unregisterApp("playlist-cont-ui");
os.registerApp("playlist-cont-ui");
import { getUserRecord, loadAnnotations } from "db.annotations.library";
import { ProjectProvider } from "playlist.playlistMode.useProjectContext";
const RenderIcon = await thisBot.RenderIcon();

const { useState, useLayoutEffect, useMemo, useRef, useCallback } = os.appHooks;
const { Input, Modal, Button, ButtonsCover, Tooltip } = Components;

const ShowPersonVideoOverlay = await thisBot.ShowPersonVideoOverlay();

const Discover = await thisBot.Discover();
const CreatePlaylistUI = await thisBot.CreatePlaylistUI();
// const PlaylistInfoItem = await thisBot.PlaylistInfoItem();
// const History = await thisBot.History();
// const CollectionsContainer = await thisBot.Collections();
const ShowPlayingContentAnnotation = await thisBot.ShowPlayingContentAnnotation();
const EditRichText = await thisBot.EditRichText();
const EditAttachment = await thisBot.EditAttachment();

const bibleVizUtils = getBot("system","bibleVizUtils.main");

if(bibleVizUtils) {
    bibleVizUtils.Initialize();
}
// <PlaylistInfoItem />

const sortFunc = (a, b) => {
    const getOrder = (heading) => {
        if (heading.startsWith("Chapter")) return { order: 0, num: 0 };
        const match = heading.match(/Verse (\d+)(?:-(\d+))?/);
        if (match) {
            const num = parseInt(match[1], 10);
            return { order: 1, num: num };
        }
        return { order: 2, num: 0 }; // fallback for unexpected headings
    };

    const aOrder = getOrder(a.heading);
    const bOrder = getOrder(b.heading);

    if (aOrder.order !== bOrder.order) {
        return aOrder.order - bOrder.order;
    }

    return aOrder.num - bOrder.num;
};


const Playlist = () => {

    const IsPlaylistPlaying = globalThis.IsPlaylistPlaying;

    const [editAnnoData, setEditAnnoData] = useState({
        address: '',
        title: ''
    });

    const [stopPlaylistModal, setStopPlaylistModal] = useState(false);

    globalThis.StopPlayingPlaylistModal = setStopPlaylistModal;

    const [showVideoOverlay, setShowVideoOverlay] = useState(false);

    const [annoationData, setAnnotationData] = useState([]);
    const [fetchingAnnotation, setFetchingAnnotation] = useState(false);
    const [currentOpenedBook, setCurrentOpenedBook] = useState({ ...(globalThis.CurrentBookData || {}) });

    useLayoutEffect(() => {
        globalThis.SetCurrentBook = setCurrentOpenedBook
        return () => {
            globalThis.SetCurrentBook = null;
        }
    }, [setCurrentOpenedBook, currentOpenedBook]);


    const [SplitAppPanel2, setSplitAppPanel2] = useState(null);

    const [tab, setTab] = useState('discover');

    // Hide / Show
    const [hide, setHide] = useState(false);

    const [editData, setEditData] = useState({
        color: null,
        id: null,
        name: null,
        description: null,
        icon: null
    });

    const isCustomIcon = (editData.icon || null)?.startsWith("https");

    const [queueOpen, setQueueOpen] = useState(false);

    useLayoutEffect(() => {
        globalThis.SetIsQueuePlaying = setQueueOpen;
    }, [queueOpen]);

    const [viewHistroy, setViewHistory] = useState(0);
    const [openModal, setOpenModal] = useState(false);

    const [sidebarOpen, setSidebarOpen] = useState(true);

    useLayoutEffect(() => {
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

    useLayoutEffect(() => {
        globalThis.isUIOpen = open;
    }, [open]);

    useLayoutEffect(() => {
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

    useLayoutEffect(() => {
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

    useLayoutEffect(() => {
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

    useLayoutEffect(() => {
        globalThis.COLLECTIONS = collections;
        globalThis.COLLECTION_SETTER = setCollectionsMiddleware;
    }, [collections, setCollections]);

    const collection = collections[currentCollection]?.collection;

    const collectionName = collections[currentCollection]?.name;

    const buttonConfigs = useMemo(() => [
        {
            label: "Discover",
            value: 'discover',
            onClick: () => {
                setTab('discover');
            },
            icon: "explore",
        },
        {
            label: "Create",
            value: 'create',
            onClick: () => {
                setTab('create');
            },
            icon: "note_stack_add",
        },

        // We  will add Collections Later
        // {
        //     label: "Collections",
        //     value: 2,
        //     onClick: () => {
        //         setTab(2);
        //     },
        //     icon: "collections_bookmark",
        // }
    ], [setTab, playingPlaylist]);

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


    const apiCallforAnnotationRef = useRef(null);
    const lastFetchAddress = useRef(null);
    const lastFetchTab = useRef('discover');
    const [playlistSharerName, setPLaylistSharerName] = useState('');
    const currentProfileNameRef = useRef('');

    useLayoutEffect(() => {
        globalThis.currentActiveItem = tab;
        globalThis.setTabPlaylist = setTab;

        if (apiCallforAnnotationRef.current) {
            clearTimeout(apiCallforAnnotationRef.current);
            apiCallforAnnotationRef.current = null;
        }
        if (!authBot) return;


        const address = `${authBot?.id}.${currentOpenedBook?.bookId}.${currentOpenedBook?.chapter}`;

        if ((lastFetchAddress.current === address && annoationData.length > 0 && lastFetchTab.current === tab)) return;

        lastFetchTab.current = tab;
        lastFetchAddress.current = address;

        apiCallforAnnotationRef.current = setTimeout(() => {
            setAnnotationData([]);
            apiCallforAnnotationRef.current = null;
            if (!currentOpenedBook?.bookId) return;

            (async () => {
                try {
                    setFetchingAnnotation(true);

                    const userRecord = await getUserRecord();

                    const annotations = await loadAnnotations(userRecord, currentOpenedBook?.bookId, currentOpenedBook?.chapter);
                    let allAnnotations = [];

                    annotations.forEach((ele) => {
                        const data = {
                            bookid: currentOpenedBook?.bookId,
                            chapter: currentOpenedBook?.chapter,
                        };
                        const innerele = ele?.data?.data;

                        if (!!innerele.additionalInfo) {
                            const tags = [...(ele.data.chronicle_tags || [])];
                            const layers = [...innerele.additionalInfo.layers];

                            if (innerele?.type === "chapter") {
                                data.heading = 'Chapter';
                                data.data = [...layers];
                                data.tags = [...tags];
                                data.address = ele.id;
                            }
                            if (innerele?.type === "verse-grouped") {
                                const verses = [...innerele.additionalInfo.verse];
                                const length = verses.length;
                                data.heading = `Verse ${verses[0]}-${verses[length - 1]}`;
                                data.data = [...layers];
                                data.tags = [...tags];
                                data.address = ele.id;
                            };

                            if (innerele?.type === 'verse') {
                                data.heading = `Verse ${innerele.additionalInfo.verse}`;
                                data.data = [...layers];
                                data.tags = [...tags];
                                data.address = ele.id;
                            };
                        }

                        if (!!data.address || true) {
                            allAnnotations.push(data);
                        }
                    });

                    allAnnotations = allAnnotations.sort(sortFunc);

                    setFetchingAnnotation(false);
                    setAnnotationData(allAnnotations);
                } catch (e) {
                    setFetchingAnnotation(false);
                }
            })();
        }, 200)

        return () => {
            globalThis.currentActiveItem = null;
            globalThis.setTabPlaylist = null;
        }
    }, [tab, currentOpenedBook]);


    const isLayers = tab === 'discover';

    const [editRichText, setEditRichText] = useState({
        id: null,
        text: null,
        parentID: null
    });

    const [editAttachmentItem, setEditAttachmentItem] = useState({
        id: null,
        parentID: null,
        selectedType: '',
        name: '',
        data: '',
        link: '',
        mediaType: '',
    });

    const onCloseEditRichText = () => {
        setEditRichText({
            id: null,
            text: null,
            parentID: null,
        });
    }


    const onCloseEditAttachmentItem = () => {
        setEditAttachmentItem({
            id: null,
            text: null,
            parentID: null,
            selectedType: '',
            name: '',
            data: '',
            link: '',
            mediaType: '',
        });
    }

    const onKeyUp = useCallback((e) => {
        whisper(thisBot, 'onKeyUp', {
            keys: [e.key]
        })
    }, []);

    const onKeyDown = useCallback((e) => {
        whisper(thisBot, 'onKeyDown', {
            keys: [e.key]
        })
    }, []);

    useLayoutEffect(() => {
        const isMobile = (window?.innerWidth || gridPortalBot.tags.pixelWidth) < MOBILE_VIEWPORT_THRESHOLD;
        console.log(isMobile,MOBILE_VIEWPORT_THRESHOLD,gridPortalBot.tags.pixelWidth,window.innerWidth);
        if(isMobile){
            globalThis.SetPlaylistForcedHeight && globalThis.SetPlaylistForcedHeight(true);
        }
        if (IsPlaylistPlaying) {
            thisBot.Playlistplaying({
                skipAll: true,
            })
        }
        globalThis.makingPlaylist = true;
        globalThis.setOpenSidebar && globalThis.setOpenSidebar(false);
        globalThis.OpenVideoOverlay = () => setShowVideoOverlay(true);
        globalThis.CloseVideoOverlay = () => setShowVideoOverlay(false);
        globalThis.SetEditAnnoData = setEditAnnoData;
        globalThis.SetTab = setTab;
        globalThis.SetEditRichText = setEditRichText;
        globalThis.SetEditAttachmentItem = setEditAttachmentItem;
        const tt = setTimeout(async () => {
            if (globalThis.hasASharedPlaylist) {
                const nameOfSharer = globalThis.shareProfileName;
                let currentProfileName = "Guest";
                const authBot = await os.requestAuthBotInBackground();
                if (authBot?.id) {
                    const data = await os.getData(tags.key, authBot.id);
                    if (data.success) {
                        const payload = data.data
                        currentProfileName = payload.profileName || "Guest";
                    }
                }
                setPLaylistSharerName(nameOfSharer);
                currentProfileNameRef.current = currentProfileName;
                globalThis.shareProfileName = false;
            }
        }, 200);

        document.addEventListener('keyup', onKeyUp);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            globalThis.makingPlaylist = false;
            document.removeEventListener('keyup', onKeyUp);
            document.removeEventListener('keydown', onKeyDown);
            globalThis.SetEditRichText = null;
            globalThis.SetEditAnnoData = null;
            clearTimeout(tt);
            os.removeBotListener(thisBot, "onKeyDown");
            os.removeBotListener(thisBot, "onKeyUp");
            globalThis.SetTab = null;
            globalThis.isRecording = false;
            globalThis.SelectedItemIDForAttachments = null;
            globalThis.Playlist.RemoveScreenRecordingControls();
            (async () => {
                try {
                    await experiment.endRecording();
                } catch (err) { }
            })();
            globalThis.StopVideoRecording = false;
            globalThis.RemoveApplicationByID && globalThis.RemoveApplicationByID(globalThis.PLAYLIST_PANEL_ID);
            globalThis.PLAYLIST_PANEL_ID = null;
            globalThis.IS_PLAYLIST_ACTIVE = false;
            globalThis[`defaultToggleGreyCheckPLayingPlaylist`] &&
                globalThis[`defaultToggleGreyCheckPLayingPlaylist`](null);
            thisBot.CloseFloatingApp();
            globalThis.SetSplitAppPanel2 && globalThis.SetSplitAppPanel2(null);
            globalThis.makingPlaylist = false;
            globalThis.SetMediaURL && globalThis.SetMediaURL(null);
            globalThis.SetVideoSrc && globalThis.SetVideoSrc(null);
            globalThis.SetPlaylistForcedHeight && globalThis.SetPlaylistForcedHeight(false);
        }
    }, []);

    const onCloseSharPlaylistModal = () => {
        setPLaylistSharerName('');
        globalThis.hasASharedPlaylist = false;
    }

    const playlistShared = useMemo(() => (globalThis[`${'default'}playlists`] || []).find(ele => ele.id === globalThis.hasASharedPlaylist) || {}, []);

    const closeConfirmStopPlaylist = () => {
        setStopPlaylistModal(false);
    }

    return (
        <>
            {!!editRichText.id && <EditRichText parentID={editRichText.parentID} onClose={onCloseEditRichText} contentId={editRichText.id} text={editRichText.text} />}
            {!!editAttachmentItem.id && <EditAttachment
                parentID={editAttachmentItem.parentID}
                onClose={onCloseEditAttachmentItem}
                contentId={editAttachmentItem.id}
                selectedType={editAttachmentItem.selectedType}
                name={editAttachmentItem.name}
                data={editAttachmentItem.data}
                link={editAttachmentItem.link}
                mediaType={editAttachmentItem.mediaType}
            />}
            {!!playlistSharerName && <Modal sxContainer={{ width: '460px' }} title="Welcome to Seed Bible" showIcon={false} onClose={onCloseSharPlaylistModal}>
                <div className="welcome-box">
                    <img src="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/08ff23d5216230e0fe9b9c0f80b8192aee35c320d4c87e60046e7cc396d8f5a7.svg" alt="share" />
                    <div className="align-center" style={{ gap: '1rem' }}>
                        <img className="welcome-box-profile" src={globalThis.shareProfilePic} alt={playlistSharerName || "Kusharg karki"} />
                        <p> <b>{playlistSharerName}</b> shared a playlist.</p>
                    </div>
                    <div className="welcome-box-content" style={{
                        alignItems: !playlistShared.description ? "center" : "flex-start"
                    }}>
                        <RenderIcon
                            isCustomIcons={playlistShared.isCustomIcon}
                            icon={playlistShared.icon}
                            list={playlistShared.list}
                        />
                        <div className="welcome-details">
                            <h4 style={{ fontSize: !!playlistShared.description ? "1rem" : "1.125rem" }}>{playlistShared.name}</h4>
                            {!!playlistShared.description && <p>{playlistShared.description}</p>}
                        </div>
                    </div>
                    <Button
                        secondary
                        style={{
                            width: '205px'
                        }}
                        onClick={() => {
                            if (globalThis.DragDrop)
                                thisBot.Playlistplaying({
                                    playingPlaylist: playlistShared.id,
                                    startIndex: 0,
                                    startSubIndex: -1,
                                    parentId: 'default',
                                    name: playlistShared.name
                                });
                            setPLaylistSharerName('');
                            globalThis.hasASharedPlaylist = false;
                        }}>
                        Start
                    </Button>
                </div>
            </Modal >}

            {stopPlaylistModal &&
                <Modal showIcon={false} onClose={closeConfirmStopPlaylist}>
                    <h2 style={{ fontSize: "1rem" }}>This will stop playing playlist.</h2>
                    <p>A playlist is currently playing. Do you want to stop it to continue?</p>
                    <ButtonsCover>
                        <Button
                            secondary
                            onClick={() => {
                                globalThis.IsPlaylistPlaying = false;
                                globalThis.IsQueuePresent = false;
                                thisBot.StopPlayingPlaylist();
                                os.unregisterApp("playing-playlist-flaot");
                                thisBot.CloseFloatingApp();
                                if (globalThis.PendingAction) {
                                    globalThis.PendingAction();
                                    globalThis.PendingAction = null;
                                }
                            }}
                            variant="black"
                        >
                            Confirm
                        </Button>
                        <Button
                            secondaryAlt
                            onClick={closeConfirmStopPlaylist}
                        >
                            No
                        </Button>
                    </ButtonsCover>
                </Modal>
            }
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    containerType: "inline-size" /* Enables container query */
                }}
            >
                {showVideoOverlay && <ShowPersonVideoOverlay />}
                <ProjectProvider>
                    <div
                        style={{
                            width: '100%',
                            position: 'relative',
                            flexGrow: "1",
                            overflow: 'auto'
                        }}

                    >
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
                            id={`sidebar-bar`}
                            className={`playlist-cont-parent ${IsPlaylistPlaying ? "playing-playlist" :""} ${queueOpen && "queueOpen"} ${hide && "hide"} ${sidebarOpen ? "sidebarOpen" : ""}`}
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
                                <div className={`playlist-cont-actions`} style={{ padding: !editData.id ? '' : '12px' }}>
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
                                    {!editData.id && <div className="tabs-playlist" style={{ width: '100%' }}>
                                        {buttonConfigs.map(({ label, onClick, value, icon }) => <h4
                                            onClick={() => {
                                                if (SplitAppPanel2) {
                                                    globalThis.PendingAction = onClick;
                                                    globalThis.StopPlayingPlaylistModal(true);
                                                    return;
                                                }
                                                onClick();
                                            }}
                                            style={{ width: `${100 / buttonConfigs.length}%` }}
                                            className={`tabs-playlist-item ${value === tab ? 'active' : ''}`} >
                                            <span className='material-symbols-outlined unfollow' style={{ fontSize: '20px' }}>
                                                {icon}
                                            </span>
                                            <span>
                                                {label} {value === 'discover' ? `${currentOpenedBook?.book} - ${currentOpenedBook?.chapter} ` : ''}
                                            </span>
                                        </h4>)}
                                    </div>}
                                    {editData.id && <div className="align-center" style={{ marginLeft: '1rem' }}>
                                        <RenderIcon
                                            isAllowSet
                                            isCustomIcons={isCustomIcon}
                                            icon={editData.icon}
                                            list={[]}
                                        />
                                        <h4 style={{ marginLeft: '1rem', fontWeight: "500" }}>
                                            <b>{editData.name}</b>
                                            <p style={{ textAlign: 'left' }}>{editData.description || "No description"}</p>
                                        </h4>
                                    </div>}
                                    {false && !editData.id && <span
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
                                            thisBot.CloseFloatingApp();
                                            DataManager.cancelCurrentPlayingSound();
                                            // globalThis.SetPlayingPlaylist && globalThis.SetPlayingPlaylist(false);
                                            globalThis[`defaultToggleGreyCheckPLayingPlaylist`] && globalThis[`defaultToggleGreyCheckPLayingPlaylist`](null);
                                            globalThis.IsQueuePresent = false;
                                            // os.unregisterApp("playing-playlist");

                                            globalThis.IS_PLAYLIST_ACTIVE = false;
                                            globalThis.SET_SHOW_CHECK && globalThis.SET_SHOW_CHECK(false);
                                            setSplitAppPanel2(null);
                                            globalThis.RemoveApplicationByID && globalThis.RemoveApplicationByID(globalThis.PLAYLIST_PANEL_ID);
                                            globalThis.PLAYLIST_PANEL_ID = null;
                                            globalThis.makingPlaylist = false;
                                            return;
                                        }}
                                    >
                                        close
                                    </span>}
                                </div>
                            </div>
                            {isLayers ?
                                <div style={{ display: "flex", flexDirection: 'column', overflow: 'auto', paddingBottom: !!SplitAppPanel2 ? "0rem" : "0", height: `calc(100% - ${playingPlaylist || !!editData.id ? '130px' : '40px'})` }}>
                                    <Discover setAnnotationData={setAnnotationData} editingPlaylist={editData.id} currentOpenedBook={currentOpenedBook} fetchingAnnotation={fetchingAnnotation} chapter={currentOpenedBook?.chapter} annotationData={annoationData} style={{ height: `100%` }} setOpenModal={setOpenModal} playingPlaylist={playingPlaylist} />
                                </div>
                                :
                                <div style={{ display: "flex", overflow: 'scroll', overflow: 'auto', height: `calc(100% - ${playingPlaylist || !!editData.id ? '90px' : '0px'})` }}>
                                    <CreatePlaylistUI editData={editAnnoData} setTab={setTab} isCreate setOpenModal={setOpenModal} active={true} playingPlaylist={playingPlaylist} id='default' />
                                </div>
                            }
                        </div>
                    </div>
                </ProjectProvider>
                {!!isLayers && !playingPlaylist && !editData.id && <ShowPlayingContentAnnotation />}
            </div>
        </>)
};


// {viewHistroy === 1 ? <History id="default" playingPlaylist={playingPlaylist} />
//     :
//     viewHistroy === 2 ? <CollectionsContainer collectionName={collectionName} currentCollection={currentCollection} setCurrentCollection={setCurrentCollection} collection={collection} collections={collections} />
//         :
//         <div style={{ display: "flex", height: `calc(100% - ${playingPlaylist || !!editData.id ? '90px' : '0px'})` }}>
//             {(activePlaylists).map(ele => <PlaylistCont setOpenModal={setOpenModal} active={playlists[ele].active} playingPlaylist={playingPlaylist} id={ele} key={ele} />)}
//         </div>
// }



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