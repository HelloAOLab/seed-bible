os.unregisterApp("playlist-cont-ui");
os.registerApp("playlist-cont-ui", thisBot);
import { getAnnotationRecord, loadAnnotations } from "db.annotations.library";
import { ProjectProvider } from "playlist.playlistMode.useProjectContext";

const RenderIcon = await thisBot.RenderIcon();
const { useState, useLayoutEffect, useMemo, useRef, useCallback } = os.appHooks;

const G = globalThis as any;
const { Modal, Button, ButtonsCover } = G.Components;

const ShowPersonVideoOverlay = await thisBot.ShowPersonVideoOverlay();

const Discover = await thisBot.Discover();
const CreatePlaylistUI = await thisBot.CreatePlaylistUI();
// const PlaylistInfoItem = await thisBot.PlaylistInfoItem();
// const History = await thisBot.History();
// const CollectionsContainer = await thisBot.Collections();
const ShowPlayingContentAnnotation =
  await thisBot.ShowPlayingContentAnnotation();
const EditRichText = await thisBot.EditRichText();
const EditAttachment = await thisBot.EditAttachment();
const AddToPlaylist = await thisBot.AddToPlaylist();

const bibleVizUtils = getBot("system", "bibleVizUtils.main");

if (bibleVizUtils) {
  bibleVizUtils.Initialize();
}
// <PlaylistInfoItem />

