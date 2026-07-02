import { GetLabel } from "ext_discover.components.GetLabel";
import { openSelf } from "ext_discover.helper.openSelf";
import { linkingCss } from "ext_discover.css.LinkingCss";
import { playlistContainerCss } from "ext_discover.css.PlaylistContainerCss";
import { playlistCss } from "ext_discover.css.playlistCss";
import { AttachLink } from "ext_discover.components.AttachLink";
import { AudioPlayer } from "ext_discover.components.AudioPlayer";
import { ConfirmLinkModal } from "ext_discover.components.ConfirmLinkModal";
import { MobilePlaylistToggleButton } from "ext_discover.components.MobilePlaylistToggleButton";
import { RenderHTMLContent } from "ext_discover.components.RenderHTMLContent";
import { VideoPlayer } from "ext_discover.components.VideoPlayer";
import { getPlaylistPlayerControlsManager } from "ext_discover.managers.PlaylistPlayerControlsManager";
import type { PlaylistPlayerControlsProps } from "ext_discover.interfaces.components.PlaylistPlayerControls";
import {
  PrevIcon,
  NextIcon,
} from "ext_discover.components.PlaylistPlayerControlIcons";
import { Button } from "ext_discover.features.components.Button";

const G = globalThis as Record<string, any>;
const GetLabelT = GetLabel;

