os.unregisterApp("playlist-cont-ui");
os.registerApp("playlist-cont-ui");
import { getAnnotationRecord, loadAnnotations } from "db.annotations.library";
import { ProjectProvider } from "playlist.playlistMode.useProjectContext";

const RenderIcon = await thisBot.RenderIcon();
const { useState, useLayoutEffect, useMemo, useRef, useCallback } = os.appHooks;
const { Modal, Button, ButtonsCover } = Components;

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

const bibleVizUtils = getBot("system", "bibleVizUtils.main");

if (bibleVizUtils) {
  bibleVizUtils.Initialize();
}
// <PlaylistInfoItem />

const sortFunc = (a, b) => {
  const parseHeading = (heading = "") => {
    // 1️⃣ Chapter always first
    if (heading.startsWith("Chapter")) {
      return { group: 0, start: 0, length: heading.length };
    }

    // 2️⃣ Verse logic
    const match = heading.match(/Verse\s*(\d+)/);
    if (match) {
      return {
        group: 1,
        start: Number(match[1]), // starting verse
        length: heading.length,
      };
    }

    // 3️⃣ Everything else
    return {
      group: 2,
      start: Infinity,
      length: heading.length,
    };
  };

  const A = parseHeading(a.heading);
  const B = parseHeading(b.heading);

  // Group order: Chapter → Verse → Others
  if (A.group !== B.group) {
    return A.group - B.group;
  }

  // Verse number comparison
  if (A.start !== B.start) {
    return A.start - B.start;
  }

  // Length comparison (shorter first)
  if (A.length !== B.length) {
    return B.length - A.length;
  }

  // Final fallback
  return a.heading.localeCompare(b.heading);
};