const Playlist = () => {
  const IsPlaylistPlaying = G.IsPlaylistPlaying;

  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);

  const [createOptions, setCreateOptions] = useState(false);
  const showPlaylistPosition = useRef(
    getPosition ? getPosition() : { x: 0, y: 0 }
  );

  const [editAnnoData, setEditAnnoData] = useState({
    address: "",
    title: "",
  });

  const [stopPlaylistModal, setStopPlaylistModal] = useState(false);

  G.StopPlayingPlaylistModal = setStopPlaylistModal;

  const GetLabel = useMemo(() => G.GetLabel, []);

  const [showVideoOverlay, setShowVideoOverlay] = useState(false);

  const [annoationData, setAnnotationData] = useState([]);
  const annotationSourcesRef = useRef([]);
  const tagsSourcesRef = useRef([]);
  const [fetchingAnnotation, setFetchingAnnotation] = useState(false);
  const [currentOpenedBook, setCurrentOpenedBook] = useState({
    ...(G.CurrentBookData || {}),
  });

  useLayoutEffect(() => {
    G.SetCurrentBook = setCurrentOpenedBook;
    return () => {
      G.SetCurrentBook = null;
    };
  }, [setCurrentOpenedBook, currentOpenedBook]);

  const [SplitAppPanel2, setSplitAppPanel2] = useState(null);

  const [tab, setTab] = useState(G.currentActiveItem || "discover");

  // Hide / Show
  const [hide, setHide] = useState(false);

  const [editData, setEditData] = useState({
    color: null,
    id: null,
    name: null,
    description: null,
    icon: null,
  });

  const isCustomIcon = (editData.icon || (null as any))?.startsWith("https");

  const [queueOpen, setQueueOpen] = useState(false);

  useLayoutEffect(() => {
    G.SetIsQueuePlaying = setQueueOpen;
  }, [queueOpen]);

  const [viewHistroy, setViewHistory] = useState(0);
  const [openModal, setOpenModal] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(true);

  useLayoutEffect(() => {
    G.SetSidebarOpen = setSidebarOpen;
  }, [sidebarOpen]);

  const [open, setOpen] = useState(false);

  const [playingPlaylist, setPlayingPlaylist] = useState(false);

  const [playlists, setPlaylist] = useState(
    G.PlaylistsGroups || {
      default: {
        active: true,
        deleteable: false,
        link: "",
      },
    }
  );

  useLayoutEffect(() => {
    G.isUIOpen = open;
  }, [open]);

  useLayoutEffect(() => {
    G.SetHidePlaylist = setHide;
    G.IsHidden = hide;
    return () => {
      G.SetHidePlaylist = null;
    };
  }, [hide]);

  const onAddPlaylist = () => {
    setPlaylist((prev: any) => {
      const id = G.createUUID();
      return {
        ...prev,
        [id]: {
          active: true,
          deleteable: true,
          link: "",
        },
      };
    });
    setOpenModal(false);
  };

  useLayoutEffect(() => {
    G.PlayingPlaylist = playingPlaylist;
    G.PlaylistsGroups = playlists;
    G.SetPlayingPlaylist = (val: any) => {
      setPlayingPlaylist(val);
      if (!val) setSplitAppPanel2(val);
    };
    G.SetPlaylistGroups = setPlaylist;
    setPlaylistsLocale(playlists);
    G.SetEditData = setEditData;
    return () => {
      G.PlayingPlaylist = null;
      G.SetPlayingPlaylist = null;
    };
  }, [playingPlaylist, playlists]);

  useLayoutEffect(() => {
    G.SetSplitAppPanel2 = setSplitAppPanel2;
    return () => {
      G.SetSplitAppPanel2 = null;
    };
  }, [SplitAppPanel2]);

  const activePlaylists = useMemo(() => {
    let id = null;
    Object.keys(playlists).forEach((pId) => {
      const pls = G[`${pId}playlists`];
      if (pls) {
        const plsIndex = pls.findIndex((pl: any) => pl.id === playingPlaylist);
        if (plsIndex > -1) {
          id = pId;
        }
      }
    });
    return id ? [id] : Object.keys(playlists);
  }, [playingPlaylist, playlists]);

  const [collections, setCollections] = useState(G.COLLECTIONS || {});
  const [currentCollection, setCurrentCollection] = useState(
    Object.keys(G.COLLECTIONS || {})?.[0] || ""
  );

  const setCollectionsMiddleware = (newCollections: any) => {
    const keys = Object.keys(newCollections);
    const oldKeys = Object.keys(collections);
    const firstId = keys?.[0] || "";
    if (!currentCollection || keys.length < oldKeys.length) {
      setCurrentCollection(firstId);
    }
    setCollections(newCollections);
    setCollectionsLocale(newCollections);
  };

  useLayoutEffect(() => {
    G.COLLECTIONS = collections;
    G.COLLECTION_SETTER = setCollectionsMiddleware;
  }, [collections, setCollections]);

  const collection = collections[currentCollection]?.collection;

  const collectionName = collections[currentCollection]?.name;

  const buttonConfigs = useMemo(
    () => [
      {
        label: t("discover"),
        value: "discover",
        onClick: () => {
          setTab("discover");
        },
        icon: "explore",
      },
      {
        label: t("create"),
        value: "create",
        onClick: () => {
          setTab("create");
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
    ],
    [setTab, playingPlaylist, t]
  );

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

  const apiCallforAnnotationRef = useRef<NodeJS.Timeout | null>(null);
  const [authSwtich, setAuthSwitch] = useState(false);
  const lastFetchAddress = useRef<string | null>(null);
  const lastFetchTab = useRef("discover");

  const [PlaylistIconT, AnnotationIconT] = useMemo(() => {
    return [G.PlaylistIcon, G.AnnotationIcon];
  }, []);

  useLayoutEffect(() => {
    G.currentActiveItem = tab;
    G.setTabPlaylist = setTab;
    G.SetAuthSwtich = setAuthSwitch;
    if (apiCallforAnnotationRef.current) {
      clearTimeout(apiCallforAnnotationRef.current);
      apiCallforAnnotationRef.current = null;
    }
    if (!authBot) return;

    const address = `${authBot?.id}.${currentOpenedBook?.bookId}.${currentOpenedBook?.chapter}`;

    if (
      lastFetchAddress.current === address &&
      annoationData.length > 0 &&
      lastFetchTab.current === tab
    )
      return;

    lastFetchTab.current = tab;
    lastFetchAddress.current = address;

    apiCallforAnnotationRef.current = setTimeout(() => {
      setAnnotationData([]);
      annotationSourcesRef.current = [];
      tagsSourcesRef.current = [];
      apiCallforAnnotationRef.current = null;
      if (!currentOpenedBook?.bookId) return;

      (async () => {
        try {
          setFetchingAnnotation(true);

          let annotations: any = "";

          if (
            G.AnnotationsData[
              `${currentOpenedBook?.bookId}-${currentOpenedBook?.chapter}`
            ]
          ) {
            annotations =
              G.AnnotationsData[
                `${currentOpenedBook?.bookId}-${currentOpenedBook?.chapter}`
              ].data;
            thisBot.fetchAnnotationsData({ ...currentOpenedBook });
            thisBot.fetchAnnotationsData({ ...currentOpenedBook, prev: true });
            thisBot.fetchAnnotationsData({ ...currentOpenedBook, next: true });
          } else {
            annotations = await thisBot.fetchAnnotationsData({
              ...currentOpenedBook,
            });
          }
          if (!annotations) return;

          let { allAnnotations, annotationSources, tagsSources } =
            thisBot.convertAnnotationsToReadableFormat({
              annotations,
              currentOpenedBook,
            });

          allAnnotations = allAnnotations.sort(G.AnnotationSortFunction);
          setFetchingAnnotation(false);
          setAnnotationData(allAnnotations);
          annotationSourcesRef.current = annotationSources;
          tagsSourcesRef.current = tagsSources;
          G.UsedTags = [...tagsSources];
        } catch (e) {
          console.log(e);
          setFetchingAnnotation(false);
        }
      })();
    }, 200);

    return () => {
      G.setTabPlaylist = null;
      G.SetAuthSwtich = null;
    };
  }, [tab, authSwtich, currentOpenedBook]);

  const isLayers = tab === "discover";

  const [editRichText, setEditRichText] = useState({
    id: null,
    text: null,
    parentID: null,
  });

  const [editAttachmentItem, setEditAttachmentItem] = useState({
    id: null,
    parentID: null,
    selectedType: "",
    name: "",
    data: "",
    link: "",
    mediaType: "",
    text: null,
  });

  const onCloseEditRichText = () => {
    setEditRichText({
      id: null,
      text: null,
      parentID: null,
    });
  };

  const onCloseEditAttachmentItem = () => {
    setEditAttachmentItem({
      id: null,
      text: null,
      parentID: null,
      selectedType: "",
      name: "",
      data: "",
      link: "",
      mediaType: "",
    });
  };

  const onKeyUp = useCallback((e: any) => {
    whisper(thisBot, "onKeyUp", {
      keys: [e.key],
    });
  }, []);

  const onKeyDown = useCallback((e: any) => {
    whisper(thisBot, "onKeyDown", {
      keys: [e.key],
    });
  }, []);

  useLayoutEffect(() => {
    const isMobile =
      (window?.innerWidth || gridPortalBot.tags.pixelWidth) <
      G.MOBILE_VIEWPORT_THRESHOLD;
    if (isMobile) {
      G.SetPlaylistForcedHeight && G.SetPlaylistForcedHeight(2);
    }
    if (IsPlaylistPlaying) {
      thisBot.Playlistplaying({
        skipAll: true,
      });
    }
    G.makingPlaylist = true;
    G.setOpenSidebar && G.setOpenSidebar(false);
    G.OpenVideoOverlay = () => setShowVideoOverlay(true);
    G.CloseVideoOverlay = () => setShowVideoOverlay(false);
    G.SetEditAnnoData = setEditAnnoData;
    G.SetAnnotationData = setAnnotationData;
    G.SetShowAddToPlaylist = setShowAddToPlaylist;
    G.SetTab = setTab;
    G.SetEditRichText = setEditRichText;
    G.SetEditAttachmentItem = setEditAttachmentItem;

    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      G.makingPlaylist = false;
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("keydown", onKeyDown);
      G.SetEditRichText = null;
      G.SetEditAnnoData = null;
      os.removeBotListener(thisBot, "onKeyDown", onKeyDown);
      os.removeBotListener(thisBot, "onKeyUp", onKeyUp);
      G.SetTab = null;
      G.isRecording = false;
      G.SelectedItemIDForAttachments = null;
      G.Playlist.RemoveScreenRecordingControls();
      (async () => {
        try {
          await experiment.endRecording();
        } catch (err) {}
      })();
      G.StopVideoRecording = false;
      G.RemoveApplicationByID && G.RemoveApplicationByID(G.PLAYLIST_PANEL_ID);
      G.PLAYLIST_PANEL_ID = null;
      G.IS_PLAYLIST_ACTIVE = false;
      G[`defaultToggleGreyCheckPLayingPlaylist`] &&
        G[`defaultToggleGreyCheckPLayingPlaylist`](null);
      thisBot.CloseFloatingApp();
      G.SetSplitAppPanel2 && G.SetSplitAppPanel2(null);
      G.makingPlaylist = false;
      G.SetMediaURL && G.SetMediaURL(null);
      G.SetVideoSrc && G.SetVideoSrc(null);
      G.SetAnnotationData = null;
      G.SetPlaylistForforcedHeight && G.SetPlaylistForforcedHeight(0);
      G.SetShowAddToPlaylist = null;
    };
  }, []);

  const closeConfirmStopPlaylist = () => {
    setStopPlaylistModal(false);
  };

  const gotoCreate = (isAnnotation = false) => {
    if (G[`${"default"}SetMode`]) {
      if (isAnnotation) {
        G[`${"default"}SetMode`](PlaylistModeTypes.annotations);
      } else {
        G[`${"default"}SetMode`](PlaylistModeTypes.playlist);
      }
    } else {
      G.SetTab("create");
      if (isAnnotation) {
        G[`${"default"}mode`] = PlaylistModeTypes.annotations;
      } else {
        G[`${"default"}mode`] = PlaylistModeTypes.playlist;
      }
    }
    setCreateOptions(false);
  };

  const closePlaylist = () => {
    thisBot.CloseSelf({ force: true });
  };

  const isMobile =
    (window?.innerWidth || gridPortalBot.tags.pixelWidth) <
    G.MOBILE_VIEWPORT_THRESHOLD;

  return (
    <>
      {!!editRichText.id && (
        <EditRichText
          parentID={editRichText.parentID}
          onClose={onCloseEditRichText}
          contentId={editRichText.id}
          text={editRichText.text}
        />
      )}
      {!!editAttachmentItem.id && (
        <EditAttachment
          parentID={editAttachmentItem.parentID}
          onClose={onCloseEditAttachmentItem}
          contentId={editAttachmentItem.id}
          selectedType={editAttachmentItem.selectedType}
          name={editAttachmentItem.name}
          data={editAttachmentItem.data}
          link={editAttachmentItem.link}
          mediaType={editAttachmentItem.mediaType}
        />
      )}

      {stopPlaylistModal && (
        <Modal showIcon={false} onClose={closeConfirmStopPlaylist}>
          <h2 style={{ fontSize: "1rem" }}>
            {t("thisWillStopPlayingPlaylist")}
          </h2>
          <p>{t("playlistCurrentlyPlayingConfirm")}</p>
          <ButtonsCover>
            <Button secondaryAlt onClick={closeConfirmStopPlaylist}>
              {t("no")}
            </Button>
            <Button
              secondary
              onClick={() => {
                G.IsPlaylistPlaying = false;
                G.IsQueuePresent = false;
                thisBot.StopPlayingPlaylist();
                os.unregisterApp("playing-playlist-flaot");
                thisBot.CloseFloatingApp();
                if (G.PendingAction) {
                  G.PendingAction();
                  G.PendingAction = null;
                }
              }}
              variant="black"
            >
              {t("confirm")}
            </Button>
          </ButtonsCover>
        </Modal>
      )}

      {createOptions && (
        <>
          <div className="backdrop" onClick={() => setCreateOptions(false)} />
          <div
            onClick={() => setCreateOptions(false)}
            style={{
              ...showPlaylistPosition.current,
              width: isMobile ? "165px" : "210px",
              maxHeight: "105px",
              left: "none",
              right: isMobile ? "-9rem" : "-12rem",
              padding: "0.5rem",
              top: !isMobile ? "3rem" : "none",
              bottom: !isMobile ? "none" : "11rem",
              marginTop: 45,
            }}
            className="overlay linked-item-custom"
          >
            <div
              className="more-menu-items"
              onClick={(e) => {
                e.stopPropagation();
                if (SplitAppPanel2) {
                  G.PendingAction = gotoCreate;
                  G.StopPlayingPlaylistModal(true);
                  return;
                }
                gotoCreate();
              }}
            >
              <div className="align-center" style={{ gap: "0.5rem" }}>
                <PlaylistIconT />
                <span
                  style={{ fontFamily: `"Satoshi", system-ui, sans-serif` }}
                >
                  {t("playlist")}
                </span>
              </div>
            </div>
            <div
              className="more-menu-items"
              onClick={(e) => {
                // if not login show notification
                if (!authBot?.id) {
                  ShowNotification({
                    message: t("pleaseLoginToUseFeature"),
                    severity: "error",
                  });
                  shout("tryUserLogin");
                  return;
                }
                e.stopPropagation();
                if (SplitAppPanel2) {
                  G.PendingAction = () => gotoCreate(true);
                  G.StopPlayingPlaylistModal(true);
                  return;
                }
                gotoCreate(true);
              }}
            >
              <div className="align-center" style={{ gap: "0.5rem" }}>
                <AnnotationIconT />
                <span
                  style={{ fontFamily: `"Satoshi", system-ui, sans-serif` }}
                >
                  {t("annotation")}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          containerType: "inline-size" /* Enables container query */,
        }}
      >
        {showVideoOverlay && <ShowPersonVideoOverlay />}
        <ProjectProvider>
          <div
            style={{
              width: "100%",
              position: "relative",
              flexGrow: "1",
              overflow: "auto",
            }}
          >
            <style>
              {`.playlist-cont-actions, .playlist-cont-parent {
                            --width: ${
                              viewHistroy === 1
                                ? 400
                                : viewHistroy === 2
                                  ? ((collection?.length ? 1 : 1) || 1) * 400
                                  : activePlaylists.length * 400
                            }px 
                        }`}
            </style>

            <style>{thisBot.tags["Linking.css"]}</style>
            <style>{thisBot.tags["PlaylistContainer.css"]}</style>
            <style>{thisBot.tags["playlist.css"]}</style>
            {SplitAppPanel2}
            {openModal && (
              <Modal onClose={() => setOpenModal(false)}>
                <h2 style={{ fontSize: "1rem" }}>
                  {t("addAnotherParallelPlaylist")}
                </h2>
                <ButtonsCover>
                  <Button onClick={() => onAddPlaylist()} varient="black">
                    {t("yes")}
                  </Button>
                  <Button onClick={() => setOpenModal(false)}>
                    {t("close")}
                  </Button>
                </ButtonsCover>
              </Modal>
            )}

            <div
              id={`sidebar-bar`}
              className={`playlist-cont-parent ${
                IsPlaylistPlaying ? "playing-playlist" : ""
              } ${queueOpen && "queueOpen"} ${hide && "hide"} ${
                sidebarOpen ? "sidebarOpen" : ""
              }`}
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
              {(isLayers || !!editData.id) && (
                <div>
                  <div
                    className={`playlist-cont-actions`}
                    style={{ padding: !editData.id ? "" : "12px" }}
                  >
                    {editData.id && (
                      <span
                        class="material-symbols-outlined unfollow"
                        style={{
                          ...G.ButtonStyle,
                          fontSize: "24px",
                          padding: "0",
                          border: "none",
                        }}
                        onClick={() => {
                          G[`setOpenAttachLink`](false);
                          thisBot.resetEditingState({ id: editData.id });
                        }}
                      >
                        arrow_back
                      </span>
                    )}
                    {!editData.id && isLayers && (
                      <div
                        className="tabs-playlist-off"
                        style={{
                          width: "100%",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        {[buttonConfigs[0]].map((ele: any) => {
                          const { label, onClick, value, icon } = ele;
                          return (
                            <h4
                              onClick={() => {
                                if (SplitAppPanel2) {
                                  G.PendingAction = onClick;
                                  G.StopPlayingPlaylistModal(true);
                                  return;
                                }
                                onClick();
                              }}
                              style={{
                                width: `${75}%`,
                              }}
                              className={`tabs-playlist-item`}
                            >
                              <span
                                onClick={closePlaylist}
                                className="show-on-mobile material-symbols-outlined"
                              >
                                keyboard_backspace
                              </span>
                              <span
                                className="material-symbols-outlined unfollow"
                                style={{ fontSize: "20px" }}
                              >
                                {icon}
                              </span>
                              <span>
                                {label}{" "}
                                <GetLabel
                                  widthCompare={isMobile ? 360 : 264}
                                  value={value}
                                  currentOpenedBook={currentOpenedBook}
                                />
                              </span>
                            </h4>
                          );
                        })}
                        <Button
                          onClick={() => {
                            setCreateOptions(true);
                          }}
                          secondary
                          style={{ color: "var(--pageTextColor)" }}
                          exClass="create-button show-on-desktop"
                        >
                          <span
                            class="material-symbols-outlined"
                            style={{ color: "var(--primaryColor)" }}
                          >
                            add
                          </span>
                          <p style={{ color: "var(--primaryColor)" }}>
                            {t("create")}
                          </p>
                        </Button>
                        <span
                          onClick={() => {
                            thisBot.CloseSelf();
                          }}
                          class="material-symbols-outlined show-on-mobile"
                          style={{
                            fontSize: "24px",
                            margin: "0 0.5rem",
                          }}
                        >
                          close
                        </span>
                        <Button
                          onClick={() => {
                            setCreateOptions(true);
                          }}
                          secondary
                          exClass="create-button-mobile show-on-mobile"
                        >
                          <span
                            class={`material-symbols-outlined ${createOptions ? "rotate-90" : ""}`}
                          >
                            add
                          </span>
                        </Button>
                      </div>
                    )}

                    {editData.id && (
                      <div
                        className="align-center"
                        style={{ marginLeft: "1rem" }}
                      >
                        <RenderIcon
                          isAllowSet
                          isCustomIcons={isCustomIcon}
                          icon={editData.icon}
                          list={[]}
                        />
                        <h4 style={{ marginLeft: "1rem", fontWeight: "500" }}>
                          <b>{editData.name}</b>
                          <p style={{ textAlign: "left" }}>
                            {editData.description || t("noDescription")}
                          </p>
                        </h4>
                      </div>
                    )}
                    {false && !editData.id && (
                      <span
                        class="material-symbols-outlined unfollow"
                        style={{
                          ...G.ButtonStyle,
                          fontSize: "24px",
                          padding: "0",
                          border: "none",
                          marginLeft: "auto",
                        }}
                        onClick={() => {
                          // setHide(p => !p);
                          // globalThis.SetScreens(1);
                          thisBot.CloseFloatingApp();
                          G.DataManager.cancelCurrentPlayingSound();
                          // globalThis.SetPlayingPlaylist && globalThis.SetPlayingPlaylist(false);
                          G[`defaultToggleGreyCheckPLayingPlaylist`] &&
                            G[`defaultToggleGreyCheckPLayingPlaylist`](null);
                          G.IsQueuePresent = false;
                          // os.unregisterApp("playing-playlist");

                          G.IS_PLAYLIST_ACTIVE = false;
                          G.SET_SHOW_CHECK && G.SET_SHOW_CHECK(false);
                          setSplitAppPanel2(null);
                          G.RemoveApplicationByID &&
                            G.RemoveApplicationByID(G.PLAYLIST_PANEL_ID);
                          G.PLAYLIST_PANEL_ID = null;
                          G.makingPlaylist = false;
                          return;
                        }}
                      >
                        {t("close")}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {isLayers ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    overflow: "auto",
                    paddingBottom: SplitAppPanel2 ? "0rem" : "0",
                    height: `calc(100% - ${
                      playingPlaylist || !!editData.id ? "130px" : "40px"
                    })`,
                  }}
                >
                  <Discover
                    setAnnotationData={setAnnotationData}
                    editingPlaylist={editData.id}
                    currentOpenedBook={currentOpenedBook}
                    fetchingAnnotation={fetchingAnnotation}
                    chapter={currentOpenedBook?.chapter}
                    annotationData={annoationData}
                    style={{ height: `100%` }}
                    setOpenModal={setOpenModal}
                    playingPlaylist={playingPlaylist}
                    annotationSources={annotationSourcesRef.current}
                    tagsSources={tagsSourcesRef.current}
                  />
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    overflow: "auto",
                    height: `calc(100% - ${
                      playingPlaylist || !!editData.id ? "90px" : "0px"
                    })`,
                  }}
                >
                  <CreatePlaylistUI
                    editData={editAnnoData}
                    setTab={setTab}
                    isCreate
                    setOpenModal={setOpenModal}
                    active={true}
                    playingPlaylist={playingPlaylist}
                    id="default"
                  />
                </div>
              )}
            </div>
            {showAddToPlaylist && (
              <AddToPlaylist
                id="default"
                onClose={() => setShowAddToPlaylist(false)}
              />
            )}
          </div>
        </ProjectProvider>
        {!!isLayers && !playingPlaylist && !editData.id && (
          <ShowPlayingContentAnnotation />
        )}
      </div>
    </>
  );
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
