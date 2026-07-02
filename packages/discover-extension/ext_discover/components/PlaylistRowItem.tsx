import { getPlaylistRowPercentage } from "ext_discover.hooks.getPlaylistRowPercentage";
import { startEditingPlaylist } from "ext_discover.hooks.startEditingPlaylist";
import { getPlaylistRowItemManager } from "ext_discover.managers.PlaylistRowItemManager";
import { onDownloadPlaylist } from "ext_discover.helper.onDownloadPlaylist";
import { onDuplicatePlaylists } from "ext_discover.helper.onDuplicatePlaylists";
import { BUTTON_STYLE } from "ext_discover.models.playlistRowItem";
import type { PlaylistRowItemProps } from "ext_discover.interfaces.components.PlaylistRowItem";
import type { PlaylistRowItemRowContext } from "ext_discover.interfaces.managers.PlaylistRowItemManager";

// Uncomment after child components are migrated:
import { CircleProgress } from "ext_discover.components.DynamicCircle";
import { RenderIcon } from "ext_discover.components.RenderIcon";
import { Checkbox } from "ext_discover.features.components.Checkbox";
import { LoaderSecondary } from "ext_discover.features.components.LoaderSecondary";
import { Modal } from "ext_discover.features.components.Modal";
import { ButtonsCover } from "ext_discover.features.components.ButtonsCover";
import { Button } from "ext_discover.features.components.Button";

const G = globalThis as Record<string, any>;

