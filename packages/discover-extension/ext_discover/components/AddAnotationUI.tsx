import { AttachmentLinkItem } from "ext_discover.components.AttachmentLinkItem";
import { AudioPlayer } from "ext_discover.components.AudioPlayer";
import { VideoPlayer } from "ext_discover.components.VideoPlayer";
import { TogglePlaylistHeight } from "ext_discover.components.TogglePlaylistHeight";
import { AnnotationInnerDiv } from "ext_discover.components.AnnotationInnerDiv";
import { getAddAnotationUIManager } from "ext_discover.managers.AddAnotationUIManager";
import { resetPlaylistGlobalStateVars } from "ext_discover.helper.resetPlaylistGlobalStateVars";
import {
  PREVIEW_ICON_ACTIVE,
  PREVIEW_ICON_INACTIVE,
} from "ext_discover.models.addAnotationUIPreviewIcons";
import type { AddAnotationUIProps } from "ext_discover.interfaces.components.AddAnotationUI";
import { CustomAnnotationTextEditor } from "ext_discover.components.CustomAnnotationTextEditor";
import { Chips } from "ext_discover.features.components.Chips";
import { Button } from "ext_discover.features.components.Button";
import { Tooltip } from "ext_discover.features.components.Tooltip";
import { LoaderSecondary } from "ext_discover.features.components.LoaderSecondary";
import { Modal } from "ext_discover.features.components.Modal";
import { ButtonsCover } from "ext_discover.features.components.ButtonsCover";

const G = globalThis as Record<string, any>;
const AnnotationIconI = G.AnnotationIcon;

