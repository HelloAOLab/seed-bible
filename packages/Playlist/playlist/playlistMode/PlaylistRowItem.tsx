const { useState, useLayoutEffect, useRef, useMemo } = os.appHooks;
const { Checkbox, LoaderSecondary, Modal, ButtonsCover, Button } = Components;

const CircleProgress = await thisBot.DynamicCircle();
const RenderIcon = await thisBot.RenderIcon();

const ButtonStyle = {
  cursor: "pointer",
  // border: "1px solid grey",
  borderRadius: "40px",
  // padding: "6px",
  fontSize: "1.75rem",
  color: "inherit",
};

const startEditingPlaylist = (
  name,
  id,
  list,
  subId,
  attachment,
  checklistEnabled,
  parentId,
  readingPlanEnabled,
  currentFormat,
  color,
  icon,
  isCustomColor,
  description,
  isCustomIcon,
  selectedTags,
  isLayers,
  access
) => {
  // if (globalThis.setTabPlaylist) {
  //     globalThis.setTabPlaylist('create');
  // }
  globalThis[`${parentId}SetPlaylistName`](name);
  globalThis[`${parentId}creatingPlaylistName`] = name;
  globalThis[`${parentId}HISTORYExploreMode`] = false;
  globalThis[`${parentId}creatingPlaylist`] = true;
  globalThis[`${parentId}isEditMode`] = id;
  globalThis[`${parentId}isEditModeSubID`] = subId;
  // thisBot.showInfo(`Playlist Mode`);
  // thisBot.ControlButtons();
  globalThis[`${parentId}SetAttachments`](attachment);
  globalThis[`${parentId}Attachments`] = attachment;
  globalThis[`${parentId}SetReadingPlan`](readingPlanEnabled);
  globalThis[`${parentId}SetChecklist`](checklistEnabled);
  globalThis[`${parentId}SetCurrentFormat`](currentFormat);
  globalThis.SetEditData({
    color: color,
    id: parentId,
    name: name,
    description: description,
    icon: icon,
  });

  if (isCustomColor) globalThis[`${parentId}setCustomColor`](color);
  if (isCustomIcon) globalThis[`${parentId}setCustomIcon`](icon);
  globalThis[`${parentId}setSelectedColor`](color);
  globalThis[`${parentId}setSelectedIcon`](icon);
  globalThis[`${parentId}setDescription`](description);
  globalThis[`${parentId}SetCreatingPlaylist`](true, list);
  globalThis[`${parentId}SetSelectedTags`](selectedTags || []);
  globalThis[`${parentId}SetLayers`](isLayers);
  globalThis[`${parentId}setPublishAccess`](access);
};

const defaultProfile =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/5ae46570b2daba6e99c5b71de2cf41cfd9dfaf46e04c9eb9344146955ddb9a31.svg";

