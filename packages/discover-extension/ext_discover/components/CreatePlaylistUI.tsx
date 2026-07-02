import { resetPlaylistGlobalStateVars } from "ext_discover.helper.resetPlaylistGlobalStateVars";
import {
  AI_OPTIONS,
  PROMPT_OPTIONS,
} from "ext_discover.models.playlistConstants";
import { PlaylistList } from "ext_discover.components.PlaylistList";
import { AddNewPlaylist } from "ext_discover.components.AddNewPlaylist";
import { handleSheetUrl } from "ext_discover.hooks.handleSheetUrl";
import { backToCreatePlaylist } from "ext_discover.hooks.backToCreatePlaylist";
import { startCreatingPlaylist } from "ext_discover.hooks.startCreatingPlaylist";
import { AddAnotationUI } from "ext_discover.components.AddAnotationUI";
import { getCreatePlaylistUIManager } from "ext_discover.managers.CreatePlaylistUIManager";
import type { CreatePlaylistUIProps } from "ext_discover.interfaces.components.CreatePlaylistUI";
import { AttachLink } from "ext_discover.components.AttachLink";
import { VideoPlayer } from "ext_discover.components.VideoPlayer";
import { AudioPlayer } from "ext_discover.components.AudioPlayer";
import { getSortedDateFormats } from "ext_discover.hooks.getSortedDateFormats";
import { ProjectMode } from "ext_discover.components.ProjectMode";
import { Input } from "ext_discover.features.components.Input";
import { Modal } from "ext_discover.features.components.Modal";
import { Button } from "ext_discover.features.components.Button";
import { ButtonsCover } from "ext_discover.features.components.ButtonsCover";
import { Tooltip } from "ext_discover.features.components.Tooltip";
import { Select } from "ext_discover.features.components.Select";
// import { TogglePlaylistHeight } from "ext_discover.components.TogglePlaylistHeight";

const G = globalThis as Record<string, any>;