export function AddAnotationUI(props: AddAnotationUIProps) {
  const { id, editData, onReset } = props;
  const m = props.manager ?? getAddAnotationUIManager(id, props);
  m.syncProps(props);
  m.mount();

  const finalHistoryObject = m.finalHistoryObject.value;
  const checkListData = m.checkListData.value;
  const checkListEmbeded = m.checkListEmbeded.value;
  const isSomethingChecked = m.isSomethingChecked.value;
  const isSomethingEmbededChecked = m.isSomethingEmbededChecked.value;
  const checkEnabled = m.checkEnabled.value;

  return (
    <>
      {m.loseProgresss.value && (
        <Modal
          showIcon={false}
          onClose={() => {
            m.setLoseProgresss(false);
          }}
        >
          <h2 style={{ fontSize: "1rem" }}>{t("embeddedItemsWillBeLost")}</h2>
          <p>
            t('switchingToAnotherModeWillLoseTheEmbeddedItemsDoYouWantToContinue')
          </p>
          <ButtonsCover>
            <Button
              secondaryAlt
              onClick={() => {
                m.loseProgressAction.current?.();
              }}
              variant="black"
            >
              {t("confirm")}
            </Button>
            <Button
              secondary
              onClick={() => {
                m.setLoseProgresss(false);
              }}
            >
              {t("no")}
            </Button>
          </ButtonsCover>
        </Modal>
      )}
      {m.showPlaylistSettings.value && (
        <>
          <div
            className="backdrop"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              G.LastClickX = rect.left;
              G.LastClickY = rect.bottom;
              m.setShowPlaylistSettings(false);
            }}
          />
          <div
            style={{
              ...m.showPlaylistPosition.current,
              width: "220px",
              padding: "1rem",
            }}
            className="overlay linked-item-custom"
          >
            <div
              className="more-menu-items active"
              onClick={() => {
                m.setMode(G.PlaylistModeTypes.annotations);
                m.setShowPlaylistSettings(false);
              }}
            >
              <div className="align-center">
                <span
                  style={{ fontSize: "20px" }}
                  class="material-symbols-outlined"
                >
                  draft
                </span>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    marginLeft: "4px",
                  }}
                  for="playlistInclude"
                >
                  {t("annotationMode")}
                </label>
              </div>
              <Tooltip forRight={true} text={t("annotationModeTooltip")}>
                <p
                  className="what-this center"
                  style={{ margin: "0 0 0 0.5rem" }}
                >
                  <span
                    style={{ fontSize: "24px" }}
                    class="material-symbols-outlined unfollow"
                  >
                    info
                  </span>
                </p>
              </Tooltip>
            </div>
            <div
              className="more-menu-items"
              onClick={() => {
                m.loseProgressAction.current = () => {
                  m.setList((prev: any[]) => {
                    let old = [...prev];
                    old = old.filter(
                      (ele) => ele.additionalInfo.type !== "playlist"
                    );
                    old = old.map((ele) => {
                      const eleprev = { ...ele };
                      if (eleprev.additionalInfo.layers) {
                        eleprev.additionalInfo.layers =
                          eleprev.additionalInfo.layers.filter(
                            (layer: any) =>
                              layer.additionalInfo.type !== "playlist"
                          );
                      }
                      return eleprev;
                    });
                    return old;
                  });
                  m.setMode(G.PlaylistModeTypes.playlist);
                };
                if (m.singleMode.value && m.embedItems.value.length > 0) {
                  m.setLoseProgresss(true);
                } else {
                  m.loseProgressAction.current?.();
                }
                m.setShowPlaylistSettings(false);
              }}
            >
              <div className="align-center">
                <span
                  style={{ fontSize: "20px" }}
                  class="material-symbols-outlined"
                >
                  playlist_play
                </span>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    marginLeft: "4px",
                  }}
                  for="playlistInclude"
                >
                  {t("playlistMode")}
                </label>
              </div>
              <Tooltip forRight={true} text={t("playlistModeTooltip")}>
                <p
                  className="what-this center"
                  style={{ margin: "0 0 0 0.5rem" }}
                >
                  <span
                    style={{ fontSize: "24px" }}
                    class="material-symbols-outlined unfollow"
                  >
                    info
                  </span>
                </p>
              </Tooltip>
            </div>
            {DEV_ENV && (
              <div
                className="more-menu-items"
                onClick={() => {
                  m.loseProgressAction.current = () => {
                    m.setList((prev: any[]) => {
                      let old = [...prev];
                      old = old.filter(
                        (ele) => ele.additionalInfo.type === "playlist"
                      );
                      old = old.map((ele) => {
                        const eleprev = { ...ele };
                        if (eleprev.additionalInfo.layers) {
                          eleprev.additionalInfo.layers =
                            eleprev.additionalInfo.layers.filter(
                              (layer: any) =>
                                layer.additionalInfo.type === "playlist"
                            );
                        }
                        return eleprev;
                      });
                      return old;
                    });
                    m.setMode(G.PlaylistModeTypes.project);
                  };
                  if (m.singleMode.value && m.embedItems.value.length > 0) {
                    m.setLoseProgresss(true);
                  } else {
                    m.loseProgressAction.current?.();
                  }
                  m.setShowPlaylistSettings(false);
                }}
              >
                <div className="align-center">
                  <span
                    style={{ fontSize: "20px" }}
                    class="material-symbols-outlined"
                  >
                    team_dashboard
                  </span>
                  <label
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      marginLeft: "4px",
                    }}
                    for="playlistInclude"
                  >
                    {t("projectMode")}
                  </label>
                </div>
                <Tooltip forRight={true} text={t("projectModeTooltip")}>
                  <p
                    className="what-this center"
                    style={{ margin: "0 0 0 0.5rem" }}
                  >
                    <span
                      style={{ fontSize: "24px" }}
                      class="material-symbols-outlined unfollow"
                    >
                      info
                    </span>
                  </p>
                </Tooltip>
              </div>
            )}
          </div>
        </>
      )}
      {m.showMoreOptions.value && (
        <>
          <div
            className="backdrop"
            onClick={() => m.setShowMoreOptions(false)}
          />
          <div
            onClick={() => m.setShowMoreOptions(false)}
            style={{
              ...m.showMorePosition.current,
              left: "none",
              right: "4rem",
              width: "240px",
              padding: "1rem",
              top: "5rem",
            }}
            className="overlay linked-item-custom"
          >
            <p>
              <b>{t("publishSettings")}</b>
            </p>
            <span style={{ fontSize: "10px" }}>{t("publishSettingsDesc")}</span>
            <div
              className="more-menu-items"
              onClick={() => {
                m.setPublishAccess("private");
              }}
            >
              <span class="material-symbols-outlined">lock</span>
              <p>{t("privateAccess")}</p>
              <span class="material-symbols-outlined">
                {m.publishAccess.value === "private"
                  ? "radio_button_checked"
                  : "radio_button_unchecked"}
              </span>
            </div>
            <div
              className="more-menu-items"
              onClick={() => {
                m.setPublishAccess("public");
              }}
            >
              <span class="material-symbols-outlined">public</span>
              <p>{t("publicAccess")}</p>
              <span class="material-symbols-outlined">
                {m.publishAccess.value === "public"
                  ? "radio_button_checked"
                  : "radio_button_unchecked"}
              </span>
            </div>
          </div>
        </>
      )}
      <div
        style={{
          flexGrow: "1",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {m.isEditAddress.value ? (
          <>
            <div
              className="align-center justify-between"
              style={{ padding: "0.5rem 0 ", justifyContent: "space-between" }}
            >
              <div
                className="back-button"
                onClick={() => {
                  if (m.isEditAddress.value) m.setList([]);
                  m.setIsEditAddress(false);
                  G.SetEditAnnoData?.(null);
                  resetPlaylistGlobalStateVars();
                  m.setTab("discover");
                }}
              >
                <span class="material-symbols-outlined">
                  keyboard_backspace
                </span>
                <span>{t("backToDiscover")}</span>
              </div>
            </div>
            <h4 style={{ margin: "8px 0" }}>
              {t("editingAnnotationFor")} {editData?.title}
            </h4>
            {!!m.tags.value.length && (
              <div style={{ display: "flex" }}>
                <p
                  style={{
                    padding: "1rem",
                    fontSize: "1rem",
                    fontWeight: "700",
                  }}
                >
                  {t("tags")}:
                </p>
                <div
                  className="align-center"
                  style={{
                    flexWrap: "wrap",
                    flexGrow: "1",
                    margin: "0.5rem 0",
                    gap: "0.5rem",
                  }}
                >
                  {m.tags.value.map((ele, index) => (
                    <Chips
                      label={ele}
                      key={index}
                      onDelete={() => {
                        m.onRemoveTag(index);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div
            className="align-center justify-between"
            style={{ padding: "0.5rem 0 ", justifyContent: "space-between" }}
          >
            <div className="align-center" style={{ gap: "0.5rem" }}>
              <div
                className="publish-setting"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  G.LastClickX = rect.left;
                  G.LastClickY = rect.bottom;
                  m.showPlaylistPosition.current = { ...G.getPosition() };
                }}
              >
                <AnnotationIconI />
              </div>
              <p>
                {m.singleMode.value
                  ? finalHistoryObject[0]?.content || t("annotations")
                  : t("annotationMode")}
              </p>
            </div>
            <div className="align-center">
              {m.list.value.length > 0 && (
                <div
                  className="publish-setting"
                  style={{
                    fontSize: "12px",
                    marginRight: "0.5rem",
                  }}
                  onClick={() => {
                    m.setList((prev: any[]) => {
                      const old = [...prev];
                      old.pop();
                      return old;
                    });
                  }}
                >
                  <span class="material-symbols-outlined">undo</span>
                </div>
              )}
              <div
                className="publish-setting"
                style={{
                  fontSize: "12px",
                  marginRight: "0.5rem",
                }}
                onClick={() => {
                  resetPlaylistGlobalStateVars();
                  m.setList([]);
                  G.PreviousHTML = null;
                  m.setTextHTML(null);
                  G[`${id}currentPlaylist`] = [];
                  m.setTab("discover");
                  G.AddAnotationUI = false;
                }}
              >
                {t("cancel")}
              </div>
              <TogglePlaylistHeight />
            </div>
          </div>
        )}

        {(isSomethingChecked || m.embedding.value) && (
          <div
            style={{ justifyContent: "space-between", margin: "0.5rem 0" }}
            className="align-center"
          >
            <Button
              onClick={() => {
                m.onBulkDeleteItems();
                if (isSomethingEmbededChecked) {
                  const values = Object.keys(checkListEmbeded).map(
                    (ele) => checkListEmbeded[ele]
                  );
                  m.onDisembed(values, true);
                }
              }}
              secondaryAlt
              color="#C20104"
            >
              <span
                style={{ marginRight: "0.5rem" }}
                class="material-symbols-outlined unfollow color-inherit"
              >
                delete_forever
              </span>
              <span className="color-inherit">{t("delete")}</span>
            </Button>
            {!!m.embedding.value &&
              !m.isEditAddress.value &&
              isSomethingChecked &&
              !isSomethingEmbededChecked && (
                <Button
                  onClick={m.onEmbedInside}
                  secondaryAlt
                  color="var(--secondaryColor)"
                >
                  <span
                    style={{ marginRight: "0.5rem" }}
                    class="material-symbols-outlined unfollow color-inherit"
                  >
                    frame_source
                  </span>
                  <span className="color-inherit">{t("embed")}</span>
                </Button>
              )}
            <Button
              onClick={() => {
                m.setEmbedding(false);
                m.setChecklistData({});
                m.setChecklistEmbeded({});
              }}
              secondaryAlt
            >
              <span
                style={{ marginRight: "0.5rem" }}
                class="material-symbols-outlined unfollow color-inherit"
              >
                close
              </span>
              <span className="color-inherit">{t("cancel")}</span>
            </Button>
          </div>
        )}
        {isSomethingEmbededChecked && !isSomethingChecked && (
          <div
            style={{ justifyContent: "space-between", margin: "0.5rem 0" }}
            className="align-center"
          >
            <Button
              onClick={() => {
                const values = Object.keys(checkListEmbeded).map(
                  (ele) => checkListEmbeded[ele]
                );
                m.onDisembed(values, true);
              }}
              secondaryAlt
              color="#C20104"
            >
              <span
                style={{ marginRight: "0.5rem" }}
                class="material-symbols-outlined unfollow color-inherit"
              >
                delete_forever
              </span>
              <span className="color-inherit">{t("delete")}</span>
            </Button>
            {!m.singleMode.value && (
              <Button
                onClick={() => {
                  const values = Object.keys(checkListEmbeded).map(
                    (ele) => checkListEmbeded[ele]
                  );
                  m.onDisembed(values);
                }}
                secondaryAlt
                color="var(--secondaryColor)"
              >
                <span
                  style={{ marginRight: "0.5rem" }}
                  class="material-symbols-outlined unfollow color-inherit"
                >
                  link_off
                </span>
                <span className="color-inherit">{t("remove")}</span>
              </Button>
            )}
            <Button
              onClick={() => {
                m.setChecklistEmbeded({});
              }}
              secondaryAlt
            >
              <span
                style={{ marginRight: "0.5rem" }}
                class="material-symbols-outlined unfollow color-inherit"
              >
                close
              </span>
              <span className="color-inherit">{t("cancel")}</span>
            </Button>
          </div>
        )}
        {m.dataFetching.value && (
          <div
            className="align-center"
            style={{ gap: "1rem", margin: "0.5rem 0" }}
          >
            <LoaderSecondary />
            <p>{t("fetchingAnnotationData")}</p>
          </div>
        )}
        {finalHistoryObject.length === 0 &&
          !m.dataFetching.value &&
          !m.isEditAddress.value && (
            <p style={{ margin: "1rem 0" }}>{t("addItemsToStartAnnotating")}</p>
          )}
        {finalHistoryObject.map((ele: any, index: number) =>
          ele.type === "attachment-link" || ele.type === "date" ? (
            <AttachmentLinkItem
              linkingMode={false}
              isPlaylistNestedSupported
              viewOnly={false}
              isEditAddress={m.isEditAddress.value}
              isSomethingEmbededChecked={isSomethingEmbededChecked}
              datesRepeat={false}
              datesInWrongOrder={false}
              playlistName={false}
              currentFormat={false}
              readingPlanEnabled={false}
              layers={false}
              draggable={true}
              oldItemsMap={{}}
              currentDateActive={false}
              originalIndex={-1}
              dragOverSet={m.dragOverSet.value}
              activeItemID={false}
              clickPass={false}
              checked={false}
              activeItemList={{}}
              onClick={() => {}}
              playlistId={false}
              onClickItem={() => {}}
              checklistEnabled={!!checkEnabled}
              checkListData={checkListData}
              creatingPlaylist={true}
              index={index}
              editDataFromPlaylist={m.editDataFromPlaylist}
              embedding={m.embedding.value}
              handleDragStart={m.handleDragStart}
              handleDragOver={m.handleDragOver}
              handleDragEnd={m.handleDragEnd}
              toggle={false}
              setList={m.setList}
              pId={null}
              originalList={finalHistoryObject}
              playListSubIndex={false}
              deleteFromList={(_: any, __: any, itemId: string) => {
                m.deleteFromList(itemId);
              }}
              key={`${ele.id}-${ele.readAlready}`}
              playingPlaylist={false}
              data={ele}
              onDisembed={false}
            />
          ) : (
            <>
              {!m.singleMode.value && (
                <AnnotationInnerDiv
                  isEditAddress={m.isEditAddress.value}
                  dragOverSet={m.dragOverSet.value}
                  onDisembed={m.onDisembed}
                  embedding={m.embedding.value}
                  setChecklistEmbeded={m.onCheckEmbeded}
                  finalHistoryObject={finalHistoryObject}
                  checklistEnabled={checkEnabled}
                  checkListEmbeded={checkListEmbeded}
                  setList={m.setList}
                  isSomethingEmbededChecked={isSomethingEmbededChecked}
                  selectedAnnotation={m.selectedAnnotation.value}
                  checkListData={checkListData}
                  editDataFromPlaylist={m.editDataFromPlaylist}
                  index={index}
                  pId={null}
                  handleDragStart={m.handleDragStart}
                  handleDragOver={m.handleDragOver}
                  handleDragEnd={m.handleDragEnd}
                  onRemoveTag={m.onRemoveTag}
                  deleteAttachment={m.deleteAttachment}
                  singleMode={m.singleMode.value}
                  setEmbedding={m.setEmbedding}
                  deleteFromList={m.deleteFromList}
                  selected={ele.id === m.selectedAnnotation.value}
                  data={{
                    ...ele,
                    additionalInfo: {
                      ...ele.additionalInfo,
                      layers: [
                        ...(ele.id === "singleMode"
                          ? m.embedItems.value
                          : ele.additionalInfo.layers || []),
                      ],
                      tags: [
                        ...(ele.id === "singleMode"
                          ? m.tags.value
                          : ele.additionalInfo.tags || []),
                      ],
                    },
                  }}
                  key={ele.id}
                  onClick={(itemId: string) => {
                    if (m.isEditAddress.value) {
                      ShowNotification({
                        message: t(
                          "youAreInEditModeEditingANotationCannotEmbedItemsInsideTheAnnotation"
                        ),
                        severity: "error",
                      });
                      return;
                    }
                    if (ele.type !== "heading" && !checkEnabled) {
                      const isMultiFunctionHold = G.CheckMultiFuntionHold();
                      if (!isMultiFunctionHold) {
                        if (!m.singleMode.value) {
                          m.setSelectedAnnotation((prev: string | null) =>
                            prev === itemId ? null : itemId
                          );
                        }
                      }
                    }
                  }}
                />
              )}
              {!m.draggedItemID.value &&
                !m.dataFetching.value &&
                m.selectedAnnotation.value === ele.id &&
                !m.embedding.value && (
                  <div style={{ padding: "1rem 1rem 0 1rem" }}>
                    <CustomAnnotationTextEditor
                      isEditAddress={m.isEditAddress.value}
                      showPreview={m.showPreview.value}
                      setShowPreview={m.setShowPreview}
                      initialHTML={m.textHTML.value}
                      onChange={(html: string) => {
                        m.setTextHTML(html);
                      }}
                    />
                  </div>
                )}
            </>
          )
        )}

        {!m.selectedAnnotation.value &&
          !m.dataFetching.value &&
          (!m.singleMode.value || editData?.address) &&
          !m.draggedItemID.value &&
          !m.embedding.value && (
            <CustomAnnotationTextEditor
              showPreview={m.showPreview.value}
              setShowPreview={m.setShowPreview}
              initialHTML={m.textHTML.value}
              onChange={(html: string) => {
                m.setTextHTML(html);
              }}
            />
          )}

        {!!m.videoSrc.value && (
          <VideoPlayer
            videoSrc={m.videoSrc.value}
            playlistItem={{ ...m.currentItem.value }}
          />
        )}
        {!!m.mediaURL.value && (
          <AudioPlayer close mediaURL={m.mediaURL.value} />
        )}

        <div style={{ padding: "0 0.25rem" }}>
          <div className="add-playlist-actions row">
            <Button
              style={{
                width: "max-content",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0 0.5rem",
              }}
              secondaryAlt={!m.showPreview.value}
              secondary={m.showPreview.value}
              isOutline
              onClick={() => {
                if (G.TogglePreview) {
                  G.TogglePreview();
                }
              }}
            >
              <img
                className="img-icon"
                src={
                  m.showPreview.value
                    ? PREVIEW_ICON_ACTIVE
                    : PREVIEW_ICON_INACTIVE
                }
                alt="Preview"
              />
              <span style={{ color: "inherit" }}>{t("preview")}</span>
            </Button>
            <Button
              style={{
                width: "max-content",
              }}
              onClick={m.onClickSave}
              secondary
            >
              {m.loading.value ? t("saving") : t("save")}
            </Button>
            {false && (
              <Button
                onClick={() => {
                  if (onReset && !m.loading.value) {
                    onReset();
                  }
                }}
                secondaryAlt
              >
                {t("close")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
