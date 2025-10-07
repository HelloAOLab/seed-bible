const { useState, useLayoutEffect } = os.appHooks;
// check_circle
const { Input, Modal, Button, ButtonsCover, Checkbox } = Components;
const Linking = thisBot.LinkingItems();
const isMobile =
  (window?.innerWidth || gridPortalBot.tags.pixelWidth) <
  MOBILE_VIEWPORT_THRESHOLD;

const editAbleTypes = {
  youtube: true,
  iframe: true,
  video: true,
  Video: true,
};

const AutoplayIcons = {
  FALSE:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/ef49fd6fb22cd50cb67463c2ddaee79e9076b2e228a6ec35802e5a1fac666c8f.svg",
  TRUE: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/9721a3a303021e8c4b84b6c3e939718a5a7ab773d84fd305351bf3f5081fbeca.svg",
};

const AttachLinkItem = ({
  clickPass,
  activeItemID,
  playlistId,
  setRef,
  oldItemsMap,
  dragOverSet,
  playlistName,
  linkingMode,
  viewOnly,
  checklistEnabled,
  checkListData,
  data,
  editDataFromPlaylist,
  creatingPlaylist,
  toggle,
  onClickItem,
  handleDragStart,
  handleDragOver,
  handleDragEnd,
  deleteFromList,
  originalIndex,
  index,
  playListSubIndex,
  onClick,
  setList,
  activeItemList,
  currentDateActive,
  originalList,
  datesRepeat,
  datesInWrongOrder,
  currentFormat,
  isSomethingEmbededChecked,
  draggable = true,
  layers,
  onDisembed,
  playingPlaylist = false,
  justPlay = false,
  embedding,
  pId,
  onClickCheckbox,
  checked,
  isPlaylistNestedSupported = false,
  isPlaylistNestedPlayAble = false,
  autoPlayToggle = null,
}) => {
  const [editDateModal, setEditDateModal] = useState(false);

  const [date, setDate] = useState(
    FORMAT_YYYY_MM_DD(data.additionalInfo.date || new Date())
  );
  const onDateSave = () => {
    setList((prev) => {
      const old = [...prev];
      const index = old.findIndex((ele) => ele.id === data.id);
      if (index > -1) {
        old[index] = {
          ...old[index],
          content: FORMAT_DATE(date),
          additionalInfo: {
            date: FORMAT_YYYY_MM_DD(date),
          },
        };
      }
      return old;
    });
  };

  if (!isPlaylistNestedSupported && data.additionalInfo.type === "playlist") {
    return null;
  }

  const isVideoItem = globalThis.IsVideoAttachment(data);

  const toggleAutoPlay = () => {
    if (autoPlayToggle) autoPlayToggle(originalIndex, pId, data.id);
  };

  const comparator = playingPlaylist ? 1 : 0;

  return (
    <>
      {editDateModal && (
        <Modal
          title="Change Date"
          showIcon={false}
          onClose={() => setEditDateModal(false)}
        >
          <h3>Edit Date</h3>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              margin: "10px 0",
              padding: "8px",
              width: "100%",
              boxSizing: "border-box",
            }}
          />
          <ButtonsCover>
            <Button
              secondary
              onClick={() => {
                onDateSave();
                setEditDateModal(false);
              }}
            >
              Save
            </Button>
            <Button secondaryAlt onClick={() => setEditDateModal(false)}>
              Close
            </Button>
          </ButtonsCover>
        </Modal>
      )}
      <div
        draggable={draggable && !viewOnly}
        // ref={ref => setRef.current[data.id] = ref}
        // ${(oldItemsMap[data.id] || isSomethingEmbededChecked) ? 'greyed-out' : ''}
        tabIndex={0}
        className={`history-item 
                ${dragOverSet?.itemId === data.id && `dropabble-${dragOverSet?.position}`}
                ${currentDateActive === data.id && "current-date-active"} 
                ${datesRepeat[data.id] && "current-date-repeat"} 
                ${datesInWrongOrder[data.id] && "current-date-disorder"} 
                ${(data.id === activeItemID || activeItemList[data.id]) && "current-playing-item"} 
                ${oldItemsMap[data.id] || (!!onDisembed && !!embedding) ? "greyed-out" : ""}
            `}
        onClick={(e) => {
          // e.stopPropagation();
          if (data.type === "date") return;
          if (data.additionalInfo.type === "playlist") {
            if (!isPlaylistNestedPlayAble) {
              return ShowNotification({
                message: "Cannnot Play Playlist While annotating!",
                severity: "error",
              });
            } else {
              thisBot.Playlistplaying({
                playingPlaylist: data.id,
                startIndex: 0,
                startSubIndex: -1,
                parentId: "default",
                name: data.content,
                list: [...data.additionalInfo.link],
              });
              return;
            }
          }
          globalThis.ADDING_TOPLAYLIST_TIMEOUT = setTimeout(() => {
            globalThis.ADDING_TOPLAYLIST_TIMEOUT = null;
            onClickItem({ dataItem: data });
          }, 1000);
        }}
        onPointerUp={() => {
          if (globalThis.ADDING_TOPLAYLIST_TIMEOUT) {
            clearInterval(globalThis.ADDING_TOPLAYLIST_TIMEOUT);
            globalThis.ADDING_TOPLAYLIST_TIMEOUT = null;
          }
        }}
        // onMouseDown={(e) => e.stopPropagation()} // block parent drag
        onMouseLeave={() => {
          if (globalThis.ADDING_TOPLAYLIST_TIMEOUT)
            clearInterval(globalThis.ADDING_TOPLAYLIST_TIMEOUT);
        }}
        onTouchEnd={() => {
          if (globalThis.ADDING_TOPLAYLIST_TIMEOUT)
            clearInterval(globalThis.ADDING_TOPLAYLIST_TIMEOUT);
        }}
        onDragStart={() => {
          handleDragStart(index, pId);
        }}
        onDragOver={(e) => handleDragOver(index, originalIndex, null, e)}
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
            if (setRef && setRef[data.id]) {
              setRef[data.id].current = ref;
            }
          }}
        />
        <div className="start-actions">
          {data.type !== "heading" &&
          data.type !== "date" &&
          checklistEnabled &&
          !viewOnly ? (
            <Checkbox
              small
              disabled={!!onDisembed && !!embedding}
              checked={checked || checkListData[data.id] || data.readAlready}
              onClick={() => {
                if (onClickCheckbox) {
                  onClickCheckbox();
                  return;
                }

                const isShiftHold = globalThis?.KEY_HOLD?.["shift"];

                if (isShiftHold && !onDisembed) {
                  let upperLimit = Math.max(index, globalThis.LAST_CLICK_ID);
                  let lowerLimit = Math.min(index, globalThis.LAST_CLICK_ID);
                  const idsFilter = originalList
                    .filter(
                      ({ id }, indexInner) =>
                        indexInner <= upperLimit &&
                        indexInner >= lowerLimit &&
                        indexInner !== globalThis.LAST_CLICK_ID &&
                        id !== embedding
                    )
                    .map((ele) => ele.id);
                  editDataFromPlaylist(idsFilter, false);
                  globalThis.LAST_CLICK_ID = index;
                  return;
                } else {
                  globalThis.LAST_CLICK_ID = index;
                }
                editDataFromPlaylist(data.id, false);
              }}
            />
          ) : null}
          {data.type !== "heading" ? (
            data.additionalInfo.type === "playlist" ? (
              <span
                onClick={() => {
                  if (data.type === "date" && creatingPlaylist && !viewOnly) {
                    setEditDateModal(true);
                  }
                }}
                class="material-symbols-outlined unfollow drag-item-icon"
              >
                playlist_play
              </span>
            ) : data.additionalInfo.type === "voice-recording" ? (
              <img
                src={getFileIconByMimeType("audio/")}
                style={{ width: "18px" }}
              />
            ) : data.additionalInfo.type === "video-recording" ? (
              <img
                src={getFileIconByMimeType("video/")}
                style={{ width: "18px" }}
              />
            ) : data.additionalInfo.type === "file" ? (
              <img
                src={getFileIconByMimeType(data.additionalInfo.mimeType)}
                style={{ width: "18px" }}
              />
            ) : (
              <span
                onClick={() => {
                  if (data.type === "date" && creatingPlaylist && !viewOnly) {
                    setEditDateModal(true);
                  }
                }}
                class="material-symbols-outlined unfollow drag-item-icon"
              >
                {data.type === "date" ? "calendar_month" : "media_link"}
              </span>
            )
          ) : null}
        </div>
        <p
          onClick={() => {
            if (data.type === "date") return;

            if (!!onClick) {
              clearInterval(globalThis.ADDING_TOPLAYLIST_TIMEOUT);
              globalThis.ADDING_TOPLAYLIST_TIMEOUT = null;
              // thisBot.RenderLinkContent(data);
              onClick({ dataItem: data, index: originalIndex });
              if (checklistEnabled) {
                editDataFromPlaylist(data.id);
              }
              // globalThis.SetCurreIndexPlaylist && globalThis.SetCurreIndexPlaylist(index, playListSubIndex);
              return;
            }
            if (clickPass) {
              // thisBot.RenderLinkContent(data);
              onClick({ dataItem: data, index: originalIndex });
              if (checklistEnabled) {
                editDataFromPlaylist(data.id);
              }
              // globalThis.SetCurreIndexPlaylist && globalThis.SetCurreIndexPlaylist(index, playListSubIndex);
              return;
            }
            if (globalThis.SetCurrentItem) {
              globalThis.SetCurrentItem({ ...data });
            }

            if (globalThis.SetVideoSrc) {
              globalThis.SetVideoSrc(null);
              if (
                data.additionalInfo.type === "video-recording" ||
                data.additionalInfo.type === "Video" ||
                data.additionalInfo.type === "video" ||
                data.additionalInfo.type === "youtube"
              ) {
                thisBot.CloseFloatingApp();
                thisBot.VideoPlayer({
                  src: data.additionalInfo.link,
                  isYoutube: !!data.additionalInfo.videoId,
                  videoID: data.additionalInfo.videoId,
                  content: data.content,
                });
                // globalThis.SetVideoSrc(data.additionalInfo.link);
                return;
              }
            }

            if (data.additionalInfo.type === "externalLink") {
              // thisBot.RenderLinkContent({ ...data });
              if (globalThis.OpenRefTimeout) {
                clearTimeout(globalThis.OpenRefTimeout);
                globalThis.OpenRefTimeout = null;
              }
              globalThis.OpenRefTimeout = setTimeout(() => {
                const link = data.additionalInfo.link;
                const isVideo = globalThis.IsVideoAttachment(data);
                if (isVideo) {
                  thisBot.CloseFloatingApp();
                  thisBot.VideoPlayer({
                    src: link,
                  });
                  return;
                }
                globalThis.window?.open(link, "_blank", "noopener,noreferrer");
              }, 200);
              return;
            }

            if (globalThis.SetMediaURL) {
              globalThis.SetMediaURL(null);
              if (data.additionalInfo.type === "voice-recording") {
                globalThis.SetMediaURL(data.additionalInfo.link);
                return;
              }
            }

            if (creatingPlaylist) {
              thisBot.RenderLinkContent({ ...data });
              return;
            }
          }}
          className={`attachment-link ${data.type === "heading" ? "no-left-padding" : data.type !== "date" && checklistEnabled && !viewOnly ? "checklistEnabled" : ""} playlist-item-type playlist-item-verse ${toggle === data.id && "current-playing-item"}`}
        >
          {data.type === "date"
            ? FORMAT_DATE(data?.additionalInfo.date, currentFormat)
            : data?.content.substr(0, 25)}{" "}
          {`${data?.content.length > 25 ? "..." : ""}`}
        </p>
        <div className="actions">
          {false && (
            <a
              style={{ marginLeft: "10px" }}
              target="_blank"
              rel="noreferrer"
              href={data.additionalInfo?.link}
            >
              🔗
            </a>
          )}

          {data.additionalInfo.type === "file" && (
            <p
              className={`end-icon without-right-margin ${`${isMobile && "visible"} end-icon without-right-margin`}`}
              onClick={(e) => {
                e.stopPropagation();

                const link = document.createElement("a");
                link.href = data.additionalInfo.link;

                // If same-origin → force download
                if (
                  location.origin === new URL(data.additionalInfo.link).origin
                ) {
                  link.download = data.content; // suggest filename
                } else {
                  // Cross-origin → `download` is ignored, so open in new tab
                  link.target = "_blank";
                  link.rel = "noopener";
                }

                document.body.appendChild(link);
                link.click();
                link.remove();
              }}
            >
              <span class="material-symbols-outlined">download</span>
            </p>
          )}

          {(index === comparator &&
            !!autoPlayToggle &&
            !!onDisembed &&
            isVideoItem &&
            layers &&
            !playingPlaylist) ||
            (playingPlaylist && data.autoPlay && (
              <p
                onClick={(e) => {
                  if (playingPlaylist) return;
                  e.stopPropagation();
                  toggleAutoPlay();
                }}
                className={`end-icon with-padding-activation ${data.autoPlay && !playingPlaylist ? "active" : ""} without-right-margin ${`${(isMobile || playingPlaylist) && "visible"}`}`}
              >
                <img
                  src={
                    data.autoPlay && !playingPlaylist
                      ? AutoplayIcons.TRUE
                      : AutoplayIcons.FALSE
                  }
                  alt="autplay"
                />
              </p>
            ))}
          {editAbleTypes[data.additionalInfo.type] &&
            creatingPlaylist &&
            !viewOnly && (
              <p
                className={`end-icon without-right-margin ${`${isMobile && "visible"}`}`}
                onClick={(e) => {
                  e.stopPropagation();
                  globalThis.SetEditAttachmentItem({
                    id: data.id,
                    parentId: pId,
                    selectedType: "LINK",
                    name: data.content,
                    data: data.link,
                    link: data.additionalInfo.link,
                    mediaType: data.additionalInfo.type,
                  });
                }}
              >
                <span class="material-symbols-outlined unfollow delete-icon">
                  edit
                </span>
              </p>
            )}

          {!playingPlaylist &&
            !!onDisembed &&
            layers &&
            creatingPlaylist &&
            !viewOnly && (
              <p
                className={`end-icon without-right-margin ${`${isMobile && "visible"}`}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onDisembed) {
                    onDisembed();
                  }
                }}
              >
                <span class="material-symbols-outlined unfollow delete-icon">
                  link_off
                </span>
              </p>
            )}
          {creatingPlaylist && !viewOnly && (
            <p
              className={`${isMobile && "visible"} end-icon without-right-margin`}
              onClick={(e) => {
                e.stopPropagation();
                deleteFromList(index, pId, data.id);
              }}
            >
              <span class="material-symbols-outlined unfollow delete-icon">
                delete
              </span>
            </p>
          )}

          {false && (
            <Linking
              linkingMode={linkingMode}
              playlistName={playlistName}
              data={data}
              playListId={playlistId}
            />
          )}
        </div>
      </div>
    </>
  );
};

return AttachLinkItem;