export function PlaylistRowItem({
  row,
  currentDateActive,
  shareProfileName,
  oldItemsMap = {},
  checkListData,
  selectedPlaylists = {},
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
  onSelectPlaylist = null,
  isDeleteShow = false,
  thisBot,
}: PlaylistRowItemProps) {
  const rowManager = row ?? getPlaylistRowItemManager(id);
  const isCustomIcons = icon?.startsWith("https") || isCustomIcon;
  const isPlayingPLaylist = playingPlaylist || G.IsPlaylistPlaying;
  const percentageCompleted = getPlaylistRowPercentage(id, parentId);
  const DragDropT = G.DragDrop;

  const rowCtx: PlaylistRowItemRowContext = {
    id,
    parentId,
    name,
    list,
    playListIndex,
    playListSubIndex,
    playListSubId,
    index,
    attachment,
    icon,
    isCustomIcon,
    color,
    isCustomColor,
    description,
    selectedTags,
    access,
    checklistEnabled,
    readingPlanEnabled,
    currentFormat,
    isLayers,
    shareProfileName,
    totalItem,
    creatingPlaylist,
    viewOnly,
    playingPlaylist,
    setPlaylists,
    setOpenedList,
    thisBot,
  };

  return (
    <>
      {!!rowManager.warningMessage.value && (
        <Modal
          title={t("editPlaylistTitle")}
          showIcon={false}
          onClose={rowManager.onCloseWarningPopup}
        >
          <p>{t("editSharedPlaylistMsg")}</p>
          <p>{t("makeACopy")}</p>
          <ButtonsCover>
            <Button
              secondary
              onClick={() => {
                onDuplicatePlaylists({ id, parentId });
                rowManager.setWarningMessage(null);
              }}
            >
              {t("yes")}
            </Button>
            <Button secondaryAlt onClick={rowManager.onCloseWarningPopup}>
              {t("no")}
            </Button>
          </ButtonsCover>
        </Modal>
      )}
      {rowManager.addToQueuePopup.value && (
        <Modal
          title={t("addPlaylistToQueueTitle")}
          showIcon={false}
          onClose={() => rowManager.setAddToQueuePopup(false)}
        >
          <p>{t("addPlaylistToQueueDescription")}</p>
          <ButtonsCover style={{ gap: "1rem", marginTop: "1rem" }}>
            <Button
              secondary
              onClick={() => {
                rowManager.onPlayPlaylist(rowCtx, true);
              }}
            >
              {t("yes")}
            </Button>
            <Button
              secondaryAlt
              onClick={() => rowManager.setAddToQueuePopup(false)}
            >
              {t("no")}
            </Button>
          </ButtonsCover>
        </Modal>
      )}
      <div
        onDragStart={() => {
          handleDragStart(playListIndex);
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onDragOver={() => {
          handleDragOver(playListIndex);
        }}
        style={{ zIndex: 100 - playListIndex, position: "relative" }}
        onDragEnd={handleDragEnd}
        draggable={!isPlayingPLaylist && !viewOnly}
        className={`playlist ${(isPlayingPLaylist || rowManager.isPlay.value) && "playingPlaylist-removeme"} ${id === opendedList ? "opened" : ""}  ${dragOverSet.itemId === id && `dropabble-${dragOverSet.position}`}`}
      >
        <div
          onClick={(e) => {
            e.preventDefault();
            if (onSelectPlaylist) {
              onSelectPlaylist(id);
            }
            rowManager.openContextMenu(e);
          }}
          onTouchStart={rowManager.handleTouchStart}
          onTouchEnd={rowManager.handleTouchEnd}
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
              onClick={() => setSelectPlaylist?.(id, parentId)}
              checked={selectedPlaylists[id]}
              style={{
                marginLeft: "10px",
                marginTop: "6px",
                marginRight: "10px",
              }}
            />
          )}
          <RenderIcon
            scope={id}
            isCustomIcons={isCustomIcons}
            icon={icon}
            list={list}
          />
          <h4
            onPointerDown={() => {
              G.ADDING_TOPLAYLIST_TIMEOUT = setTimeout(() => {
                G.ADDING_TOPLAYLIST_TIMEOUT = null;
              }, 1000);
            }}
            onPointerUp={() => {
              if (G.ADDING_TOPLAYLIST_TIMEOUT) {
                clearInterval(G.ADDING_TOPLAYLIST_TIMEOUT);
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

        {!onSelectPlaylist && (
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
            {rowManager.loading.value && <LoaderSecondary />}
            {!!rowManager.copyURL.value && (
              <span
                class="material-symbols-outlined unfollow"
                style={{
                  fontSize: "1.5rem",
                  color: "inherit",
                  cursor: "pointer",
                }}
                onClick={() => {
                  os.setClipboard(rowManager.copyURL.value);
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
                style={BUTTON_STYLE}
                onClick={() => {
                  rowManager.setShowMoreOptions((p) => !p);
                }}
                class="material-symbols-outlined unfollow"
              >
                more_vert
              </span>
            )}
            <CircleProgress id={id} progress={`${percentageCompleted}`} />
            {!creatingPlaylist && !viewOnly && !onSelectPlaylist ? (
              !isPlayingPLaylist || true ? (
                <span
                  style={{
                    ...BUTTON_STYLE,
                    fontSize: "1.97rem",
                    color: "var(--secondaryColor)",
                    top: "51%",
                    position: "absolute",
                    right: "0%",
                    transform: `translate(0%, -50%)`,
                    backgroundColor: "var(--themeSideMenu)",
                  }}
                  class="material-symbols-outlined unfollow"
                  onClick={() => rowManager.onPlayPlaylist(rowCtx, false)}
                >
                  play_circle
                </span>
              ) : (
                <>
                  <span
                    style={{
                      ...BUTTON_STYLE,
                    }}
                    onClick={() => {
                      G.ToggleGreyCheckPLayingPlaylist &&
                        G.ToggleGreyCheckPLayingPlaylist(null);
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
                    {t("nowPlaying")}
                  </span>
                </>
              )
            ) : null}
          </div>
        )}
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
            <h4 style={{ margin: "8px 0" }}>{t("noItemsYet")}</h4>
          )}
          {opendedList && (
            <DragDropT
              access={access}
              description={description}
              isDeleteShow={isDeleteShow}
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
              playlistName={`${playlistParentName}${playlistParentName ? " - " : ""}${name}`}
              linkingMode={linkingMode}
              viewOnly={viewOnly}
              parentId={parentId}
              checklistEnabled={checklistEnabled}
              toggle={toggle}
              creatingPlaylist={creatingPlaylist}
              playingPlaylist={isPlayingPLaylist}
              list={list}
              editDataFromPlaylist={(idx, isGroup, newVal) =>
                rowManager.editDataFromPlaylist(rowCtx, idx, isGroup, newVal)
              }
              playListSubIndex={playListIndex}
              playListSubId={id}
              setPlaylistFromRow={setPlaylists}
              onClick={(params: {
                dataItem: unknown;
                bulkAdd: boolean;
                index: number;
              }) => rowManager.onClick(rowCtx, params)}
              setList={(newList: Record<string, unknown>[]) =>
                rowManager.setPlaylist(rowCtx, newList)
              }
              deleteFromList={(idx: number | string[]) =>
                rowManager.deleteDataFromPlaylist(rowCtx, idx)
              }
              onClickItem={(params: { dataItem: unknown; bulkAdd: boolean }) =>
                rowManager.hanldeAdd(rowCtx, params)
              }
            />
          )}
        </div>
      </div>
      {rowManager.showMoreOptions.value && (
        <>
          <div
            className="backdrop transparent"
            onClick={() => rowManager.setShowMoreOptions(false)}
          />

          <div
            onClick={() => {
              rowManager.setShowMoreOptions(false);
            }}
            style={{
              ...(getPosition ? getPosition() : { x: 0, y: 0 }),
              width: "206px",
              overflow: "hidden",
            }}
            className="overlay linked-item-custom"
          >
            {!creatingPlaylist && !viewOnly && !isPlayingPLaylist && (
              <>
                <div
                  className="more-menu-items"
                  onClick={() => {
                    if (shareProfileName) {
                      rowManager.setWarningMessage(id);
                      rowManager.setShowMoreOptions(false);
                      return;
                    }
                    rowManager.setShowMoreOptions(false);
                    G.SetRenamingPlaylistEditTitle?.(true);
                    G.SetEditData?.((prev: Record<string, unknown>) => ({
                      ...prev,
                      id,
                      name,
                      description,
                      icon,
                      isCustomColor,
                      color,
                      isCustomIcon,
                      selectedTags,
                      access,
                    }));
                    G[`SetEditModal`]({
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
                    rowManager.setShowMoreOptions(false);
                  }}
                >
                  <p>{t("renamePlaylist")}</p>
                </div>
                <div
                  className="more-menu-items"
                  onClick={() => {
                    if (shareProfileName) {
                      rowManager.setWarningMessage(id);
                      rowManager.setShowMoreOptions(false);
                      return;
                    }
                    startEditingPlaylist(
                      name,
                      id,
                      list,
                      playListSubId,
                      attachment,
                      checklistEnabled ?? false,
                      parentId,
                      readingPlanEnabled ?? false,
                      currentFormat ?? "",
                      color,
                      icon,
                      isCustomColor,
                      description,
                      isCustomIcon,
                      selectedTags,
                      isLayers ?? false,
                      access ?? ""
                    );
                    rowManager.setShowMoreOptions(false);
                  }}
                >
                  <p>{t("editPlaylist")}</p>
                </div>
              </>
            )}
            <div
              className="more-menu-items"
              onClick={() => {
                onDuplicatePlaylists({ id, parentId });
                rowManager.setShowMoreOptions(false);
              }}
            >
              <p>{t("duplicatePlaylist")}</p>
            </div>
            <div
              className="more-menu-items"
              onClick={() => {
                onDownloadPlaylist({ id, parentId });
                rowManager.setShowMoreOptions(false);
              }}
            >
              <p>{t("downloadPlaylistJSON")}</p>
            </div>
            <div
              className="more-menu-items"
              onClick={() => void rowManager.copyClipBoard(rowCtx)}
            >
              <p>{t("sharePlaylist")}</p>
            </div>
            {!creatingPlaylist && !viewOnly && !isPlayingPLaylist && (
              <div
                className="more-menu-items"
                onClick={() => {
                  rowManager.deletePlayList(rowCtx);
                  rowManager.setShowMoreOptions(false);
                  rowManager.setShowMoreOptions(false);
                }}
              >
                <p>{t("delete")}</p>
              </div>
            )}
            {!creatingPlaylist &&
              !viewOnly &&
              !isPlayingPLaylist &&
              (playListSubId ? (
                <div
                  className="more-menu-items"
                  onClick={() => {
                    rowManager.exportNestedList(rowCtx);
                  }}
                >
                  <p>{t("exportOutside")}</p>
                  <span
                    class="material-symbols-outlined unfollow"
                    style={{ ...BUTTON_STYLE, fontSize: "22px" }}
                  >
                    call_split
                  </span>
                </div>
              ) : totalItem && totalItem > 1 && !viewOnly && false ? (
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

                    rowManager.openMergeModal({
                      id,
                      parentId,
                    });
                  }}
                >
                  <p>{t("mergePlaylist")}</p>
                  <span
                    class="material-symbols-outlined unfollow"
                    style={{ ...BUTTON_STYLE, fontSize: "22px" }}
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
}
