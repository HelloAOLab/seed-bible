import { recordingVoiceCss } from "ext_discover.css.recordingVoiceCss";
import { playlistContainerCss } from "ext_discover.css.PlaylistContainerCss";
import { AttachLink } from "ext_discover.components.AttachLink";
import { PlaylistPlayerControls } from "ext_discover.components.PlaylistPlayerControls";
import { PlaylistQueueContainer } from "ext_discover.components.PlaylistQueueContainer";
import { getPlayingPlaylistManager } from "ext_discover.managers.PlayingPlaylistManager";
import type { PlayingPlaylistProps } from "ext_discover.interfaces.components.PlayingPlaylist";
import { Button } from "ext_discover.features.components.Button";
import { Modal } from "ext_discover.features.components.Modal";
import { ButtonsCover } from "ext_discover.features.components.ButtonsCover";

const G = globalThis as Record<string, any>;
const DragDropT = G.DragDrop;

export function PlayingPlaylist({
  manager = getPlayingPlaylistManager(),
  scope = "default",
}: PlayingPlaylistProps) {
  manager.mount();
  void manager.renderTick.value;
  void manager.renderPlaylistTick.value;

  return (
    <>
      <style>{recordingVoiceCss}</style>
      <style>{playlistContainerCss}</style>
      {manager.queueDeleteConfirm.value > -1 && (
        <Modal
          title={t("deleteQueue")}
          showIcon={false}
          onClose={() => manager.setQueueDeleteConfirm(-1)}
          onConfirm={() =>
            manager.onDeleteWholeQueue(manager.queueDeleteConfirm.value)
          }
        >
          <p>{t("deleteQueueConfirmation")}</p>
          <ButtonsCover>
            <Button secondary onClick={() => manager.setQueueDeleteConfirm(-1)}>
              {t("cancel")}
            </Button>
            <Button
              secondaryAlt
              onClick={() => {
                manager.onDeleteWholeQueue(manager.queueDeleteConfirm.value);
                manager.setQueueDeleteConfirm(-1);
              }}
            >
              {t("delete")}
            </Button>
          </ButtonsCover>
        </Modal>
      )}

      {manager.showSettingsOptions.value && (
        <>
          <div
            className="backdrop"
            style={{ zIndex: 10001 }}
            onClick={() => manager.setShowSettingsOptions(false)}
          />
          <div
            style={{
              ...manager.showMorePosition.current,
              left: "none",
              right: "4rem",
              width: "236px",
              padding: "1rem",
              top: "3rem",
            }}
            className="overlay linked-item-custom"
          >
            <p style={{ marginBottom: "0" }}>
              <b>{t("playlistActions")}</b>
            </p>
            <span style={{ fontSize: "12px", marginBottom: "6px" }}>
              {t("playlistActionsDesc")}
            </span>
            {manager.isMobile.value ? null : (
              <div
                className="align-center"
                style={{
                  cursor: "pointer",
                }}
                onClick={async () => {
                  G.IsASwitchBetweenBar = true;
                  if (manager.isPlaybarInherited.value) {
                    await manager.togglePlaybarInherited();
                  } else {
                    if (G.RemoveNowBarApp) {
                      G.RemoveNowBarApp("player-playlist-bar");
                    }
                    os.unregisterApp("playing-playlist-flaot");
                  }
                  manager.setIsPlaybarInherited(
                    !manager.isPlaybarInherited.value
                  );
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <div
                    className={`settings-toggle ${manager.isPlaybarInherited.value ? "active" : ""}`}
                  >
                    <div className="settings-toggle-knob" />
                  </div>
                  <div className="item-text"> {t("movePlaybarInside")}</div>
                </div>
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "0.5rem",
                paddingTop: "0.5rem",
                borderTop: manager.isMobile.value
                  ? "none"
                  : "1px solid var(--gray2-color)",
              }}
            >
              <Button
                secondary
                onClick={() => {
                  G.StopPlayingPlaylistModal(true);
                  G.PendingAction = manager.gotoCreate;
                }}
              >
                {t("convertThisToPlaylist")}
              </Button>
            </div>
            <p className="info-type">{t("infoTextToConvertPLaylist")}</p>
          </div>
        </>
      )}

      <div
        className={`playing-queue-container${
          manager.hide.value ? " playing-queue-container--minimized" : ""
        }`}
        style={{
          height: "100%",
          backgroundColor: !manager.hide.value
            ? "var(--panelBackground)"
            : "transparent",
        }}
      >
        <div
          className={`playing-queue reset-css ${
            G.PPchecklistEnabled && "checklistEnabled"
          }${manager.hide.value ? " playing-queue--minimized" : ""}`}
          style={{ height: manager.hide.value ? "56px" : "100%" }}
        >
          {manager.hide.value && (
            <p className="current-playing-title">Current Playing:</p>
          )}
          <div
            className="header"
            style={{ paddingTop: manager.hide.value ? "0" : "10px" }}
            role={manager.hide.value ? "button" : undefined}
            tabIndex={manager.hide.value ? 0 : undefined}
            onClick={
              manager.hide.value ? () => manager.toggleHide() : undefined
            }
            onKeyDown={
              manager.hide.value
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      manager.toggleHide();
                    }
                  }
                : undefined
            }
          >
            <h3
              title={manager.playerState.value.currentPlaylistName}
              className="align-center"
              style={{ gap: "0.5rem" }}
            >
              {manager.hide.value
                ? manager.playerState.value.currentPlaylistName.substring(0, 10)
                : manager.playerState.value.currentPlaylistName}
              {manager.hide.value
                ? manager.playerState.value.currentPlaylistName.length > 10
                  ? "..."
                  : ""
                : ""}
            </h3>
            <div className="align-center" style={{ gap: "0.5rem" }}>
              {!manager.hide.value && (
                <div
                  className="publish-setting"
                  style={{
                    height: "22px",
                    minWidth: "22px",
                    padding: "0",
                    display: "grid",
                    placeItems: "center",
                  }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();

                    const x = rect.left; // X position where the element starts (from left of screen)
                    const y = rect.bottom; // Y position where the element ends (bottom of element from top of screen)

                    G.LastClickX = x;
                    G.LastClickY = y;
                    showMorePosition.current = { ...G.getPosition?.() };
                    manager.setShowSettingsOptions(true);
                  }}
                >
                  <img
                    style={{ height: "18px", width: "18px" }}
                    className="img-icon"
                    src={G.Settings_Icon}
                    alt="Settings_Icon"
                  />
                </div>
              )}
              <span
                style={{
                  cursor: "pointer",
                  border: "1px solid var(--secondaryColor)",
                  borderRadius: "3px",
                  color: "var(--secondaryColor)",
                  fontSize: "14px",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  manager.toggleHide();
                }}
                className="material-symbols-outlined unfollow"
              >
                {manager.hide.value ? "pip_exit" : "check_indeterminate_small"}
              </span>
              {manager.isMobile.value ? (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    G.StopPlayingPlaylistModal(true);
                  }}
                  style={{
                    margin: "0",
                    width: "20px",
                    height: "20px",
                    borderRadius: "6px",
                    border: "none",
                  }}
                  className="playlist-action small"
                >
                  <span
                    style={{
                      margin: "0",
                      fontSize: "15px",
                    }}
                    class="material-symbols-outlined unfollow"
                  >
                    close
                  </span>
                </span>
              ) : null}
            </div>
          </div>
          <div
            className="playing-queue-content"
            style={{
              paddingBottom: manager.isPlaybarInherited.value ? "8rem" : "14px",
            }}
          >
            {manager.queue.value.length ? (
              <>
                <h4>Next in Queue</h4>
                <DragDropT
                  checkListData={
                    G.PlayingPlaylistCheckedItems?.[G.PlayingPlaylistID] || {}
                  }
                  editDataFromPlaylist={manager.editDataFromPlaylist}
                  isPlayer={G.PPchecklistEnabled}
                  list={manager.queue.value}
                  setList={(v) => {
                    manager.queue.value =
                      typeof v === "function" ? v(manager.queue.value) : v;
                  }}
                  embedding={null}
                  PlayingPlaylist={true}
                  currentDateActive={manager.activeDate.value}
                  deleteFromList={() => {}}
                  creatingPlaylist={false}
                  onClick={() => {}}
                  currentFormat={manager.currentFormat}
                  activeItemID={manager.playerState.value.currentItemID}
                  onClickItem={() => {}}
                />
              </>
            ) : null}
            {Object.keys(G.PlayingPlaylists).map((key, index) => {
              const { name, list, broken, playlistID, id, isLayers } =
                G.PlayingPlaylists[key];
              return (
                <>
                  <PlaylistQueueContainer
                    manager={manager}
                    name={name}
                    list={list}
                    broken={broken}
                    playlistID={playlistID}
                    id={id}
                    isLayers={isLayers}
                    queueKeyName={key}
                    index={index}
                  />
                </>
              );
            })}
            {manager.isMobile.value ? (
              manager.openAttachLink.value ? (
                <AttachLink
                  canClose
                  canRecord={false}
                  massAdd={manager.massAdd}
                  sSelectedType="SCRIPTURE"
                  attachLink={manager.attachLink}
                  onClose={() => manager.setOpenAttachLink(false)}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0 0.5rem",
                    marginTop: "0.5rem",
                  }}
                  onClick={() => {
                    if (G.RemotePlaylistPlayed) {
                      return ShowNotification({
                        message: t("onlyHostCanAddItemsToQueue"),
                        severity: "error",
                      });
                    }
                    manager.setOpenAttachLink(true);
                  }}
                >
                  <p
                    style={{
                      margin: "0",
                      width: "26px",
                      height: "26px",
                      padding: "0",
                      borderRadius: "6px",
                      border: "0px solid var(--secondaryColor)",
                      backgroundColor: "var(--sidebarShadow)",
                    }}
                    className="playlist-action small"
                  >
                    <span
                      style={{ margin: "0", fontSize: "20px" }}
                      class="material-symbols-outlined unfollow"
                    >
                      add
                    </span>
                  </p>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      fontFamily: "DM Sans",
                      color: "var(--secondaryColor)",
                    }}
                  >
                    {t("addToTheCurrentQueue")}
                  </p>
                </div>
              )
            ) : null}
            <div className="mobile-pseudogap-element playing-playlist" />
          </div>
        </div>
        {manager.isPlaybarInherited.value && (
          <div
            style={{
              display: manager.hide.value ? "none" : "block",
              opacity: manager.hide.value ? 0 : 1,
              transition: "opacity 0.3s ease-in-out",
              zIndex: "1001",
              textTransform: " capitalize",
              padding: "12px",
              backgroundColor: "transparent",
              borderRadius: "4px",
              position: "absolute",
              bottom: "0",
              right: "0",
              fontWeight: "600",
              width: "calc(100%)",
              // borderTop: "1px solid #DADADA",
            }}
            className="reset-css"
          >
            <PlaylistPlayerControls
              parentId={manager.parentId}
              inheritedBar={true}
            />
          </div>
        )}
      </div>
    </>
  );
}
