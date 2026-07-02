import { CloseFloatingApp } from "ext_discover.helper.CloseFloatingApp";
import { openVideoPlayer } from "ext_discover.helper.openVideoPlayer";
import {
  invokeRenderLinkContent,
  startPlaylistPlaying,
} from "ext_discover.helper.playlistPlaybackHelpers";
import {
  AUTOPLAY_ICONS,
  EDITABLE_ATTACHMENT_TYPES,
} from "ext_discover.models.annotationList";
import { getAttachmentLinkItemManager } from "ext_discover.managers.AttachmentLinkItemManager";
import type { AttachmentLinkItemProps } from "ext_discover.interfaces.components.AttachmentLinkItem";
import { Modal } from "ext_discover.features.components.Modal";
import { Button } from "ext_discover.features.components.Button";
import { ButtonsCover } from "ext_discover.features.components.ButtonsCover";
import { Checkbox } from "ext_discover.features.components.Checkbox";

const G = globalThis as Record<string, any>;
const isMobile =
  (window?.innerWidth || gridPortalBot.tags.pixelWidth) <
  G.MOBILE_VIEWPORT_THRESHOLD;

export function AttachmentLinkItem({
  clickPass,
  activeItemID,
  playlistId,
  setRef,
  oldItemsMap = {},
  dragOverSet,
  playlistName,
  linkingMode,
  viewOnly,
  checklistEnabled,
  checkListData = {},
  data,
  editDataFromPlaylist,
  creatingPlaylist,
  toggle,
  onClickItem,
  handleDragStart,
  handleDragOver,
  handleDragEnd,
  deleteFromList,
  originalIndex = 0,
  index = 0,
  playListSubIndex,
  onClick,
  setList,
  activeItemList = {},
  currentDateActive,
  originalList = [],
  datesRepeat = {},
  datesInWrongOrder = {},
  currentFormat,
  isSomethingEmbededChecked,
  draggable = true,
  layers,
  onDisembed,
  playingPlaylist = false,
  embedding,
  pId = "",
  onClickCheckbox,
  checked,
  isPlaylistNestedSupported = false,
  isPlaylistNestedPlayAble = false,
  autoPlayToggle = null,
  isDeleteShow = false,
  scope = "default",
  manager = getAttachmentLinkItemManager(`${scope}-${data.id}`),
}: AttachmentLinkItemProps) {
  manager.syncInitialDate(data);
  const editDateModal = manager.editDateModal.value;
  const date = manager.date.value;

  if (!isPlaylistNestedSupported && data.additionalInfo.type === "playlist") {
    return null;
  }

  const isVideoItem = G.IsVideoAttachment(data);
  const isTextType = data.type === "heading" || data.type === "text";
  const isQuotedText = data.additionalInfo.IsQuotedText;
  const comparator = playingPlaylist ? 1 : 0;

  const toggleAutoPlay = () => {
    if (autoPlayToggle) autoPlayToggle(originalIndex, pId, data.id);
  };

  const toggleIsQuoteText = (e: any) => {
    if (playingPlaylist) return;
    e.stopPropagation();
    G.SetIsQuotedText(true);
  };

  const handleContentClick = () => {
    if (data.type === "date") return;
    if (onClick) {
      clearInterval(G.ADDING_TOPLAYLIST_TIMEOUT);
      G.ADDING_TOPLAYLIST_TIMEOUT = null;
      onClick({ dataItem: data, index: originalIndex });
      if (checklistEnabled && !checkListData[data.id]) {
        editDataFromPlaylist?.(data.id);
      }
      return;
    }
    if (clickPass) {
      onClick?.({ dataItem: data, index: originalIndex });
      if (checklistEnabled && !checkListData[data.id]) {
        editDataFromPlaylist?.(data.id);
      }
      return;
    }
    if (G.SetCurrentItem) {
      G.SetCurrentItem({ ...data });
    }

    if (
      data.additionalInfo.type === "video-recording" ||
      data.additionalInfo.type === "Video" ||
      data.additionalInfo.type === "video" ||
      data.additionalInfo.type === "youtube"
    ) {
      CloseFloatingApp();
      openVideoPlayer({
        src: data.additionalInfo.link,
        isYoutube: !!data.additionalInfo.videoId,
        videoID: data.additionalInfo.videoId,
        content: data.content,
      });
      return;
    }

    if (data.additionalInfo.type === "externalLink") {
      if (G.OpenRefTimeout) {
        clearTimeout(G.OpenRefTimeout);
        G.OpenRefTimeout = null;
      }
      G.OpenRefTimeout = setTimeout(() => {
        const link = data.additionalInfo.link;
        const isVideo = G.IsVideoAttachment(data);
        if (isVideo) {
          CloseFloatingApp();
          openVideoPlayer({ src: link });
          return;
        }
        G.SetOpenExternalLink && G.SetOpenExternalLink(link);
      }, 200);
      return;
    }

    if (G.SetMediaURL) {
      G.SetMediaURL(null);
      if (data.additionalInfo.type === "voice-recording") {
        G.SetMediaURL(data.additionalInfo.link);
        G.SetFileName && G.SetFileName(data.content);
        return;
      }
    }

    if (creatingPlaylist) {
      invokeRenderLinkContent({ ...data });
    }
  };

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css"
      />
      {editDateModal && (
        <Modal
          title={t("changeDate")}
          showIcon={false}
          onClose={() => manager.setEditDateModal(false)}
        >
          <h3>{t("editDate")}</h3>
          <input
            type="date"
            value={date}
            onChange={(e: any) => manager.setDate(e.target.value)}
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
                if (setList) {
                  manager.onDateSave(setList, data);
                }
                manager.setEditDateModal(false);
              }}
            >
              {t("save")}
            </Button>
            <Button
              secondaryAlt
              onClick={() => manager.setEditDateModal(false)}
            >
              {t("close")}
            </Button>
          </ButtonsCover>
        </Modal>
      )}
      <div
        draggable={draggable && !viewOnly}
        tabIndex={0}
        className={`history-item 
                ${
                  dragOverSet?.itemId === data.id &&
                  `dropabble-${dragOverSet?.position}`
                }
                ${currentDateActive === data.id && "current-date-active"} 
                ${datesRepeat[data.id] && "current-date-repeat"} 
                ${datesInWrongOrder[data.id] && "current-date-disorder"} 
                ${
                  (data.id === activeItemID || activeItemList[data.id]) &&
                  "current-playing-item"
                } 
                ${
                  oldItemsMap[data.id] || (!!onDisembed && !!embedding)
                    ? "greyed-out"
                    : ""
                }
            `}
        onClick={() => {
          if (data.type === "date") return;
          if (data.additionalInfo.type === "playlist") {
            if (!isPlaylistNestedPlayAble) {
              return ShowNotification({
                message: "Cannnot Play Playlist While annotating!",
                severity: "error",
              });
            }
            startPlaylistPlaying({
              playingPlaylist: data.id,
              startIndex: 0,
              startSubIndex: -1,
              parentId: "default",
              name: data.content,
              list: [...data.additionalInfo.link],
            });
            return;
          }
          G.ADDING_TOPLAYLIST_TIMEOUT = setTimeout(() => {
            G.ADDING_TOPLAYLIST_TIMEOUT = null;
            onClickItem?.({ dataItem: data });
          }, 50);
        }}
        onPointerUp={() => {
          if (G.ADDING_TOPLAYLIST_TIMEOUT) {
            clearInterval(G.ADDING_TOPLAYLIST_TIMEOUT);
            G.ADDING_TOPLAYLIST_TIMEOUT = null;
          }
        }}
        onMouseLeave={() => {
          if (G.ADDING_TOPLAYLIST_TIMEOUT)
            clearInterval(G.ADDING_TOPLAYLIST_TIMEOUT);
        }}
        onTouchEnd={() => {
          if (G.ADDING_TOPLAYLIST_TIMEOUT)
            clearInterval(G.ADDING_TOPLAYLIST_TIMEOUT);
        }}
        onDragStart={() => {
          handleDragStart?.(index, pId);
        }}
        onDragOver={(e) => handleDragOver?.(index, originalIndex, null, e)}
        onDragEnd={handleDragEnd}
      >
        <input
          style={{
            opacity: "0",
            pointerEvents: "none",
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

                const isShiftHold = G?.KEY_HOLD?.["shift"];

                if (isShiftHold && !onDisembed) {
                  const upperLimit = Math.max(index, G.LAST_CLICK_ID);
                  const lowerLimit = Math.min(index, G.LAST_CLICK_ID);
                  const idsFilter = originalList
                    .filter((ele: { id: string }, indexInner: number) => {
                      const { id: itemId } = ele;
                      return (
                        indexInner <= upperLimit &&
                        indexInner >= lowerLimit &&
                        indexInner !== G.LAST_CLICK_ID &&
                        itemId !== embedding
                      );
                    })
                    .map((ele: { id: string }) => ele.id);
                  editDataFromPlaylist?.(idsFilter, false);
                  G.LAST_CLICK_ID = index;
                  return;
                }
                G.LAST_CLICK_ID = index;
                editDataFromPlaylist?.(data.id, false);
              }}
            />
          ) : null}
          {data.type !== "heading" ? (
            data.additionalInfo.type === "playlist" ? (
              <span
                onClick={() => {
                  if (data.type === "date" && creatingPlaylist && !viewOnly) {
                    manager.setEditDateModal(true);
                  }
                }}
                class="material-symbols-outlined unfollow drag-item-icon"
              >
                playlist_play
              </span>
            ) : data.additionalInfo.type === "voice-recording" ? (
              <img
                src={G.getFileIconByMimeType("audio/")}
                style={{ width: "18px" }}
              />
            ) : data.additionalInfo.type === "video-recording" ? (
              <img
                src={G.getFileIconByMimeType("video/")}
                style={{ width: "18px" }}
              />
            ) : data.additionalInfo.type === "file" ? (
              <img
                src={G.getFileIconByMimeType(data.additionalInfo.mimeType)}
                style={{ width: "18px" }}
              />
            ) : (
              <span
                style={{ position: "relative" }}
                class="material-symbols-outlined unfollow drag-item-icon"
              >
                <input
                  ref={manager.setDatePickerRef}
                  type="date"
                  onChange={(e: any) => {
                    if (!e.target.value) {
                      return;
                    }
                    if (setList) {
                      manager.onDateSave(setList, data, e?.target?.value || "");
                    }
                  }}
                  className="hidden-date"
                  placeholder="MM/DD/YYYY"
                />
                {data.type === "date" ? "calendar_month" : "media_link"}
              </span>
            )
          ) : null}
        </div>
        <p
          onClick={handleContentClick}
          className={`attachment-link ${
            data.type === "heading"
              ? "no-left-padding"
              : data.type !== "date" && checklistEnabled && !viewOnly
                ? "checklistEnabled"
                : ""
          } playlist-item-type playlist-item-verse ${
            toggle === data.id && "current-playing-item"
          }`}
        >
          {data.type === "date"
            ? G.FORMAT_DATE(data?.additionalInfo.date, currentFormat)
            : data?.content.substr(0, 25)}{" "}
          {`${data?.content.length > 25 ? "..." : ""}`}
        </p>
        <div className="actions">
          {data.additionalInfo.type === "file" && (
            <p
              className={`end-icon without-right-margin ${`${
                isMobile && "visible"
              } end-icon without-right-margin`}`}
              onClick={(e) => {
                e.stopPropagation();

                const link = document.createElement("a");
                link.href = data.additionalInfo.link;

                if (
                  location.origin === new URL(data.additionalInfo.link).origin
                ) {
                  link.download = data.content;
                } else {
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

          {((index === comparator &&
            !!autoPlayToggle &&
            !!onDisembed &&
            isVideoItem &&
            layers &&
            !playingPlaylist) ||
            (playingPlaylist && data.autoPlay)) && (
            <p
              onClick={(e) => {
                if (playingPlaylist) return;
                e.stopPropagation();
                toggleAutoPlay();
              }}
              className={`end-icon with-padding-activation ${
                data.autoPlay && !playingPlaylist ? "active" : ""
              } without-right-margin ${`${
                (isMobile || playingPlaylist) && "visible"
              }`}`}
            >
              <img
                src={
                  data.autoPlay && !playingPlaylist
                    ? AUTOPLAY_ICONS.TRUE
                    : AUTOPLAY_ICONS.FALSE
                }
                alt="autplay"
              />
            </p>
          )}

          {((isTextType && !!toggleIsQuoteText) ||
            (isTextType && isQuotedText && playingPlaylist)) && (
            <p
              className={`end-icon without-right-margin ${isQuotedText ? "active" : ""} ${`${
                isMobile && "visible"
              }`}`}
              onClick={(e) => {
                if (playingPlaylist) return;
                e.stopPropagation();
                toggleIsQuoteText(e);
              }}
            >
              <span class="material-symbols-outlined">home_max</span>
            </p>
          )}
          {EDITABLE_ATTACHMENT_TYPES[data.additionalInfo.type || data.type] &&
            creatingPlaylist &&
            !viewOnly && (
              <p
                className={`end-icon without-right-margin ${`${
                  isMobile && "visible"
                }`}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (data.type === "date") {
                    manager.clickDatePicker();
                    return;
                  }
                  G.SetEditAttachmentItem({
                    id: data.id,
                    parentId: pId,
                    selectedType: "LINK",
                    name: data.content,
                    data: data.link,
                    link: data.additionalInfo.link,
                    mediaType: data.additionalInfo.type,
                    isQuotedText: data.additionalInfo.isQuotedText,
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
                className={`end-icon without-right-margin ${`${
                  isMobile && "visible"
                }`}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDisembed?.();
                }}
              >
                <span class="material-symbols-outlined unfollow delete-icon">
                  link_off
                </span>
              </p>
            )}
          {((creatingPlaylist && !viewOnly) || isDeleteShow) && (
            <p
              className={`${
                isMobile && "visible"
              } end-icon without-right-margin`}
              onClick={(e) => {
                e.stopPropagation();
                deleteFromList?.(index, pId, data.id);
              }}
            >
              <span class="material-symbols-outlined unfollow delete-icon">
                delete
              </span>
            </p>
          )}
        </div>
      </div>
    </>
  );
}