const Playlist = () => {
  const IsPlaylistPlaying = globalThis.IsPlaylistPlaying;

  const [createOptions, setCreateOptions] = useState(false);
  const showPlaylistPosition = useRef(
    getPosition ? getPosition() : { x: 0, y: 0 }
  );

  const [editAnnoData, setEditAnnoData] = useState({
    address: "",
    title: "",
  });

  const [stopPlaylistModal, setStopPlaylistModal] = useState(false);

  globalThis.StopPlayingPlaylistModal = setStopPlaylistModal;

  const [showVideoOverlay, setShowVideoOverlay] = useState(false);

  const [annoationData, setAnnotationData] = useState([]);
  const annotationSourcesRef = useRef([]);
  const tagsSourcesRef = useRef([]);
  const [fetchingAnnotation, setFetchingAnnotation] = useState(false);
  const [currentOpenedBook, setCurrentOpenedBook] = useState({
    ...(globalThis.CurrentBookData || {}),
  });

  useLayoutEffect(() => {
    globalThis.SetCurrentBook = setCurrentOpenedBook;
    return () => {
      globalThis.SetCurrentBook = null;
    };
  }, [setCurrentOpenedBook, currentOpenedBook]);

  const [SplitAppPanel2, setSplitAppPanel2] = useState(null);

  const [tab, setTab] = useState(globalThis.currentActiveItem || "discover");

  // Hide / Show
  const [hide, setHide] = useState(false);

  const [editData, setEditData] = useState({
    color: null,
    id: null,
    name: null,
    description: null,
    icon: null,
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

  const [playlists, setPlaylist] = useState(
    globalThis.PlaylistsGroups || {
      default: {
        active: true,
        deleteable: false,
        link: "",
      },
    }
  );

  useLayoutEffect(() => {
    globalThis.isUIOpen = open;
  }, [open]);

  useLayoutEffect(() => {
    globalThis.SetHidePlaylist = setHide;
    globalThis.IsHidden = hide;
    return () => {
      globalThis.SetHidePlaylist = null;
    };
  }, [hide]);

  const onAddPlaylist = () => {
    setPlaylist((prev) => {
      const id = createUUID();
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
    };
  }, [playingPlaylist, playlists]);

  useLayoutEffect(() => {
    globalThis.SetSplitAppPanel2 = setSplitAppPanel2;
    return () => {
      globalThis.SetSplitAppPanel2 = null;
    };
  }, [SplitAppPanel2]);

  const activePlaylists = useMemo(() => {
    let id = null;
    Object.keys(playlists).forEach((pId) => {
      const pls = globalThis[`${pId}playlists`];
      if (pls) {
        const plsIndex = pls.findIndex((pl) => pl.id === playingPlaylist);
        if (plsIndex > -1) {
          id = pId;
        }
      }
    });
    return id ? [id] : Object.keys(playlists);
  }, [playingPlaylist, playlists]);

  const [collections, setCollections] = useState(globalThis.COLLECTIONS || {});
  const [currentCollection, setCurrentCollection] = useState(
    Object.keys(globalThis.COLLECTIONS || {})?.[0] || ""
  );

  const setCollectionsMiddleware = (newCollections) => {
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
    globalThis.COLLECTIONS = collections;
    globalThis.COLLECTION_SETTER = setCollectionsMiddleware;
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

  const apiCallforAnnotationRef = useRef(null);
  const [authSwtich, setAuthSwitch] = useState(false);
  const lastFetchAddress = useRef(null);
  const lastFetchTab = useRef("discover");
  const [playlistSharerName, setPLaylistSharerName] = useState("");
  const currentProfileNameRef = useRef("");

  useLayoutEffect(() => {
    globalThis.currentActiveItem = tab;
    globalThis.setTabPlaylist = setTab;
    globalThis.SetAuthSwtich = setAuthSwitch;
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
      apiCallforAnnotationRef.current = null;
      if (!currentOpenedBook?.bookId) return;

      (async () => {
        try {
          setFetchingAnnotation(true);

          const annotationSources: any = [];

          const sourcesMap = {};

          const tagsSources: any = [];

          const tagsMap = {};

          let annotations = "";

          if (
            globalThis.AnnotationsData[
              `${currentOpenedBook?.bookId}-${currentOpenedBook?.chapter}`
            ]
          ) {
            annotations =
              globalThis.AnnotationsData[
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

          let allAnnotations: any = [];
          const verseIndexMap: any = {};
          annotations.forEach((ele) => {
            if (!sourcesMap[ele.data.userId]) {
              annotationSources.push({
                label: ele.data.userName,
                value: ele.data.userId,
                profilePicture: ele.data.userProfilePicture,
              });
              sourcesMap[ele.data.userId] = true;
            }
            ele?.data?.tags?.forEach((tag) => {
              if (!tagsMap[tag]) {
                tagsMap[tag] = true;
                tagsSources.push({
                  label: tag,
                  value: tag,
                });
              }
            });
            if (
              ele?.data.type === "comment" &&
              (ele.verseNumber || ele.verseNumbers)
            ) {
              const booksDetails = globalThis.findNameRank(ele.bookId);

              const anoItem = {
                type: "heading",
                content: ele.data.html,
                additionalInfo: {
                  verse: ele.verseNumber || ele.verseNumbers,
                  chapter: ele.chapter,
                  book: ele.bookId,
                  bookRank: booksDetails.item,
                },
                address: ele.id,
                id: ele.id,
                createdAtMs: ele?.data?.createdAtMs || Date.now(),
                updatedAtMs: ele?.data?.updatedAtMs || Date.now(),
                tags: ele?.data?.tags || [],
                createdBy: ele?.data?.userId,
                createdByName: ele?.data?.userName,
                createdByProfilePicture: ele?.data?.userProfilePicture,
              };

              const verseSummaryHeading = globalThis.GetVerseSummaryHeading(
                ele.verseNumber ? [ele.verseNumber] : ele.verseNumbers
              );

              const data = {
                bookid: currentOpenedBook?.bookId,
                chapter: currentOpenedBook?.chapter,
              };

              data.heading = `${currentOpenedBook.book} ${currentOpenedBook.chapter}:${verseSummaryHeading.join(`, `)}`;
              data.data = [anoItem];
              data.verse = ele.verseNumber || ele.verseNumbers;
              data.tags = [];
              data.address = ele.id;
              if (!verseIndexMap[data.heading]) {
                // verseIndexMap[data.heading] = allAnnotations.length - 1;
                allAnnotations.push(data);
              } else {
                allAnnotations[verseIndexMap[data.heading]].data.push(anoItem);
              }
            } else if (ele?.data.type !== "comment") {
              const data = {
                bookid: currentOpenedBook?.bookId,
                chapter: currentOpenedBook?.chapter,
              };
              const innerele = ele?.data?.data;

              if (innerele) {
                if (
                  !!innerele.additionalInfo &&
                  !!innerele.additionalInfo.layers
                ) {
                  const tags = [...(ele?.data.chronicle_tags || [])];
                  const layers = [
                    ...innerele.additionalInfo.layers.map((layer) => ({
                      ...layer,
                      address: ele.id,
                      createdAtMs: innerele.createdAtMs || Date.now(),
                      updatedAtMs: innerele.updatedAtMs || Date.now(),
                    })),
                  ];
                  if (innerele?.type === "chapter") {
                    data.heading = "Chapter";
                    data.data = [...layers];
                    data.tags = [...tags];
                    data.address = ele.id;
                    data.verse = [0];
                  }
                  if (innerele?.type === "verse-grouped") {
                    const verses = [...innerele.additionalInfo.verse];
                    const length = verses.length;
                    data.heading = `Verse ${verses[0]}-${verses[length - 1]}`;
                    data.data = [...layers];
                    data.tags = [...tags];
                    data.address = ele.id;
                    data.verse = verses[0];
                  }

                  if (innerele?.type === "verse") {
                    data.heading = `Verse ${innerele.additionalInfo.verse}`;
                    data.data = [...layers];
                    data.tags = [...tags];
                    data.verse = innerele.additionalInfo.verse;
                    data.address = ele.id;
                  }
                  if (data.data) {
                    if (!verseIndexMap[data.heading]) {
                      verseIndexMap[data.heading] = allAnnotations.length - 1;
                      allAnnotations.push(data);
                    } else {
                      allAnnotations[verseIndexMap[data.heading]]?.data.push(
                        ...layers
                      );
                      allAnnotations[verseIndexMap[data.heading]]?.tags.push(
                        ...tags
                      );
                    }
                  }
                }
              }
            }
          });
          allAnnotations = allAnnotations.sort(sortFunc);
          setFetchingAnnotation(false);
          setAnnotationData(allAnnotations);
          annotationSourcesRef.current = annotationSources;
          tagsSourcesRef.current = tagsSources;
          globalThis.UsedTags = [...tagsSources];
        } catch (e) {
          console.log(e);
          setFetchingAnnotation(false);
        }
      })();
    }, 200);

    return () => {
      globalThis.setTabPlaylist = null;
      globalThis.SetAuthSwtich = null;
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

  const onKeyUp = useCallback((e) => {
    whisper(thisBot, "onKeyUp", {
      keys: [e.key],
    });
  }, []);

  const onKeyDown = useCallback((e) => {
    whisper(thisBot, "onKeyDown", {
      keys: [e.key],
    });
  }, []);

  useLayoutEffect(() => {
    const isMobile =
      (window?.innerWidth || gridPortalBot.tags.pixelWidth) <
      MOBILE_VIEWPORT_THRESHOLD;
    if (isMobile) {
      globalThis.SetPlaylistForcedHeight &&
        globalThis.SetPlaylistForcedHeight(1);
    }
    if (IsPlaylistPlaying) {
      thisBot.Playlistplaying({
        skipAll: true,
      });
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
          const data = await os.getData(
            thisBot.tags.keyFetchAccountData,
            authBot.id
          );
          if (data.success) {
            const payload = data.data;
            currentProfileName = payload.profileName || "Guest";
          }
        }
        setPLaylistSharerName(nameOfSharer);
        currentProfileNameRef.current = currentProfileName;
        globalThis.shareProfileName = false;
      }
    }, 200);

    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      globalThis.makingPlaylist = false;
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("keydown", onKeyDown);
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
        } catch (err) {}
      })();
      globalThis.StopVideoRecording = false;
      globalThis.RemoveApplicationByID &&
        globalThis.RemoveApplicationByID(globalThis.PLAYLIST_PANEL_ID);
      globalThis.PLAYLIST_PANEL_ID = null;
      globalThis.IS_PLAYLIST_ACTIVE = false;
      globalThis[`defaultToggleGreyCheckPLayingPlaylist`] &&
        globalThis[`defaultToggleGreyCheckPLayingPlaylist`](null);
      thisBot.CloseFloatingApp();
      globalThis.SetSplitAppPanel2 && globalThis.SetSplitAppPanel2(null);
      globalThis.makingPlaylist = false;
      globalThis.SetMediaURL && globalThis.SetMediaURL(null);
      globalThis.SetVideoSrc && globalThis.SetVideoSrc(null);
      globalThis.SetPlaylistForcedHeight &&
        globalThis.SetPlaylistForcedHeight(0);
    };
  }, []);

  const onCloseSharPlaylistModal = () => {
    setPLaylistSharerName("");
    globalThis.hasASharedPlaylist = false;
  };

  const playlistShared = useMemo(
    () =>
      (globalThis[`${"default"}playlists`] || []).find(
        (ele) => ele.id === globalThis.hasASharedPlaylist
      ) || {},
    []
  );

  const closeConfirmStopPlaylist = () => {
    setStopPlaylistModal(false);
  };

  const gotoCreate = (isAnnotation = false) => {
    if (globalThis[`${"default"}SetMode`]) {
      if (isAnnotation) {
        globalThis[`${"default"}SetMode`](PlaylistModeTypes.annotations);
      } else {
        globalThis[`${"default"}SetMode`](PlaylistModeTypes.playlist);
      }
    } else {
      globalThis.SetTab("create");
      if (isAnnotation) {
        globalThis[`${"default"}mode`] = PlaylistModeTypes.annotations;
      } else {
        globalThis[`${"default"}mode`] = PlaylistModeTypes.playlist;
      }
    }
    setCreateOptions(false);
  };

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
      {!!playlistSharerName && (
        <Modal
          sxContainer={{ width: "460px" }}
          title={globalThis.t("welcomeToSeedBible")}
          showIcon={false}
          onClose={onCloseSharPlaylistModal}
        >
          <div className="welcome-box">
            <img
              src="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/08ff23d5216230e0fe9b9c0f80b8192aee35c320d4c87e60046e7cc396d8f5a7.svg"
              alt="share"
            />
            <div className="align-center" style={{ gap: "1rem" }}>
              {!!globalThis.shareProfilePic && (
                <img
                  className="welcome-box-profile"
                  src={globalThis.shareProfilePic}
                  alt={playlistSharerName}
                />
              )}
              {!!playlistSharerName ? (
                <p>
                  {" "}
                  <b>{playlistSharerName}</b> {globalThis.t("sharedAPlaylist")}
                </p>
              ) : (
                <p>{globalThis.t("hereIsYourSharedPlaylist")}</p>
              )}
            </div>
            <div
              className="welcome-box-content"
              style={{
                alignItems: !playlistShared.description
                  ? "center"
                  : "flex-start",
              }}
            >
              <RenderIcon
                isCustomIcons={playlistShared.isCustomIcon}
                icon={playlistShared.icon}
                list={playlistShared.list}
              />
              <div className="welcome-details">
                <h4
                  style={{
                    fontSize: !!playlistShared.description
                      ? "1rem"
                      : "1.125rem",
                  }}
                >
                  {playlistShared.name}
                </h4>
                {!!playlistShared.description && (
                  <p>{playlistShared.description}</p>
                )}
              </div>
            </div>
            <Button
              secondary
              style={{
                width: "205px",
              }}
              onClick={() => {
                if (globalThis.DragDrop)
                  thisBot.Playlistplaying({
                    playingPlaylist: playlistShared.id,
                    startIndex: 0,
                    startSubIndex: -1,
                    parentId: "default",
                    name: playlistShared.name,
                  });
                setPLaylistSharerName("");
                globalThis.hasASharedPlaylist = false;
              }}
            >
              {globalThis.t("start")}
            </Button>
          </div>
        </Modal>
      )}

      {stopPlaylistModal && (
        <Modal showIcon={false} onClose={closeConfirmStopPlaylist}>
          <h2 style={{ fontSize: "1rem" }}>
            {globalThis.t("thisWillStopPlayingPlaylist")}
          </h2>
          <p>{globalThis.t("playlistCurrentlyPlayingConfirm")}</p>
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
              {globalThis.t("confirm")}
            </Button>
            <Button secondaryAlt onClick={closeConfirmStopPlaylist}>
              {globalThis.t("no")}
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
              width: "210px",
              maxHeight: "105px",
              left: "none",
              right: "-12rem",
              padding: "0.5rem",
              marginTop: 45,
            }}
            className="overlay linked-item-custom"
          >
            <div
              className="more-menu-items"
              onClick={(e) => {
                e.stopPropagation();
                if (SplitAppPanel2) {
                  globalThis.PendingAction = gotoCreate;
                  globalThis.StopPlayingPlaylistModal(true);
                  return;
                }
                gotoCreate();
              }}
            >
              <div className="align-center" style={{ gap: "0.5rem" }}>
                <PlaylistIcon />
                <span
                  style={{ fontFamily: `"Satoshi", system-ui, sans-serif` }}
                >
                  {globalThis.t("playlist")}
                </span>
              </div>
            </div>
            <div
              className="more-menu-items"
              onClick={(e) => {
                // if not login show notification
                if (!authBot?.id) {
                  return ShowNotification({
                    message: t("pleaseLoginToUseFeature"),
                    severity: "error",
                  });
                }
                e.stopPropagation();
                if (SplitAppPanel2) {
                  globalThis.PendingAction = () => gotoCreate(true);
                  globalThis.StopPlayingPlaylistModal(true);
                  return;
                }
                gotoCreate(true);
              }}
            >
              <div className="align-center" style={{ gap: "0.5rem" }}>
                <AnnotationIcon />
                <span
                  style={{ fontFamily: `"Satoshi", system-ui, sans-serif` }}
                >
                  {globalThis.t("annotation")}
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
                  {globalThis.t("addAnotherParallelPlaylist")}
                </h2>
                <ButtonsCover>
                  <Button onClick={() => onAddPlaylist()} varient="black">
                    {globalThis.t("yes")}
                  </Button>
                  <Button onClick={() => setOpenModal(false)}>
                    {globalThis.t("close")}
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
                          ...ButtonStyle,
                          fontSize: "24px",
                          padding: "0",
                          border: "none",
                        }}
                        onClick={() => {
                          globalThis[`setOpenAttachLink`](false);
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
                        {[buttonConfigs[0]].map(
                          ({ label, onClick, value, icon }) => (
                            <h4
                              onClick={() => {
                                if (SplitAppPanel2) {
                                  globalThis.PendingAction = onClick;
                                  globalThis.StopPlayingPlaylistModal(true);
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
                                className="material-symbols-outlined unfollow"
                                style={{ fontSize: "20px" }}
                              >
                                {icon}
                              </span>
                              <span>
                                {label}{" "}
                                <GetLabel
                                  widthCompare={264}
                                  value={value}
                                  currentOpenedBook={currentOpenedBook}
                                />
                              </span>
                            </h4>
                          )
                        )}
                        <Button
                          onClick={() => {
                            setCreateOptions(true);
                          }}
                          secondary
                          exClass="create-button"
                        >
                          <span
                            style={{ color: "white" }}
                            class="material-symbols-outlined"
                          >
                            add
                          </span>
                          {globalThis.t("create")}
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
                          ...ButtonStyle,
                          fontSize: "24px",
                          padding: "0",
                          border: "none",
                          marginLeft: "auto",
                        }}
                        onClick={() => {
                          // setHide(p => !p);
                          // globalThis.SetScreens(1);
                          thisBot.CloseFloatingApp();
                          DataManager.cancelCurrentPlayingSound();
                          // globalThis.SetPlayingPlaylist && globalThis.SetPlayingPlaylist(false);
                          globalThis[`defaultToggleGreyCheckPLayingPlaylist`] &&
                            globalThis[`defaultToggleGreyCheckPLayingPlaylist`](
                              null
                            );
                          globalThis.IsQueuePresent = false;
                          // os.unregisterApp("playing-playlist");

                          globalThis.IS_PLAYLIST_ACTIVE = false;
                          globalThis.SET_SHOW_CHECK &&
                            globalThis.SET_SHOW_CHECK(false);
                          setSplitAppPanel2(null);
                          globalThis.RemoveApplicationByID &&
                            globalThis.RemoveApplicationByID(
                              globalThis.PLAYLIST_PANEL_ID
                            );
                          globalThis.PLAYLIST_PANEL_ID = null;
                          globalThis.makingPlaylist = false;
                          return;
                        }}
                      >
                        close
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
                    paddingBottom: !!SplitAppPanel2 ? "0rem" : "0",
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
                    overflow: "scroll",
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
