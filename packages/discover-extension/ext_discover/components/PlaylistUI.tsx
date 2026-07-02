import { GetLabel } from "ext_discover.components.GetLabel";
import { registerDragDrop } from "ext_discover.helper.registerDragDrop";
import { CloseFloatingApp } from "ext_discover.helper.CloseFloatingApp";
import { StopPlayingPlaylist } from "ext_discover.helper.StopPlayingPlaylist";
import { resetEditingState } from "ext_discover.helper.resetEditingState";
import { resetPlaylistGlobalStateVars } from "ext_discover.helper.resetPlaylistGlobalStateVars";
import { linkingCss } from "ext_discover.css.LinkingCss";
import { playlistContainerCss } from "ext_discover.css.PlaylistContainerCss";
import { playlistCss } from "ext_discover.css.playlistCss";
import { ProjectProvider } from "ext_discover.contexts.ProjectContext";
import { PlusIcon } from "app.components.icons";
import type { PlaylistUIProps } from "ext_discover.interfaces.components.PlaylistUI";
import { Discover } from "ext_discover.components.Discover";
import { CreatePlaylistUI } from "ext_discover.components.CreatePlaylistUI";
import { ShowPlayingContentAnnotation } from "ext_discover.components.ShowPlayingContentAnnotation";
import { EditRichText } from "ext_discover.components.EditRichText";
import { EditAttachment } from "ext_discover.components.EditAttachment";
import { AddToPlaylist } from "ext_discover.components.AddToPlaylist";
import { ConfirmLinkModal } from "ext_discover.components.ConfirmLinkModal";
import { isCustomIconUrl } from "ext_discover.hooks.isCustomIconUrl";
import { isMobilePlaylistViewport } from "ext_discover.hooks.isMobilePlaylistViewport";
import { RenderIcon } from "ext_discover.components.RenderIcon";
import { Modal } from "ext_discover.features.components.Modal";
import { Button } from "ext_discover.features.components.Button";
import { ButtonsCover } from "ext_discover.features.components.ButtonsCover";

const G = globalThis as Record<string, any>;

registerDragDrop();