export function PlaylistPlayerControls({
  parentId = "default",
  inheritedBar = false,
  scope = "default",
  manager = getPlaylistPlayerControlsManager(scope),
}: PlaylistPlayerControlsProps) {
  manager.syncProps({ parentId, inheritedBar, scope });
  manager.mount();

  return (
    <>
      <style>{linkingCss}</style>
      <style>{playlistContainerCss}</style>
      <style>{playlistCss}</style>

      {manager.openExternalLink.value && (
        <ConfirmLinkModal
          onClose={() => manager.setOpenExternalLink(null)}
          link={manager.openExternalLink.value}
          controlBalInternal
        />
      )}

      {manager.isMobile.value && !manager.inheritedBar.value ? (
        <div
          className="mobile-playlist-player-controls"
          style={{
            marginBottom:
              !!manager.mediaURL.value ||
              !!manager.videoSrc.value ||
              !!manager.textInfo.value
                ? "3rem"
                : "0",
          }}
        >
          {!!manager.textInfo.value && (
            <div className="textinfo-playlist">
              <RenderHTMLContent htmlContent={manager.textInfo.value} />
            </div>
          )}
          {!!manager.videoSrc.value && (
            <div className="textinfo-playlist">
              <VideoPlayer
                videoSrc={manager.videoSrc.value}
                playlistItem={manager.queueInfo.value.currentItem}
              />
            </div>
          )}
          {!!manager.mediaURL.value && (
            <AudioPlayer
              shadow
              secondaryClose
              fileName={manager.fileName.value ?? undefined}
              close={true}
              mediaURL={manager.mediaURL.value ?? undefined}
            />
          )}
          {/* <div className="mobile-playlist-player-controls-buttons"> */}
          <Button
            exClass={`mobile-playlist-player-controls-button prev-button ${!manager.queueInfo.value.prevItemName?.content ? "disabled" : ""}`}
            onClick={() => {
              if (!manager.queueInfo.value.prevItemName?.content) {
                return ShowNotification({
                  message: t("youAreAtTheBeginningOfThePlaylist"),
                  severity: "info",
                });
              }
              DataManager.cancelCurrentPlayingSound();
              if (G.HandleOnButtonPress) G.HandleOnButtonPress(-1);
            }}
          >
            <PrevIcon
              width="26"
              height="24px"
              fill={
                !manager.queueInfo.value.prevItemName?.content
                  ? "var(--settingsIcon)"
                  : "var(--pageTextColor)"
              }
            />
          </Button>
          <Button
            exClass={`mobile-playlist-player-controls-button next-button ${!manager.queueInfo.value.nextItemName?.content ? "disabled" : ""}`}
            onClick={() => {
              if (!manager.queueInfo.value.nextItemName?.content) {
                return ShowNotification({
                  message: t("playlistHasBeenEnded"),
                  severity: "info",
                });
              }
              DataManager.cancelCurrentPlayingSound();
              if (
                !!manager.queueInfo.value.nextItemName?.content &&
                !!G.HandleOnButtonPress
              ) {
                G.HandleOnButtonPress(1);
                return;
              }
              // globalThis.SetPlayingPlaylist && globalThis.SetPlayingPlaylist(false);
              G[`${parentId}ToggleGreyCheckPLayingPlaylist`] &&
                G[`${parentId}ToggleGreyCheckPLayingPlaylist`](null);
              G.IsQueuePresent = false;
              G.IS_PLAYLIST_ACTIVE = false;
              CloseFloatingApp();
              G.SetSplitAppPanel2 && G.SetSplitAppPanel2(null);
              // os.unregisterApp("playing-playlist");
              // thisBot.showInfo(`History Mode`);
              os.unregisterApp("playing-playlist-flaot");
              if (G.RemoveNowBarApp) {
                G.RemoveNowBarApp("player-playlist-bar");
              }
            }}
          >
            <NextIcon
              width="14"
              height="16"
              fill={
                !manager.queueInfo.value.nextItemName?.content
                  ? "var(--settingsIcon)"
                  : "var(--pageTextColor)"
              }
            />
          </Button>
          {/* </div> */}
        </div>
      ) : manager.openAttachLink.value ? (
        <div
          style={{
            position: "relative",
            // bottom: (checklistEnabled) ? 'calc(62px)' : "calc(62px + 153px)",
            // left: "0px",
            // zIndex: "1001",
            textTransform: "capitalize",
            // padding: "12px",
            borderRadius: "4px",
            fontWeight: "600",
            width: "calc(100%)",
            // borderTop: "1px solid #DADADA",
            backgroundColor: "var(--pageBackground)",
            height: "auto",
          }}
          className="flaoting-attach-link"
        >
          <AttachLink
            canClose
            canRecord={false}
            massAdd={manager.massAdd}
            sSelectedType="SCRIPTURE"
            attachLink={manager.attachLink}
            onClose={() => manager.setOpenAttachLink(false)}
          />
        </div>
      ) : (
        <div
          style={{
            background: "var(--pageBackground)",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            boxShadow: "0px 0px 9px 0px #00000026",
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            justifyContent: "center",
          }}
        >
          {!!manager.textInfo.value && (
            <div className="textinfo-playlist">
              <RenderHTMLContent htmlContent={manager.textInfo.value} />
            </div>
          )}
          {!!manager.videoSrc.value && (
            <VideoPlayer
              videoSrc={manager.videoSrc.value}
              playlistItem={manager.queueInfo.value.currentItem}
            />
          )}
          {!!manager.mediaURL.value && (
            <AudioPlayer
              fileName={manager.fileName.value ?? undefined}
              secondaryClose
              close
              mediaURL={manager.mediaURL.value ?? undefined}
            />
          )}

          {manager.isItemLink.value && false && (
            <div>
              <p>Link showing refuse to connect Problems? </p>
              <a
                href={currentItem?.additionalInfo?.link}
                target="_blank"
                rel="noopener noreferrer"
                title="Visit link"
              >
                Click here to open
              </a>
            </div>
          )}
          <div
            style={{
              display: "flex",
              // flexDirection: manager.isMobileSmall.value ? "column" : "row",
              flexDirection: "row",
              justifyContent: "space-between",
              gap: "0.5rem",
              width: "calc(100%)",
            }}
          >
            <div className="playlist-player-controls-info">
              {(!manager.isMobileSmall.value ||
                (manager.showCurrent.value
                  ? !!manager.queueInfo.value.currentItem?.content
                  : !!manager.queueInfo.value.nextItemName?.content)) && (
                <p
                  style={{
                    fontSize: "12px",
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    margin: "0",
                    // marginBottom: "0.5rem",
                    fontFamily: "DM Sans",
                    height: "12px",
                    color: "var(--pageTextColor)",
                    minWidth: "max-content",
                  }}
                >
                  {G.PPchecklistEnabled &&
                  manager.showCurrent.value &&
                  manager.currIndex.value.index === -1
                    ? null
                    : manager.showCurrent.value
                      ? `${t("playingNow")}:`
                      : manager.queueInfo.value.nextItemName?.content
                        ? `${t("playingNext")}:`
                        : null}
                </p>
              )}
              <div style={{ gap: "0.5rem" }} className="align-center">
                <div
                  style={{
                    height: "1.5rem",
                    width: "1.5rem",
                    display: "grid",
                    placeItems: "center",
                    backgroundColor: "var(--activeTabFill)",
                    borderRadius: "0.25rem",
                    color: "var(--pageTextColor)",
                  }}
                >
                  <span
                    style={{ margin: "0", fontSize: "14px" }}
                    class="material-symbols-outlined unfollow"
                  >
                    {manager.queueInfo.value.nextItemName?.type ===
                    "attachment-link"
                      ? "media_link"
                      : "description"}
                  </span>
                </div>
                <div style={{ position: "relative", flexGrow: "1" }}>
                  <div
                    className={`fade-in-animation  ${
                      manager.showCurrent.value ? "" : "show"
                    }`}
                  >
                    {manager.queueInfo.value.nextItemName?.content ? (
                      manager.queueInfo.value.nextItemName?.additionalInfo
                        ?.book && manager.isMobile.value ? (
                        <GetLabelT
                          needToShowInMobile={true}
                          value="discover"
                          fontSize="0.75rem"
                          currentOpenedBook={{
                            book: manager.queueInfo.value.nextItemName.content,
                          }}
                          widthCompare={manager.isMobile.value ? 65 : 300}
                        />
                      ) : (
                        <p
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            display: "flex",
                            alignItems: "center",
                            fontFamily: "DM Sans",
                            margin: "0",
                            color: "var(--pageTextColor)",
                          }}
                        >
                          {G.GetTruncatedPlaylistLabel(
                            nextItemName,
                            manager.isMobile.value ? 9 : 16
                          )}
                        </p>
                      )
                    ) : (
                      <p
                        style={{
                          color: "var(--secondaryColor)",
                          fontSize: "12px",
                          fontWeight: "900",
                          fontFamily: "DM Sans",
                          margin: "0",
                          minWidth: "max-content",
                        }}
                      >
                        {t("playlist")} {t("ended")}
                      </p>
                    )}
                    {!G.ValidTypes[
                      manager.queueInfo.value.nextItemName?.type
                    ] &&
                      !manager.showCurrent.value &&
                      !!manager.queueInfo.value.nextItemName?.type && (
                        <p
                          style={{
                            fontSize: "12px",
                            fontWeight: "400",
                            margin: "0",
                            textTransform: "capitalize",
                            color: "var(--pageTextColor)",
                          }}
                        >
                          {manager.isMobile.value
                            ? manager.queueInfo.value.nextItemName?.type?.substring(
                                0,
                                10
                              )
                            : manager.queueInfo.value.nextItemName?.type}
                        </p>
                      )}

                    {!G.ValidTypes[manager.queueInfo.value.currentItem?.type] &&
                      manager.showCurrent.value && (
                        <p
                          style={{
                            fontSize: "12px",
                            fontWeight: "400",
                            margin: "0",
                            textTransform: "capitalize",
                            color: "var(--pageTextColor)",
                          }}
                        >
                          {manager.isMobile.value
                            ? manager.queueInfo.value.currentItem?.type?.substring(
                                0,
                                10
                              )
                            : manager.queueInfo.value.currentItem?.type}
                        </p>
                      )}
                  </div>
                  <div
                    style={{ width: "100%", minWidth: "max-content" }}
                    className={`fade-in-animation overlay-top-left  ${
                      manager.showCurrent.value ? "show" : ""
                    }`}
                  >
                    {manager.queueInfo.value.currentItem?.content ? (
                      manager.queueInfo.value.currentItem?.additionalInfo
                        ?.book && manager.isMobile.value ? (
                        <GetLabelT
                          needToShowInMobile={true}
                          fontSize="0.75rem"
                          value="discover"
                          currentOpenedBook={{
                            book: manager.queueInfo.value.currentItem?.content,
                          }}
                          widthCompare={manager.isMobile.value ? 65 : 300}
                        />
                      ) : (
                        <p
                          style={{
                            fontSize: "0.65rem",
                            fontWeight: "600",
                            display: "flex",
                            alignItems: "center",
                            fontFamily: "DM Sans",
                            margin: "0",
                            color: "var(--pageTextColor)",
                          }}
                        >
                          {manager.queueInfo.value.currentItem?.content
                            ? `${manager.queueInfo.value.currentItem?.content}${manager.queueInfo.value.currentItem?.prefix}`?.substring(
                                0,
                                manager.isMobile.value ? 10 : 16
                              )
                            : ""}
                          {`${manager.queueInfo.value.currentItem?.content}${manager.queueInfo.value.currentItem?.prefix}`
                            .length > (manager.isMobile.value ? 10 : 16)
                            ? "..."
                            : ""}
                        </p>
                      )
                    ) : (
                      <p
                        style={{
                          color: "var(--secondaryColor)",
                          fontSize: "12px",
                          fontWeight: "900",
                          fontFamily: "DM Sans",
                          margin: "0",
                          minWidth: "max-content",
                        }}
                      >
                        {G.PPchecklistEnabled &&
                        manager.currIndex.value.index === -1
                          ? t("checklistEnabled")
                          : `${manager.isMobile.value ? "" : t("playlist")} {t("ended")}`}
                      </p>
                    )}

                    {!G.ValidTypes[manager.queueInfo.value.currentItem?.type] &&
                      manager.showCurrent.value && (
                        <p
                          style={{
                            fontSize: "12px",
                            fontWeight: "400",
                            color: "var(--pageTextColor)",
                            margin: "0",
                            textTransform: "capitalize",
                          }}
                        >
                          {manager.isMobile.value
                            ? manager.queueInfo.value.currentItem?.type?.substring(
                                0,
                                10
                              )
                            : manager.queueInfo.value.currentItem?.type}
                        </p>
                      )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex align-center" style={{ gap: "0.5rem" }}>
              <MobilePlaylistToggleButton parentId={manager.parentId} />
              <p
                onClick={() => {
                  if (G.RemotePlaylistPlayed) {
                    return ShowNotification({
                      message: t("onlyHostCanAddItemsToQueue"),
                      severity: "error",
                    });
                  }
                  manager.setOpenAttachLink(true);
                }}
                style={{
                  margin: "0",
                  width: "26px",
                  height: "26px",
                  padding: "0",
                  borderRadius: "6px",
                  backgroundColor: "var(--activeTabFill)",
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
            </div>
          </div>

          <div
            style={{
              width: "100%",
              margin: "0.5rem 0",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <div
              style={{
                height: "4px",
                width: "100%",
                backgroundColor: "var(--gray2-color)",
                borderRadius: "999px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${manager.progress.value.percent}%`,
                  backgroundColor: "var(--secondaryColor)",
                  transition: "width 0.2s ease",
                }}
              />
            </div>
            <p
              style={{
                margin: "0",
                minWidth: "fit-content",
                color: "var(--gray1-color)",
                fontSize: "0.85rem",
                fontWeight: "500",
              }}
            >
              {manager.progress.value.safeCurrent}/
              {manager.progress.value.safeTotal}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              width: "100%",
              gap: "1rem",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {false && (
              <img
                src={EditPlaylist}
                class="material-symbols-outlined unfollow"
                style={{
                  margin: "0",
                  width: "1rem",
                  marginRight: "1rem",
                  cursor: "pointer",
                }}
                onClick={G.PlaylistPlaytoggleHide}
              />
            )}
            <Button
              style={{
                margin: "0",
                minWidth: "auto",
                backgroundColor: "transparent",
                border: "0px solid var(--secondaryColor)",
                boxShadow: "none",
                padding: "8px",
                cursor: !manager.queueInfo.value.prevItemName?.content
                  ? "not-allowed"
                  : "",
                fontSize: "12px",
              }}
              onClick={() => {
                if (!manager.queueInfo.value.prevItemName?.content) {
                  return ShowNotification({
                    message: t("youAreAtTheBeginningOfThePlaylist"),
                    severity: "info",
                  });
                }
                DataManager.cancelCurrentPlayingSound();
                if (G.HandleOnButtonPress) G.HandleOnButtonPress(-1);
              }}
            >
              <PrevIcon
                fill={
                  !manager.queueInfo.value.prevItemName?.content
                    ? "var(--unselectedSpaceColor)"
                    : "var(--pageTextColor)"
                }
              />
            </Button>
            <p
              onClick={() => {
                G.IsPlaylistPlaying = false;
                DataManager.cancelCurrentPlayingSound();
                G.SetSelected && G.SetSelected({});
                G.SetHolded && G.SetHolded({});
                // globalThis.SetPlayingPlaylist && globalThis.SetPlayingPlaylist(false);
                G[`${parentId}ToggleGreyCheckPLayingPlaylist`] &&
                  G[`${parentId}ToggleGreyCheckPLayingPlaylist`](null);
                G.IsQueuePresent = false;
                // os.unregisterApp("playing-playlist");
                G.IS_PLAYLIST_ACTIVE = false;
                G.SetSplitAppPanel2 && G.SetSplitAppPanel2(null);
                void openSelf();
                // thisBot.showInfo(`History Mode`);
                if (G.RemoveNowBarApp) {
                  G.RemoveNowBarApp("player-playlist-bar");
                }
                os.unregisterApp("playing-playlist-flaot");
                resetPlaylistGlobalStateVars();
                CloseFloatingApp();
              }}
              style={{
                margin: "0",
                width: "2.55rem",
                height: "2.55rem",
                borderRadius: "50%",
                border: "none",
              }}
              className="playlist-action small"
            >
              <span
                style={{
                  margin: "0",
                  fontSize: "14px",
                  backgroundColor: "var(--secondaryColor)",
                }}
                class="material-symbols-outlined unfollow"
              >
                stop
              </span>
            </p>
            <Button
              style={{
                fontSize: "12px",
                margin: "0",
                minWidth: "auto",
                backgroundColor: "transparent",
                border: "0px solid var(--secondaryColor)",
                boxShadow: "none",
                color: "#000",
                padding: "8px",
                cursor: !manager.queueInfo.value.nextItemName?.content
                  ? "not-allowed"
                  : "",
              }}
              onClick={() => {
                if (!manager.queueInfo.value.nextItemName?.content) {
                  return ShowNotification({
                    message: t("playlistHasBeenEnded"),
                    severity: "info",
                  });
                }
                DataManager.cancelCurrentPlayingSound();
                if (
                  !!manager.queueInfo.value.nextItemName?.content &&
                  !!G.HandleOnButtonPress
                ) {
                  G.HandleOnButtonPress(1);
                  return;
                }
                // globalThis.SetPlayingPlaylist && globalThis.SetPlayingPlaylist(false);
                G[`${parentId}ToggleGreyCheckPLayingPlaylist`] &&
                  G[`${parentId}ToggleGreyCheckPLayingPlaylist`](null);
                G.IsQueuePresent = false;
                G.IS_PLAYLIST_ACTIVE = false;
                CloseFloatingApp();
                G.SetSplitAppPanel2 && G.SetSplitAppPanel2(null);
                // os.unregisterApp("playing-playlist");
                // thisBot.showInfo(`History Mode`);
                os.unregisterApp("playing-playlist-flaot");
                if (G.RemoveNowBarApp) {
                  G.RemoveNowBarApp("player-playlist-bar");
                }
              }}
            >
              <NextIcon
                fill={
                  !manager.queueInfo.value.nextItemName?.content
                    ? "var(--unselectedSpaceColor)"
                    : "var(--pageTextColor)"
                }
              />
            </Button>
            {false && (
              <img
                src={SharePlaylist}
                class="material-symbols-outlined unfollow"
                style={{
                  margin: "0",
                  marginLeft: "1rem",
                  width: "1rem",
                  cursor: "not-allowed",
                }}
                onClick={() => {
                  return ShowNotification({
                    message: t("comingSoon"),
                    severity: "error",
                  });
                }}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