export function CreatePlaylistUI({
  id = "default",
  isCreate,
  setTab,
  isLayers,
  playingPlaylist,
  editData,
  createManager,
}: CreatePlaylistUIProps) {
  const c =
    createManager ??
    getCreatePlaylistUIManager(id, { setTab, editData, isCreate, isLayers });
  const m = c.playlist;
  const PlaylistModeTypes = G.PlaylistModeTypes as Record<string, string>;
  const IsPlaylistPlaying = G.IsPlaylistPlaying;
  const isloggedIN = G.authBot?.id;
  const PlaylistIconT = G.PlaylistIcon;

  const DragDropT = G.DragDrop;

  if (c.mode.value === PlaylistModeTypes.project) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          padding: "12px",
        }}
      >
        <ProjectMode
          setTab={setTab}
          name={m.name.value}
          showPlaylistSettings={m.showPlaylistSettings.value}
          setShowPlaylistSettings={m.setShowPlaylistSettings}
          onReset={() => {
            c.setMode(PlaylistModeTypes.playlist);
            G[`${id}creatingPlaylist`] = true;
          }}
          setMode={c.setMode}
        />
      </div>
    );
  }

  if (c.mode.value === PlaylistModeTypes.annotations) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          padding: "12px",
        }}
      >
        <AddAnotationUI
          editData={c.editData.value}
          id={id}
          setTab={setTab}
          name={m.name.value}
          showPlaylistSettings={m.showPlaylistSettings.value}
          setShowPlaylistSettings={m.setShowPlaylistSettings}
          onReset={() => {
            c.setMode(PlaylistModeTypes.playlist);
            G[`${id}creatingPlaylist`] = true;
          }}
          annoation={true}
          setMode={c.setMode}
          list={m.playList.value}
          setList={m.setPlaylist}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        padding: "12px",
      }}
    >
      <>
        {(m.dataWarning.value || m.loseProgressWarning.value) && (
          <Modal
            title={
              m.dataWarning.value ? t("dataWarning") : t("loseProgressWarning")
            }
            onClose={() => {
              if (m.loading.value) return;
              m.setDataWarning(false);
              m.setLoseProgressWarning(false);
            }}
            showIcon={false}
          >
            <h2 style={{ fontSize: "1rem", marginBottom: "1rem" }}>
              {m.dataWarning.value
                ? t("dataWarningMsg")
                : t("loseProgressWarningMsg")}
            </h2>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <Button
                loading={m.loading.value}
                secondary={m.dataWarning.value ? true : false}
                secondaryAlt={m.dataWarning.value ? false : true}
                onClick={async () => {
                  m.setLoading(true);
                  if (m.dataWarning.value) {
                    await G.OnClickSend(true);
                    setTimeout(() => {
                      c.onCreateTabSave();
                    }, 100);
                  } else {
                    G[`${id}currentPlaylist`] = [];
                    resetPlaylistGlobalStateVars();
                    c.discardCreateProgress();
                  }
                  m.setDataWarning(false);
                  m.setLoseProgressWarning(false);
                  m.setLoading(false);
                }}
              >
                {m.dataWarning.value
                  ? t("saveWithAttachment")
                  : t("discardChanges")}
              </Button>
              {m.dataWarning.value && (
                <Button
                  disabled={m.loading.value}
                  secondaryAlt
                  onClick={() => {
                    c.onCreateTabSave();
                  }}
                >
                  {t("saveWithoutAttachments")}
                </Button>
              )}
              <Button
                secondary={m.dataWarning.value ? false : true}
                secondaryAlt={m.dataWarning.value ? true : false}
                disabled={m.loading.value}
                onClick={() => {
                  m.setDataWarning(false);
                  m.setLoseProgressWarning(false);
                }}
              >
                {t("cancel")}
              </Button>
            </div>
          </Modal>
        )}
        {m.layersWarning.value && (
          <Modal
            title={t("noEmbdedItemsFound")}
            onClose={() => m.setLayersWarning(false)}
            showIcon={false}
          >
            <h2 style={{ fontSize: "1rem" }}>{t("noEmbdedItemsMsg")}</h2>
            <ButtonsCover>
              <Button
                secondary
                onClick={() => {
                  m.setPlaylist((prev: any[]) => {
                    const old = prev.filter(
                      (ele: any) => ele.additionalInfo.layers?.length
                    );
                    G[`${id}currentPlaylist`] = old;
                    return old;
                  });
                  m.setOpenAttachLink(false);
                  m.onSave(
                    m.attachment.value,
                    m.checklist.value,
                    m.readingPlan.value,
                    m.currentFormat.value,
                    m.selectedColor.value,
                    m.selectedIcon.value,
                    m.selectedColor.value === m.customColor.value,
                    m.description.value,
                    m.selectedIcon.value === m.customIcon.value &&
                      !!m.selectedIcon.value,
                    m.selectedTags.value,
                    m.layers.value
                  );
                  m.setLayersWarning(false);
                }}
              >
                {t("removeAndSave")}
              </Button>
              <Button secondaryAlt onClick={() => m.setLayersWarning(false)}>
                {t("close")}
              </Button>
            </ButtonsCover>
          </Modal>
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
                ...m.showMorePosition.value,
                left: "none",
                right: "4rem",
                width: "250px",
                maxHeight: "350px",
                padding: "1rem",
                top: "5rem",
              }}
              className="overlay linked-item-custom"
            >
              <p>
                <b>{t("publishSettings")}</b>
              </p>
              <span style={{ fontSize: "12px" }}>
                {t("publishSettingsDescPlaylist")}
              </span>
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
              <p>
                <b style={{ marginTop: "10px" }}>{t("playlistSettings")}</b>
              </p>
              <span style={{ fontSize: "12px" }}>
                {t("playlistSettingsTooltip")}
              </span>
              <div
                className="more-menu-items"
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="align-center"
                  onClick={() => {
                    m.setChecklist((p) => !p);
                  }}
                >
                  {m.checklist.value ? (
                    <span
                      style={{ fontSize: "20px" }}
                      class="material-symbols-outlined unfollow"
                    >
                      check_box
                    </span>
                  ) : (
                    <span
                      style={{ fontSize: "20px" }}
                      class="material-symbols-outlined unfollow"
                    >
                      check_box_outline_blank
                    </span>
                  )}
                  <label
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      marginLeft: "4px",
                    }}
                    for="playlistInclude"
                  >
                    {t("checklist")}
                  </label>
                </div>
                <Tooltip forRight={true} text={t("checklistTooltip")}>
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
            </div>
          </>
        )}
        {m.openModal.value && c.uiCreatingPlaylist.value && (
          <Modal
            title={t("copyItems")}
            showIcon={false}
            onClose={() => m.setOpenModal(false)}
          >
            <p style={{ fontSize: "12px" }}>{t("copyItemsInstructions")}</p>
            <p style={{ textAlign: "center" }}> {t("or")} </p>
            <p style={{ fontSize: "12px" }}>{t("copyItemInstructions")}</p>
            <PlaylistList
              scope={`${id}-copy-modal`}
              creatingPlaylist={!c.uiCreatingPlaylist.value}
              isLayers={isLayers}
              playLists={m.playLists.value}
              parentId={id}
              setPlayLists={m.setPlayLists}
            />
            <ButtonsCover>
              <p> </p>
              <Button secondaryAlt onClick={() => m.setOpenModal(false)}>
                {t("close")}
              </Button>
            </ButtonsCover>
          </Modal>
        )}

        {m.showPlaylistSettings.value && (
          <>
            <div
              className="backdrop"
              onClick={() => m.setShowPlaylistSettings(false)}
            />
            <div
              style={{
                ...m.showPlaylistPosition.value,
                width: "220px",
                padding: "1rem",
              }}
              className="overlay linked-item-custom"
            >
              {isloggedIN ? (
                <div
                  className="more-menu-items"
                  onClick={() => {
                    if (!G.authBot?.id) {
                      ShowNotification({
                        message: t("pleaseLoginToUseFeature"),
                        severity: "error",
                      });
                      shout("tryUserLogin");
                      return;
                    }
                    c.setMode(PlaylistModeTypes.annotations);
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
              ) : null}
              <div
                className="more-menu-items"
                onClick={() => {
                  c.setMode(PlaylistModeTypes.playlist);
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
              {isloggedIN && DEV_ENV ? (
                <div
                  className="more-menu-items"
                  onClick={() => {
                    c.setMode(PlaylistModeTypes.project);
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
              ) : null}
            </div>
          </>
        )}

        <div className="playlists" style={{ height: "max-content" }}>
          <p style={{ visibility: "hidden", display: "none" }}>
            {m.renderAgain.value}
          </p>
          {!c.uiCreatingPlaylist.value && (
            <div
              className="align-center justify-between"
              style={{ padding: "0.5rem 0 ", justifyContent: "space-between" }}
            >
              <div className="align-center" style={{ gap: "0.5rem" }}>
                <div
                  className="publish-setting"
                  onClick={(e) => {
                    if (!isloggedIN) {
                      ShowNotification({
                        message: t("pleaseLoginToUseMoreFeatures"),
                        severity: "error",
                      });
                      shout("tryUserLogin");
                      return;
                    }
                    const rect = e.currentTarget.getBoundingClientRect();
                    G.LastClickX = rect.left;
                    G.LastClickY = rect.bottom;
                    m.showPlaylistPosition.value = { ...G.getPosition() };
                  }}
                >
                  <PlaylistIconT />
                </div>
                <div
                  onClick={() => {
                    c.isTempEdit.current = true;
                    startCreatingPlaylist(m.name.value, m.playList.value, id);
                  }}
                  className="pointer"
                >
                  {!m.name.value ? t("untitled") : m.name.value}
                  <span
                    class="material-symbols-outlined"
                    style={{
                      color: "var(--secondaryColor)",
                      marginLeft: "0.25rem",
                    }}
                  >
                    edit
                  </span>
                </div>
              </div>
              <div className="align-center">
                <div
                  className="publish-setting"
                  style={{
                    fontSize: "12px",
                    marginRight: "0.5rem",
                  }}
                  onClick={() => {
                    if (m.playList.value.length) {
                      m.setLoseProgressWarning(true);
                    } else {
                      G[`${id}currentPlaylist`] = [];
                      resetPlaylistGlobalStateVars();
                      if (setTab) setTab("discover");
                    }
                  }}
                >
                  {t("cancel")}
                </div>
                {/* <TogglePlaylistHeight /> */}
                <div
                  className="publish-setting"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    G.LastClickX = rect.left;
                    G.LastClickY = rect.bottom;
                    m.showMorePosition.value = { ...G.getPosition() };
                    m.setShowMoreOptions(true);
                  }}
                >
                  <img
                    className="img-icon"
                    src={G.Settings_Icon}
                    alt="Settings_Icon"
                  />
                </div>
              </div>
            </div>
          )}
          {!c.uiCreatingPlaylist.value && (
            <div
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {m.readingPlan.value && (
                <div
                  className="align-center"
                  style={{ gap: "12px", margin: "12px 0" }}
                >
                  <div style={{ width: "100%" }} className="align-center">
                    <Select
                      hidden={true}
                      secondary
                      value={m.currentFormat.value}
                      onChangeListener={(val: string) => {
                        m.currentFormat.value = val;
                      }}
                      name="Date Format:"
                      options={getSortedDateFormats(m.currentFormat.value)}
                      sxSelect={{ padding: "0.25rem" }}
                    />
                  </div>
                </div>
              )}

              {(m.isSomethingChecked.value || m.embedding.value) && (
                <div
                  style={{
                    justifyContent: "space-between",
                    margin: "0.5rem 0",
                  }}
                  className="align-center"
                >
                  <Button
                    onClick={() => {
                      m.onBulkDeleteItems();
                      if (m.isSomethingEmbededChecked.value) {
                        const values = Object.keys(
                          m.checkListEmbeded.value
                        ).map((ele) => m.checkListEmbeded.value[ele]);
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
                  {!!m.embedding.value && m.isSomethingChecked.value && (
                    <Button
                      onClick={m.onEmbedItems}
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
              {m.isSomethingEmbededChecked.value &&
                !m.isSomethingChecked.value && (
                  <div
                    style={{
                      justifyContent: "space-between",
                      margin: "0.5rem 0",
                    }}
                    className="align-center"
                  >
                    <Button
                      onClick={() => {
                        const values = Object.keys(
                          m.checkListEmbeded.value
                        ).map((ele) => m.checkListEmbeded.value[ele]);
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
                    <Button
                      onClick={() => {
                        const values = Object.keys(
                          m.checkListEmbeded.value
                        ).map((ele) => m.checkListEmbeded.value[ele]);
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
              <div
                ref={(el) => m.setPlaylistListUiElement(el)}
                className="link-playlist"
                style={{ width: "100%" }}
              >
                {DragDropT && (
                  <DragDropT
                    massAdd={m.massAdd}
                    attachLink={m.attachLink}
                    itemSelected={m.itemSelected.value}
                    setItemSelected={
                      m.regenrateUI.value ? null : m.setItemSelected
                    }
                    isPlayer={
                      m.checklistEnabled.value ||
                      m.isSomethingChecked.value ||
                      m.isSomethingEmbededChecked.value
                    }
                    isSomethingEmbededChecked={
                      m.isSomethingEmbededChecked.value
                    }
                    allowHeadingCheck
                    checkListData={m.checkListData.value}
                    layers={true}
                    list={m.playList.value}
                    onGenClick={() => {
                      m.setOpenAttachLink(false);
                      m.setRegenrateUI(true);
                    }}
                    checkListEmbeded={m.checkListEmbeded.value}
                    setChecklistEmbeded={m.onCheckEmbeded}
                    onDisembed={m.onDisembed}
                    embedding={m.embedding.value}
                    setEmbedding={m.setEmbedding}
                    editDataFromPlaylist={m.editDataFromPlaylist}
                    currentFormat={m.currentFormat.value}
                    setList={m.setPlaylist}
                    deleteFromList={m.deleteDataFromPlaylist}
                    creatingPlaylist={!c.uiCreatingPlaylist.value}
                    setPlaylistFromRow={m.setPlaylist}
                  />
                )}
              </div>
              {!m.regenrateUI.value && !m.itemSelected.value && (
                <AttachLink
                  onDateClick={(date: string = "") => {
                    m.setRegenrateUI(false);
                    m.attachDate(date);
                  }}
                  massAdd={m.massAdd}
                  attachLink={m.attachLink}
                  onClose={() => m.setOpenAttachLink(false)}
                />
              )}
              {!!m.videoSrc.value && (
                <VideoPlayer
                  style={G.FloatBarStyle}
                  videoSrc={m.videoSrc.value}
                  playlistItem={{ ...m.currentItem.value }}
                />
              )}
              {!!m.mediaURL.value && (
                <AudioPlayer
                  style={G.FloatBarStyle}
                  close
                  mediaURL={m.mediaURL.value}
                />
              )}

              {m.regenrateUI.value && (
                <div
                  className="add-new-playlist alter"
                  style={{ border: "none" }}
                >
                  <div
                    class="align-center"
                    style={{ justifyContent: "space-between" }}
                  >
                    <p style={{ fontSize: "12px", margin: "0.5rem 0" }}>
                      <b>{t("generationPrompt")}</b>
                    </p>
                    <div
                      className="align-center"
                      style={{ gap: "0.5rem", marginBottom: "0.5rem" }}
                    >
                      <Select
                        hidden={true}
                        secondary
                        value={m.currentPromptText.value}
                        onChangeListener={(val: string) => {
                          m.setCurrentPromptText(val);
                        }}
                        name="Prompt Type:"
                        options={PROMPT_OPTIONS}
                        sxSelect={{ padding: "0.25rem" }}
                      />
                      {m.currentPromptText.value === "system-prompt" && (
                        <Button
                          small
                          onClick={() => {
                            m.setSystemPrompt(G.SYSTEM_PROMPT);
                          }}
                        >
                          <span
                            style={{ fontSize: "14px" }}
                            class="material-symbols-outlined unfollow"
                          >
                            reset_settings
                          </span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {m.currentPromptText.value === "prompt" ? (
                    <Input
                      style={{ marginBottom: "0" }}
                      type="textarea"
                      value={m.genDetails.value}
                      onChangeListener={m.setGenDetails}
                      placeholder={t("describePlaylist")}
                    />
                  ) : (
                    <Input
                      style={{ marginBottom: "0" }}
                      sxInput={{ resize: "vertical", height: "25rem" }}
                      type="textarea"
                      value={m.systemPrompt.value}
                      onChangeListener={m.setSystemPrompt}
                      placeholder={t("describeSystemPrompt")}
                    />
                  )}
                  {m.currentPromptText.value === "system-prompt" && (
                    <p className="info">{t("systemPromptInfo")}</p>
                  )}
                  <Select
                    hidden={true}
                    secondary
                    value={m.selectedAI.value}
                    onChangeListener={(val: string) => {
                      m.setSelectedAI(val);
                    }}
                    name="AI:"
                    options={AI_OPTIONS}
                    sxSelect={{ padding: "0.25rem" }}
                  />
                  <div className="attach-link-actions">
                    <Button
                      onClick={() => m.setRegenrateUI(false)}
                      secondaryAlt
                    >
                      {t("cancel")}
                    </Button>
                    <Button onClick={m.onRegenration} secondary>
                      {m.loading.value ? t("generating") : t("generate")}
                    </Button>
                  </div>
                </div>
              )}
              <div className="add-playlist-actions">
                <Button
                  onClick={() => {
                    if (
                      G.RetainDataData ||
                      (G.RetainDataName &&
                        G.RetainDataSelectedType === "TEXT") ||
                      (G.RetainDataLink &&
                        G.LINKS_TYPES[G.RetainDataSelectedType.toUpperCase()])
                    ) {
                      m.setDataWarning(true);
                    } else {
                      c.onCreateTabSave();
                    }
                  }}
                  secondary
                >
                  {t("save")}
                </Button>
                {m.hasOldList.value && (
                  <Button
                    isDisabled={m.loading.value}
                    onClick={m.onRevert}
                    secondary
                  >
                    {t("revertToPrevious")}
                  </Button>
                )}
              </div>
              <div
                className={`mobile-pseudogap-element ${
                  IsPlaylistPlaying ? "playing-playlist" : ""
                }`}
              />
            </div>
          )}
          {c.uiCreatingPlaylist.value ? (
            <AddNewPlaylist
              id={id}
              isTempEdit={c.isTempEdit.current}
              isLayers={isLayers}
              editId={m.editId.current}
              parentId={id}
              link={m.link.value}
              list={m.playList.value}
              setLink={m.setLink}
              selectedTags={m.selectedTags.value}
              setTags={m.setTags}
              customIcon={m.customIcon.value}
              setCustomIcon={m.setCustomIcon}
              setOpenModalName={m.toggleOpenModalName}
              checkNameDuplicate={m.checkNameDuplicate}
              onCreatePlaylist={() => {
                if (c.isTempEdit.current) {
                  backToCreatePlaylist(m.name.value, m.playList.value, id);
                  c.isTempEdit.current = false;
                  return;
                }
                m.onSave(
                  m.attachment.value,
                  m.checklist.value,
                  m.readingPlan.value,
                  m.currentFormat.value,
                  m.selectedColor.value,
                  m.selectedIcon.value,
                  m.selectedColor.value === m.customColor.value,
                  m.description.value,
                  m.selectedIcon.value === m.customIcon.value &&
                    !!m.selectedIcon.value,
                  m.selectedTags.value,
                  m.layers.value,
                  m.publishAccess.value
                );
                setTab?.("discover");
              }}
              loading={m.loading.value}
              setName={m.setName}
              name={m.name.value}
              setLoading={m.setLoading}
              handleSheetUrl={(linkUrl: string) =>
                handleSheetUrl(
                  linkUrl,
                  (G.Playlist ?? G.thisBot) as Record<string, unknown>
                )
              }
              customColor={m.customColor.value}
              setCustomColor={m.setCustomColor}
              selectedColor={m.selectedColor.value}
              setSelectedColor={m.setSelectedColor}
              publishAccess={m.publishAccess.value}
              onClickBackToDiscover={() => {
                c.isTempEdit.current = false;
                backToCreatePlaylist(m.name.value, m.playList.value, id);
              }}
              selectedIcon={m.selectedIcon.value}
              setPublishAccess={m.setPublishAccess}
              setSelectedIcon={m.setSelectedIcon}
              description={m.description.value}
              setDescription={m.setDescription}
            />
          ) : null}
        </div>
      </>
    </div>
  );
}