const PlaylistRowItem = ({
  currentDateActive,
  shareProfileName,
  oldItemsMap = {},
  checkListData,
  selectedPlaylists,
  selectPlaylist = false,
  setSelectPlaylist,
  playlistParentName = "",
  clickPass = false,
  linkingMode,
  onLink,
  viewOnly,
  parentId,
  playingPlaylist,
  checklistEnabled,
  readingPlanEnabled,
  totalItem,
  index,
  toggle,
  list,
  name,
  id,
  setPlaylists,
  attachment = null,
  playListIndex,
  playListSubId = null,
  playListSubIndex = null,
  creatingPlaylist,
  handleDragOver,
  handleDragEnd,
  currentFormat,
  handleDragStart,
  dragOverSet,
  setOpenedList,
  opendedList,
  color = "#D9D9D9",
  icon = "subscriptions",
  isCustomColor = false,
  description = "",
  isCustomIcon = false,
  selectedTags,
  isLayers,
  access,
}) => {
  const isCustomIcons = icon?.startsWith("https") || isCustomIcon;
  const [warningMessage, setWarningMsg] = useState(null);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const isPlayingPLaylist = playingPlaylist || globalThis.IsPlaylistPlaying;
  const toggleOpen = () => setOpenedList((prev) => (prev === id ? "" : id));
  const [isPlay, setIsPlay] = useState(false);

  const [loading, setLoading] = useState(false);
  const [copyURL, setCopyURL] = useState(null);

  const setPlaylist = (newList) => {
    setPlaylists((prev) => {
      const old = [...prev];
      if (playListSubIndex || playListSubIndex === 0) {
        old[playListSubIndex].list[playListIndex].list = newList;
      } else {
        old[playListIndex].list = newList;
      }
      return old;
    });
  };

  const deleteDataFromPlaylist = (index) => {
    const idsMap = {};
    const isArray = Array.isArray(index);
    if (isArray) index.forEach((id) => (idsMap[id] = true));
    setPlaylists((prev) => {
      const old = [...prev];
      if (playListSubIndex || playListSubIndex === 0) {
        let oldList = [...old[playListSubIndex].list[playListIndex].list];
        if (isArray) {
          oldList = oldList.filter((data) => !idsMap[data.id]);
        } else {
          oldList.splice(index, 1);
        }
        if (oldList.length === 0) {
          old[playListSubIndex].list.splice(playListIndex, 1);
        } else {
          old[playListSubIndex].list[playListIndex].list = oldList;
          // old[playListSubIndex].list[playListIndex].toggleRender = !old[playListSubIndex].list[playListIndex].toggleRender;
        }
        // old[playListSubIndex].toggleRender = !old[playListSubIndex].toggleRender;
      } else {
        let oldList = [...old[playListIndex].list];
        if (isArray) {
          oldList = oldList.filter((data) => !idsMap[data.id]);
        } else {
          oldList.splice(index, 1);
        }
        if (oldList.length === 0) {
          old.splice(playListIndex, 1);
        } else {
          old[playListIndex].list = oldList;
        }
      }
      return old;
    });
  };

  const editDataFromPlaylist = (index, isGroup, newVal = false) => {
    setPlaylists((prev) => {
      const old = [...prev];
      if (playListSubIndex || playListSubIndex === 0) {
        if (isGroup) {
          index.forEach((i) => {
            old[playListSubIndex].list[playListIndex].list[i].readAlready =
              newVal;
          });
        } else {
          old[playListSubIndex].list[playListIndex].list[index].readAlready =
            !old[playListSubIndex].list[playListIndex].list[index].readAlready;
        }
        // old[playListSubIndex].toggleRender = !old[playListSubIndex].toggleRender;
      } else {
        if (isGroup) {
          index.forEach((i) => {
            old[playListIndex].list[i].readAlready = newVal;
          });
        } else {
          old[playListIndex].list[index].readAlready =
            !old[playListIndex].list[index].readAlready;
        }
        // old[playListIndex].toggleRender = !old[playListIndex].toggleRender;
      }
      return old;
    });
  };

  const deletePlayList = (id) => {
    setPlaylists((prev) => {
      const old = [...prev];
      let index = old.findIndex((ele) => ele.id === id);
      if (playListSubIndex || playListSubIndex === 0) {
        index = old[playListSubIndex].list.findIndex((ele) => ele.id === id);
      }
      if (index > -1) {
        if (playListSubIndex || playListSubIndex === 0) {
          old[playListSubIndex].list.splice(index, 1);
        } else {
          old.splice(index, 1);
        }
      }
      return old;
    });
  };

  const onremoveAttachment = () => {
    setPlaylists((prev) => {
      const old = [...prev];

      if (playListSubIndex || playListSubIndex === 0) {
        old[playListSubIndex].list[playListIndex].attachment = null;
        old[playListSubIndex].toggleRender =
          !old[playListSubIndex].toggleRender;
      } else {
        old[playListIndex].attachment = null;
      }
      return old;
    });
  };

  const hanldeAdd = ({ dataItem, bulkAdd }) => {
    if (creatingPlaylist) {
      thisBot.tryAddDataToPlaylist({ dataItem, bulkAdd });
    } else {
      thisBot.navigationWithDataItem({ dataItem, bulkAdd });
    }
  };

  const onClick = ({ dataItem, bulkAdd, index }) => {
    globalThis.SetCurreIndexPlaylist &&
      globalThis.SetCurreIndexPlaylist(index, playListSubIndex);
    thisBot.navigationWithDataItem({ dataItem, bulkAdd });
  };

  const exportNestedList = () => {
    setPlaylists((prev) => {
      const old = [...prev];
      const playlist = { ...old[playListSubIndex].list[playListIndex] };
      playlist.nesting = 1;
      // old[playListSubIndex].toggleRender = !old[playListSubIndex].toggleRender;
      old.splice(playListSubIndex + 1, 0, playlist);
      old[playListSubIndex].list.splice(playListIndex, 1);
      return old;
    });
  };

  const copyClipBoard = async () => {
    if (!configBot.tags.pattern) {
      return ShowNotification({
        message: t("playlistShareError"),
        severity: "error",
      });
    }
    setLoading(true);
    let shareProfileName = "Guest";
    let shareProfilePic = defaultProfile;
    const authBot = await os.requestAuthBotInBackground();
    if (authBot?.id) {
      const data = await os.getData(
        thisBot.tags.keyFetchAccountData,
        authBot.id
      );
      if (data.success) {
        const payload = data.data;
        shareProfileName = payload.profileName || "Guest";
        shareProfilePic = payload.photoLink || defaultProfile;
      }
    }

    const playlistObj = {
      id,
      name: name,
      list,
      nesting: 1,
      toggleRender: false,
      attachment,
      icon,
      isCustomIcon,
      color,
      isCustomColor,
      description,
      icons: globalThis.PREDEFINED_ICONS,
      shareProfileName,
      shareProfilePic,
      sharerID: authBot?.id || "N/A",
    };

    const sanitizedItem = sanitizeObject(playlistObj);
    // console.log(sanitizedItem, "sanitizedItem");
    const stringItems = JSON.stringify(sanitizedItem, null, 2);

    const deployBot = configBot.tags.pattern
      ? configBot.tags.pattern
      : configBot.tags.ab;
    const key = configBot.tags.pattern ? "pattern" : "ab";
    // const encryptedText = API.encrypt()(stringItems);

    const result = await os.recordData(
      authBot.id,
      playlistObj.id,
      playlistObj,
      {
        marker: "publicRead",
      }
    );

    const recordShareKey = `${authBot.id}^_^${playlistObj.id}`;

    if (result.success) {
      const shareURL = `https://ao.bot/?${key}=${deployBot}&Playlist=${recordShareKey}&noGridPortal=true`;
      os.setClipboard(shareURL);
      setShowMoreOptions(false);
      setCopyURL(shareURL);
      ShowNotification({
        message: t("shareURLCopied"),
        severity: "success",
      });
    } else {
      ShowNotification({
        message: t("unableToCopy"),
        severity: "error",
      });
    }
    setLoading(false);
  };

  const openMergeModal = ({ id }) => {
    thisBot.MergeModal({ id });
  };

  const onClickLinkPlaylist = () => {
    thisBot.PlaylistLinkModal({
      id,
      parentId,
    });
  };

  const [updatePercent, setUpdatePercent] = useState(false);

  const percentageCompleted = (() => {
    if (id) {
      const playlistsProgress = globalThis[`${parentId}playlistProgress`];
      const playlistsChecked = globalThis[`${parentId}playlistChecked`];
      const itemsProg = { ...(playlistsProgress[id] || {}) };
      const itemsCheck = { ...(playlistsChecked[id] || {}) };
      const completedItems = { ...itemsProg, ...itemsCheck };
      const playlistList = (globalThis[`${id}playlists`] || []).find(
        (ele) => ele.id === id
      );

      const totalItems = playlistList?.list?.length || 0;

      if (playlistList) {
        let completedCount = 0;
        const tfHist = thisBot.groupVerse(playlistList.list);

        tfHist.forEach((ele) => {
          const isGrouped = Array.isArray(ele.additionalInfo);
          if (completedItems[ele.id]) {
            if (isGrouped) {
              completedCount += ele.additionalInfo.length;
            } else {
              completedCount++;
            }
          }
        });
        return Math.round((completedCount / totalItems) * 100);
      } else {
        return 0;
      }
    }
  })();

  useLayoutEffect(() => {
    globalThis[`updatePercent${id}`] = () => {};
  }, [id]);

  const onCloseWarningPopup = () => {
    setWarningMsg(null);
  };

  const timer = useRef(null);

  const handleTouchStart = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();

    const x = rect.left; // X position where the element starts (from left of screen)
    const y = rect.bottom; // Y position where the element ends (bottom of element from top of screen)

    globalThis.LastClickX = Math.max(x, 10);
    globalThis.LastClickY = y;
    timer.current = setTimeout(() => {
      setShowMoreOptions((p) => !p);
    }, 1000); // 600ms = long press threshold
  };

  const handleTouchEnd = () => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
  };

  return (
    <>
      {!!warningMessage && (
        <Modal
          title={globalThis.t("editPlaylistTitle")}
          showIcon={false}
          onClose={onCloseWarningPopup}
        >
          <p>{globalThis.t("editSharedPlaylistMsg")}</p>
          <p>{globalThis.t("makeACopy")}</p>
          <ButtonsCover>
            <Button
              secondary
              onClick={() => {
                thisBot.onDuplicatePlaylists({ id, parentId });
                setWarningMsg(null);
              }}
            >
              {globalThis.t("yes")}
            </Button>
            <Button secondaryAlt onClick={onCloseWarningPopup}>
              {globalThis.t("no")}
            </Button>
          </ButtonsCover>
        </Modal>
      )}
      <div
        onDragStart={() => {
          handleDragStart(playListIndex);
        }}
        onClick={(e) => e.stopPropagation()} // block clicks bubbling
        onMouseDown={(e) => e.stopPropagation()} // block parent drag
        onDragOver={() => {
          handleDragOver(playListIndex);
        }}
        style={{ zIndex: 100 - playListIndex, position: "relative" }}
        onDragEnd={handleDragEnd}
        draggable={!isPlayingPLaylist && !viewOnly}
        className={`playlist ${(isPlayingPLaylist || isPlay) && "playingPlaylist-removeme"} ${id === opendedList ? "opened" : ""}  ${dragOverSet.itemId === id && `dropabble-${dragOverSet.position}`}`}
      >
        <div
          onContextMenu={(e) => {
            e.preventDefault();

            const rect = e.currentTarget.getBoundingClientRect();

            const x = rect.left; // X position where the element starts (from left of screen)
            const y = rect.bottom; // Y position where the element ends (bottom of element from top of screen)

            globalThis.LastClickX = x;
            globalThis.LastClickY = y;
            setShowMoreOptions((p) => !p);
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            position: "relative",
            zIndex: "2",
          }}
        >
          {selectPlaylist && (
            <Checkbox
              onClick={() => setSelectPlaylist(id, parentId)}
              checked={selectedPlaylists[id]}
              style={{
                marginLeft: "10px",
                marginTop: "6px",
                marginRight: "10px",
              }}
            />
          )}
          <RenderIcon isCustomIcons={isCustomIcons} icon={icon} list={list} />
          <h4
            onPointerDown={() => {
              globalThis.ADDING_TOPLAYLIST_TIMEOUT = setTimeout(() => {
                globalThis.ADDING_TOPLAYLIST_TIMEOUT = null;
                // Can be done any function
                // hanldeAdd({ dataItem: list, bulkAdd: true });
              }, 1000);
            }}
            onPointerUp={() => {
              if (globalThis.ADDING_TOPLAYLIST_TIMEOUT) {
                // UnComment if you want playlist to open
                // toggleOpen();
                clearInterval(globalThis.ADDING_TOPLAYLIST_TIMEOUT);
              }
            }}
            onMouseLeave={() => {
              if (globalThis.ADDING_TOPLAYLIST_TIMEOUT)
                clearInterval(globalThis.ADDING_TOPLAYLIST_TIMEOUT);
            }}
            onTouchEnd={() => {
              if (globalThis.ADDING_TOPLAYLIST_TIMEOUT)
                clearInterval(globalThis.ADDING_TOPLAYLIST_TIMEOUT);
            }}
            className="playlist-action clear"
            style={{
              display: "flex",
              height: "max-content",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
              <b style={{ textAlign: "left" }}>{name}</b>
              <p style={{ textAlign: "left" }}>
                {description || t("noDescription")}
              </p>
            </div>

            {false && (
              <span
                style={{
                  transform: id === opendedList ? "rotateZ(180deg)" : "",
                  margin: "0",
                  fontSize: "24px",
                }}
                class="material-symbols-outlined unfollow"
              >
                keyboard_arrow_down
              </span>
            )}
          </h4>
        </div>

        <div
          style={{
            position: "absolute",
            top: "50%",
            right: "1rem",
            transform: "translateY(-50%)",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            color: "#D36433",
            zIndex: "11",
          }}
        >
          {loading && <LoaderSecondary />}
          {!!copyURL && (
            <span
              class="material-symbols-outlined unfollow"
              style={{
                fontSize: "1.5rem",
                color: "inherit",
                cursor: "pointer",
              }}
              onClick={() => {
                os.setClipboard(copyURL);
                ShowNotification({
                  message: t("shareURLCopied"),
                  severity: "success",
                });
              }}
            >
              copy_all
            </span>
          )}
          <div></div>
          {false && !creatingPlaylist && !viewOnly && (
            <span
              style={ButtonStyle}
              onClick={() => {
                setShowMoreOptions((p) => !p);
              }}
              class="material-symbols-outlined unfollow"
            >
              more_vert
            </span>
          )}
          <CircleProgress id={id} progress={`${percentageCompleted}`} />
          {!creatingPlaylist && !viewOnly ? (
            !isPlayingPLaylist || true ? (
              <span
                style={{
                  ...ButtonStyle,
                  fontSize: "1.97rem",
                  color: "#000000",
                  top: "51%",
                  position: "absolute",
                  right: "0%",
                  transform: `translate(0%, -50%)`,
                  backgroundColor: "var(--themeSideMenu)",
                }}
                class="material-symbols-outlined unfollow"
                onClick={() => {
                  thisBot.Playlistplaying({
                    playingPlaylist: playListSubId || id,
                    startIndex: playListSubIndex !== null ? index : 0,
                    startSubIndex: playListSubIndex !== null ? 0 : -1,
                    parentId,
                    name: name,
                  });
                  setIsPlay(true);
                  setTimeout(() => {
                    setIsPlay(false);
                    setTimeout(() => {
                      setIsPlay(true);
                      setTimeout(() => {
                        setIsPlay(false);
                      }, 150);
                    }, 150);
                  }, 150);

                  // SetPlayingPlaylist(playListSubId || id);
                  // toggleOpen();
                  // thisBot.showInfo(`Playing Playlist!`);
                }}
              >
                play_circle
              </span>
            ) : (
              <>
                <span
                  style={{
                    ...ButtonStyle,
                    color: "#139981",
                  }}
                  onClick={() => {
                    // os.unregisterApp("playing-playlist");
                    globalThis.ToggleGreyCheckPLayingPlaylist &&
                      globalThis.ToggleGreyCheckPLayingPlaylist(null);
                    // thisBot.showInfo(`History Mode!`);
                  }}
                  class="material-symbols-outlined unfollow"
                >
                  pause_circle
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "400",
                    color: "#139981",
                  }}
                >
                  {globalThis.t("nowPlaying")}
                </span>
              </>
            )
          ) : null}
        </div>
        <div
          style={{
            height: id === opendedList ? "auto" : "0",
            transition: "all 0.2s linear",
            overflow: "hidden",
            padding: "0 10px",
            zIndex: "1",
          }}
        >
          {(checklistEnabled || readingPlanEnabled) && !viewOnly && (
            <p className="align-center" style={{ justifyContent: "center" }}>
              <span
                class="material-symbols-outlined unfollow"
                style={{ color: "lightgreen", marginRight: "8px" }}
              >
                check_circle
              </span>
              <span>
                {checklistEnabled ? t("checklistEnabled") : t("planEnabled")}
              </span>
            </p>
          )}
          {list?.length === 0 && (
            <h4 style={{ margin: "8px 0" }}>{globalThis.t("noItemsYet")}</h4>
          )}
          {opendedList && (
            <DragDrop
              access={access}
              description={description}
              icon={icon}
              isCustomIcon={isCustomIcon}
              isCustomColor={isCustomColor}
              color={color}
              currentFormat={currentFormat}
              currentDateActive={currentDateActive}
              checkListData={checkListData}
              oldItemsMap={oldItemsMap}
              clickPass={clickPass}
              onLinking={onLink}
              playlistName={`${playlistParentName}${!!playlistParentName ? " - " : ""}${name}`}
              linkingMode={linkingMode}
              viewOnly={viewOnly}
              parentId={parentId}
              checklistEnabled={checklistEnabled}
              toggle={toggle}
              creatingPlaylist={creatingPlaylist}
              playingPlaylist={isPlayingPLaylist}
              list={list}
              editDataFromPlaylist={editDataFromPlaylist}
              playListSubIndex={playListIndex}
              playListSubId={id}
              setPlaylistFromRow={setPlaylists}
              onClick={onClick}
              setList={setPlaylist}
              deleteFromList={deleteDataFromPlaylist}
              onClickItem={hanldeAdd}
            />
          )}
        </div>
      </div>
      {showMoreOptions && (
        <>
          <div
            className="backdrop transparent"
            onClick={() => setShowMoreOptions(false)}
          />

          <div
            onClick={() => {
              setShowMoreOptions(false);
            }}
            style={{
              ...(getPosition ? getPosition() : { x: 0, y: 0 }),
              width: "200px",
            }}
            className="overlay linked-item-custom"
          >
            {!creatingPlaylist && !viewOnly && !isPlayingPLaylist && (
              <>
                <div
                  className="more-menu-items"
                  onClick={() => {
                    if (shareProfileName) {
                      setWarningMsg(id);
                      setShowMoreOptions(false);
                      return;
                    }
                    setShowMoreOptions(false);

                    globalThis[`SetEditModal`]({
                      id,
                      name,
                      description,
                      icon,
                      isCustomColor,
                      color,
                      isCustomIcon,
                      selectedTags,
                      access,
                    });
                    setShowMoreOptions(false);
                  }}
                >
                  <p>{globalThis.t("renamePlaylist")}</p>
                </div>
                <div
                  className="more-menu-items"
                  onClick={() => {
                    if (shareProfileName) {
                      setWarningMsg(id);
                      setShowMoreOptions(false);
                      return;
                    }
                    startEditingPlaylist(
                      name,
                      id,
                      list,
                      playListSubId,
                      attachment,
                      checklistEnabled,
                      parentId,
                      readingPlanEnabled,
                      currentFormat,
                      color,
                      icon,
                      isCustomColor,
                      description,
                      isCustomIcon,
                      selectedTags,
                      isLayers,
                      access
                    );
                    setShowMoreOptions(false);
                  }}
                >
                  <p>{globalThis.t("editPlaylist")}</p>
                </div>
              </>
            )}
            <div
              className="more-menu-items"
              onClick={() => {
                thisBot.onDuplicatePlaylists({ id, parentId });
                setShowMoreOptions(false);
              }}
            >
              <p>{globalThis.t("duplicatePlaylist")}</p>
            </div>
            <div
              className="more-menu-items"
              onClick={() => {
                thisBot.onDownloadPlaylist({ id, parentId });
                setShowMoreOptions(false);
              }}
            >
              <p>{globalThis.t("downloadPlaylistJSON")}</p>
            </div>
            <div className="more-menu-items" onClick={copyClipBoard}>
              <p>{globalThis.t("sharePlaylist")}</p>
            </div>
            {!creatingPlaylist && !viewOnly && !isPlayingPLaylist && (
              <div
                className="more-menu-items"
                onClick={() => {
                  deletePlayList(id);
                  setShowMoreOptions(false);
                  setShowMoreOptions(false);
                }}
              >
                <p>{globalThis.t("delete")}</p>
              </div>
            )}
            {!creatingPlaylist &&
              !viewOnly &&
              !isPlayingPLaylist &&
              (!!playListSubId ? (
                <div
                  className="more-menu-items"
                  onClick={() => {
                    exportNestedList();
                  }}
                >
                  <p>{globalThis.t("exportOutside")}</p>
                  <span
                    class="material-symbols-outlined unfollow"
                    style={{ ...ButtonStyle, fontSize: "22px" }}
                  >
                    call_split
                  </span>
                </div>
              ) : totalItem > 1 && !viewOnly && false ? (
                <div
                  className="more-menu-items"
                  onClick={() => {
                    const isNested = list.some(
                      (item) => item.type === "playlist"
                    );

                    if (isNested)
                      return ShowNotification({
                        message: t("cannotMergeNested"),
                        severity: "error",
                      });

                    openMergeModal({
                      id,
                      parentId,
                    });
                  }}
                >
                  <p>{globalThis.t("mergePlaylist")}</p>
                  <span
                    class="material-symbols-outlined unfollow"
                    style={{ ...ButtonStyle, fontSize: "22px" }}
                  >
                    arrow_and_edge
                  </span>
                </div>
              ) : (
                ""
              ))}
          </div>
        </>
      )}
    </>
  );
};
// {totalItem > 1 && <span class="material-symbols-outlined" style={ButtonStyle} onClick={() => openMergeModal({
//                 id
//             })} >
//                 arrow_and_edge
//             </span>}

// We  will add Collections Later
//  {!playingPlaylist ? <div className="more-menu-items" onClick={onClickLinkPlaylist}>
//                                 <p>Add To Collection</p>
//                                 <span class="material-symbols-outlined" style={{ ...ButtonStyle, fontSize: '22px' }} >
//                                     linked_services
//                                 </span>
//                             </div> : null}

return PlaylistRowItem;