export function PlaylistUI({
  shell,
  edit,
  annotation,
  groups,
  thisBot,
}: PlaylistUIProps) {
  const IsPlaylistPlaying = G.IsPlaylistPlaying;
  const GetLabelT = GetLabel;
  const PlaylistIconT = G.PlaylistIcon;
  const AnnotationIconT = G.AnnotationIcon;

  const isLayers = shell.tab.value === "discover";
  const isMobile = isMobilePlaylistViewport();
  const editData = edit.editData.value;
  const editAnnoData = edit.editAnnoData.value;
  const editRichText = edit.editRichText.value;
  const editAttachmentItem = edit.editAttachmentItem.value;
  const isCustomIcon = isCustomIconUrl(editData.icon);

  const handleTabClick = (onClick: () => void) => {
    if (shell.splitAppPanel2.value) {
      G.PendingAction = onClick;
      G.StopPlayingPlaylistModal(true);
      return;
    }
    onClick();
  };

  const handleCreateClick = (isAnnotation = false) => {
    if (shell.splitAppPanel2.value) {
      G.PendingAction = () => shell.gotoCreate(isAnnotation);
      G.StopPlayingPlaylistModal(true);
      return;
    }
    shell.gotoCreate(isAnnotation);
  };

  const discoverTabConfig = {
    label: t("discover"),
    value: "discover",
    onClick: () => shell.setTab("discover"),
    icon: "explore",
  };

  return (
    <>
      {!!editRichText.id && (
        <EditRichText
          parentID={editRichText.parentID}
          onClose={edit.onCloseEditRichText}
          contentId={editRichText.id}
          isQuotedText={editRichText.isQuotedText}
          text={editRichText.text}
        />
      )}
      {!!editAttachmentItem.id && (
        <EditAttachment
          isQuotedText={editAttachmentItem.isQuotedText}
          parentID={editAttachmentItem.parentId}
          onClose={edit.onCloseEditAttachmentItem}
          contentId={editAttachmentItem.id}
          selectedType={editAttachmentItem.selectedType}
          name={editAttachmentItem.name}
          data={editAttachmentItem.data}
          link={editAttachmentItem.link}
          mediaType={editAttachmentItem.mediaType}
        />
      )}

      {shell.openExternalLink.value && (
        <ConfirmLinkModal
          onClose={() => shell.setOpenExternalLink(null)}
          link={shell.openExternalLink.value}
        />
      )}

      {shell.stopPlaylistModal.value && (
        <Modal showIcon={false} onClose={shell.closeConfirmStopPlaylist}>
          <h2 style={{ fontSize: "1rem" }}>
            {t("thisWillStopPlayingPlaylist")}
          </h2>
          <p>{t("playlistCurrentlyPlayingConfirm")}</p>
          <ButtonsCover>
            <Button secondary onClick={shell.closeConfirmStopPlaylist}>
              {t("no")}
            </Button>
            <Button
              secondaryAlt
              onClick={() => {
                G.IsPlaylistPlaying = false;
                G.IsQueuePresent = false;
                StopPlayingPlaylist();
                os.unregisterApp("playing-playlist-flaot");
                CloseFloatingApp();
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

      {shell.createOptions.value && (
        <>
          <div
            className="backdrop"
            onClick={() => shell.setCreateOptions(false)}
          />
          <div
            onClick={() => shell.setCreateOptions(false)}
            style={{
              ...shell.showPlaylistPosition.value,
              width: isMobile ? "165px" : "210px",
              maxHeight: "105px",
              left: "none",
              right: isMobile ? "-9rem" : "-12rem",
              padding: "0.5rem",
              top: !isMobile ? "0rem" : "none",
              bottom: !isMobile ? "none" : "11rem",
              marginTop: 45,
            }}
            className="overlay linked-item-custom"
          >
            <div
              className="more-menu-items"
              onClick={(e) => {
                e.stopPropagation();
                handleCreateClick(false);
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
            {DEV_ENV && (
              <div
                className="more-menu-items"
                onClick={(e) => {
                  if (!authBot?.id) {
                    ShowNotification({
                      message: t("pleaseLoginToUseFeature"),
                      severity: "error",
                    });
                    shout("tryUserLogin");
                    return;
                  }
                  e.stopPropagation();
                  handleCreateClick(true);
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
            )}
          </div>
        </>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          containerType: "inline-size",
        }}
      >
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
                --width: ${groups.activePlaylistIds.value.length * 400}px
              }`}
            </style>

            <style>{linkingCss}</style>
            <style>{playlistContainerCss}</style>
            <style>{playlistCss}</style>
            {shell.splitAppPanel2.value}
            {shell.openModal.value && (
              <Modal onClose={() => shell.setOpenModal(false)}>
                <h2 style={{ fontSize: "1rem" }}>
                  {t("addAnotherParallelPlaylist")}
                </h2>
                <ButtonsCover>
                  <Button
                    onClick={() => groups.onAddPlaylist()}
                    varient="black"
                  >
                    {t("yes")}
                  </Button>
                  <Button onClick={() => shell.setOpenModal(false)}>
                    {t("close")}
                  </Button>
                </ButtonsCover>
              </Modal>
            )}

            <div
              id="sidebar-bar"
              className={`playlist-cont-parent ${
                IsPlaylistPlaying ? "playing-playlist" : ""
              } ${shell.queueOpen.value && "queueOpen"} ${
                shell.hide.value && "hide"
              } ${shell.sidebarOpen.value ? "sidebarOpen" : ""}`}
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
                    className="playlist-cont-actions"
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
                          resetPlaylistGlobalStateVars();
                          resetEditingState({ id: editData.id }, thisBot);
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
                        {[discoverTabConfig].map((ele) => {
                          const { label, onClick, value, icon } = ele;
                          return (
                            <h4
                              onClick={() => handleTabClick(onClick)}
                              style={{ width: "75%" }}
                              className="tabs-playlist-item"
                            >
                              <span
                                onClick={shell.closePlaylist}
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
                                <GetLabelT
                                  widthCompare={isMobile ? 360 : 264}
                                  value={value}
                                  currentOpenedBook={
                                    annotation.currentOpenedBook.value
                                  }
                                />
                              </span>
                            </h4>
                          );
                        })}
                        <Button
                          onClick={() => shell.setCreateOptions(true)}
                          secondary
                          exClass="create-button show-on-desktop"
                        >
                          <PlusIcon width={22} height={22} />
                          {t("create")}
                        </Button>
                        <span
                          onClick={() => thisBot.CloseSelf()}
                          class="material-symbols-outlined show-on-mobile"
                          style={{
                            fontSize: "24px",
                            margin: "0 0.5rem",
                          }}
                        >
                          close
                        </span>
                        {!G.IsPlaylistPlaying && (
                          <Button
                            onClick={() => shell.setCreateOptions(true)}
                            secondary
                            exClass="create-button-mobile show-on-mobile"
                          >
                            <span
                              class={`material-symbols-outlined ${
                                shell.createOptions.value ? "rotate-90" : ""
                              }`}
                            >
                              add
                            </span>
                          </Button>
                        )}
                      </div>
                    )}

                    {editData.id && (
                      <div
                        className="align-center"
                        style={{ marginLeft: "1rem" }}
                      >
                        <RenderIcon
                          scope={`${editData.id}-edit`}
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
                  </div>
                </div>
              )}
              {isLayers ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    overflow: "auto",
                    paddingBottom: shell.splitAppPanel2.value ? "0rem" : "0",
                    height: `calc(100% - ${
                      groups.playingPlaylist.value || !!editData.id
                        ? "130px"
                        : "40px"
                    })`,
                  }}
                >
                  <Discover
                    setAnnotationData={annotation.setAnnotationData}
                    editingPlaylist={editData.id}
                    currentOpenedBook={annotation.currentOpenedBook.value}
                    fetchingAnnotation={annotation.fetchingAnnotation.value}
                    chapter={annotation.currentOpenedBook.value?.chapter}
                    annotationData={annotation.annotationData.value}
                    style={{ height: "100%" }}
                    setOpenModal={shell.setOpenModal}
                    playingPlaylist={groups.playingPlaylist.value}
                    annotationSources={annotation.annotationSources.value}
                    tagsSources={annotation.tagsSources.value}
                  />
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    overflow: "auto",
                    height: `calc(100% - ${
                      groups.playingPlaylist.value || !!editData.id
                        ? "90px"
                        : "0px"
                    })`,
                  }}
                >
                  <CreatePlaylistUI
                    editData={editAnnoData}
                    setTab={shell.setTab}
                    isCreate
                    setOpenModal={shell.setOpenModal}
                    active={true}
                    playingPlaylist={groups.playingPlaylist.value}
                    id="default"
                  />
                </div>
              )}
            </div>
            {shell.showAddToPlaylist.value && (
              <AddToPlaylist
                id="default"
                onClose={() => shell.setShowAddToPlaylist(false)}
              />
            )}
          </div>
        </ProjectProvider>
        {!!isLayers && !groups.playingPlaylist.value && !editData.id && (
          <ShowPlayingContentAnnotation />
        )}
      </div>
    </>
  );
}
