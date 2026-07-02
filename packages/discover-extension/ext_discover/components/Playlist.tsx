import { resetPlaylistGlobalStateVars } from "ext_discover.helper.resetPlaylistGlobalStateVars";
import {
  AI_OPTIONS,
  PROMPT_OPTIONS,
} from "ext_discover.models.playlistConstants";
import { PlaylistList } from "ext_discover.components.PlaylistList";
import { AddNewPlaylist } from "ext_discover.components.AddNewPlaylist";
import { handleSheetUrl } from "ext_discover.hooks.handleSheetUrl";
import { startCreatingPlaylist } from "ext_discover.hooks.startCreatingPlaylist";
import type { PlaylistProps } from "ext_discover.interfaces.components.Playlist";
import { AttachLink } from "ext_discover.components.AttachLink";
import { VideoPlayer } from "ext_discover.components.VideoPlayer";
import { AudioPlayer } from "ext_discover.components.AudioPlayer";
import { Input } from "ext_discover.features.components.Input";
import { Modal } from "ext_discover.features.components.Modal";
import { Button } from "ext_discover.features.components.Button";
import { ButtonsCover } from "ext_discover.features.components.ButtonsCover";
import { Tooltip } from "ext_discover.features.components.Tooltip";
import { Select } from "ext_discover.features.components.Select";
// import { TogglePlaylistHeight } from "ext_discover.components.TogglePlaylistHeight";

const G = globalThis as Record<string, any>;

export function Playlist({
  id,
  query,
  selectedChip,
  isCreate,
  isLayers,
  playingPlaylist,
  creatingPlaylist,
  playlist: m,
  thisBot,
}: PlaylistProps) {
  m.syncProps({ query, selectedChip, isLayers, isCreate });

  const DragDropT = G.DragDrop;
  const selectedPlaylist = m.selectedPlaylist.value;
  const hasSelection = Object.keys(selectedPlaylist).some(
    (ele) => selectedPlaylist[ele]
  );
  const selectPlaylistActive =
    m.selectPlaylist.value ||
    Object.keys(selectedPlaylist).some((ele) => !!selectedPlaylist[ele]);

  return (
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
                    m.onClickSave();
                  }, 100);
                } else {
                  resetPlaylistGlobalStateVars();
                  m.setOpenAttachLink(false);
                  m.hasGenrated.value = false;
                  m.onClose();
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
                  m.onClickSave();
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
          title={t("notEmbeddedItemsFound")}
          onClose={() => m.setLayersWarning(false)}
          showIcon={false}
        >
          <h2 style={{ fontSize: "1rem" }}>{t("notEmbeddedItemsMsg")}</h2>
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
              width: "206px",
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
          </div>
        </>
      )}
      {m.openModal.value && creatingPlaylist && (
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
            creatingPlaylist={creatingPlaylist}
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
              width: "206px",
              padding: "1rem",
            }}
            className="overlay linked-item-custom"
          >
            <div className="more-menu-items">
              <div
                className="align-center"
                style={{}}
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

      <div className="playlists">
        <p style={{ visibility: "hidden", display: "none" }}>
          {m.renderAgain.value}
        </p>
        {hasSelection && !creatingPlaylist && (
          <ButtonsCover
            secondary
            style={{
              borderBottom: "1px solid #E1E3EA",
              marginBottom: "0.5rem",
            }}
          >
            <Button onClick={m.onBulkDelete} secondaryAlt color="#C20104">
              <span
                style={{ marginRight: "0.5rem" }}
                class="material-symbols-outlined unfollow color-inherit"
              >
                delete_forever
              </span>
              <span className="color-inherit">{t("delete")}</span>
            </Button>
            <Button onClick={m.onBulkJsonDownload} secondaryAlt color="#C20104">
              <span
                style={{ marginRight: "0.5rem" }}
                class="material-symbols-outlined unfollow color-inherit"
              >
                system_update_alt
              </span>
              <span className="color-inherit">{t("downloadJSON")}</span>
            </Button>
            {/* Collections UI deferred — use m.onBulkAddToCollection when enabled */}
          </ButtonsCover>
        )}

        {creatingPlaylist || m.openModalName.value ? (
          m.renamingPlaylist.value ? null : (
            <h3 style={{ margin: "0.5rem 0" }}>{t("editingPlaylists")}</h3>
          )
        ) : (
          <>
            {(playingPlaylist ||
              selectedChip["All"] ||
              selectedChip["Playlist"]) && (
              <>
                <h3
                  style={{ margin: "0.5rem 0" }}
                >{`${t("my")} ${t("playlists")}`}</h3>
                <PlaylistList
                  scope={`${id}-owned`}
                  selectedChip={selectedChip}
                  extraActions={() => {
                    m.toggleOpenModalName(false);
                  }}
                  selectPlaylist={selectPlaylistActive}
                  playingPlaylist={playingPlaylist}
                  mergeMode={m.mergeMode.value}
                  parentId={id}
                  isLayers={isLayers}
                  selectedPlaylists={selectedPlaylist}
                  setSelectPlaylist={m.toggleSelectedPlaylist}
                  playLists={m.filteredPlaylist.value}
                  setPlayLists={m.setPlayLists}
                />
              </>
            )}
            {selectedChip["Shared"] &&
            m.sharedFilterPlaylists.value.length === 0 ? (
              <>
                <h3 style={{ margin: "0.5rem 0" }}>{t("sharedPlaylists")}</h3>
                <p>{isLayers ? t("noLayersToShow") : t("noPlaylistsToShow")}</p>
              </>
            ) : null}
            {(playingPlaylist ||
              selectedChip["All"] ||
              selectedChip["Shared"]) &&
            m.sharedFilterPlaylists.value.length > 0 ? (
              <>
                <h3 style={{ margin: "0.5rem 0" }}>{t("sharedPlaylists")}</h3>
                <PlaylistList
                  scope={`${id}-shared`}
                  selectedChip={selectedChip}
                  extraActions={() => {
                    m.toggleOpenModalName(false);
                  }}
                  selectPlaylist={selectPlaylistActive}
                  playingPlaylist={playingPlaylist}
                  mergeMode={m.mergeMode.value}
                  parentId={id}
                  isLayers={isLayers}
                  selectedPlaylists={selectedPlaylist}
                  setSelectPlaylist={m.toggleSelectedPlaylist}
                  playLists={m.sharedFilterPlaylists.value}
                  setPlayLists={m.setPlayLists}
                />
              </>
            ) : (
              ""
            )}
          </>
        )}
        {creatingPlaylist && (
          <div
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              className="align-center justify-between"
              style={{ padding: "0.5rem 0 ", justifyContent: "space-between" }}
            >
              <div
                className="publish-setting"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  G.LastClickX = rect.left;
                  G.LastClickY = rect.bottom;
                  m.showPlaylistPosition.value = { ...G.getPosition() };
                  m.setShowPlaylistSettings(true);
                }}
              >
                <span class="material-symbols-outlined">playlist_play</span>
                <span>{t("playlistSettings")}</span>
              </div>
              <div className="align-center">
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
                  <span class="material-symbols-outlined">settings</span>
                  <span>{t("publishSettings")}</span>
                </div>
              </div>
            </div>

            {(m.isSomethingChecked.value || m.embedding.value) && (
              <div
                style={{ justifyContent: "space-between", margin: "0.5rem 0" }}
                className="align-center"
              >
                <Button
                  onClick={() => {
                    m.onBulkDeleteItems();
                    if (m.isSomethingEmbededChecked.value) {
                      const values = Object.keys(m.checkListEmbeded.value).map(
                        (ele) => m.checkListEmbeded.value[ele]
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
                      const values = Object.keys(m.checkListEmbeded.value).map(
                        (ele) => m.checkListEmbeded.value[ele]
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
                  <Button
                    onClick={() => {
                      const values = Object.keys(m.checkListEmbeded.value).map(
                        (ele) => m.checkListEmbeded.value[ele]
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
                  isSomethingEmbededChecked={m.isSomethingEmbededChecked.value}
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
                  creatingPlaylist={creatingPlaylist}
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
                onClose={() => m.setOpenAttachLink(true)}
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
                    <b>{t("regenerationPrompt")}</b>
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
                  <Button onClick={() => m.setRegenrateUI(false)} secondaryAlt>
                    {t("cancel")}
                  </Button>
                  <Button onClick={m.onRegenration} secondary>
                    {t("regenerate")}
                  </Button>
                </div>
              </div>
            )}
            <div className="add-playlist-actions">
              <Button
                onClick={() => {
                  if (
                    G.RetainDataData ||
                    (G.RetainDataName && G.RetainDataSelectedType === "TEXT") ||
                    (G.RetainDataLink &&
                      G.LINKS_TYPES[G.RetainDataSelectedType.toUpperCase()])
                  ) {
                    m.setDataWarning(true);
                  } else {
                    m.onClickSave();
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
              <Button
                onClick={() => {
                  m.setLoseProgressWarning(true);
                }}
                secondaryAlt
              >
                {t("close")}
              </Button>
            </div>
          </div>
        )}
        {isCreate && !creatingPlaylist && !playingPlaylist && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexDirection: "column",
              marginTop: m.openModalName.value ? "0" : "auto",
            }}
          >
            {m.playLists.value.length < 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <input
                  type="checkbox"
                  checked={m.mergeMode.value}
                  id="mergeMode"
                  onChange={(e: Event) => {
                    m.setMergeMode((e.target as HTMLInputElement).checked);
                  }}
                />
                <label
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    marginLeft: "12px",
                  }}
                  for="mergeMode"
                >
                  {t("mergeMode")}
                </label>
              </div>
            )}
            {!m.openModalName.value && m.autoGenerateOn.value && (
              <div style={{ margin: "0.5rem", width: "100%" }}>
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
              </div>
            )}
            {!m.openModalName.value && (
              <div
                className="align-center"
                style={{ gap: "0.5rem", width: "100%" }}
              >
                <p
                  onClick={() => {
                    if (m.loading.value) return;
                    m.setAutoGenerateOn((p) => !p);
                  }}
                  style={{ width: "3rem", padding: "0" }}
                  className={`playlist-action self-start ${
                    m.loading.value && "disabled"
                  }`}
                >
                  <span
                    class="material-symbols-outlined unfollow"
                    style={{ fontSize: "1.3rem", margin: "0" }}
                  >
                    cached
                  </span>
                </p>
                <p
                  onClick={async () => {
                    if (m.loading.value) return;
                    if (m.autoGenerateOn.value) {
                      await m.generatePlaylistFromAI();
                      return;
                    }
                    m.openCreateFlow();
                  }}
                  style={{ width: "100%", padding: "0" }}
                  className={`playlist-action self-start ${
                    m.loading.value && "disabled"
                  }`}
                >
                  {m.autoGenerateOn.value ? (
                    <>
                      <span class="material-symbols-outlined unfollow">
                        animated_images
                      </span>
                      <span>
                        {m.loading.value
                          ? t("generating")
                          : isLayers
                            ? t("generateLayers")
                            : t("generatePlaylist")}
                      </span>
                    </>
                  ) : (
                    <>
                      <span class="material-symbols-outlined unfollow">
                        playlist_add
                      </span>
                      <span>
                        {isLayers
                          ? t("createNewLayer")
                          : t("createNewPlaylist")}
                      </span>
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        )}
        {m.openModalName.value && (
          <AddNewPlaylist
            id={id}
            isLayers={isLayers}
            editId={m.editId.current}
            parentId={id}
            link={m.link.value}
            renameScreen
            list={m.playList.value}
            setLink={m.setLink}
            selectedTags={m.selectedTags.value}
            onClickBackToDiscover={() => {
              m.toggleOpenModalName(false);
              G[`${id}creatingPlaylistName`] = "";
            }}
            setTags={m.setTags}
            customIcon={m.customIcon.value}
            setCustomIcon={m.setCustomIcon}
            setOpenModalName={m.toggleOpenModalName}
            checkNameDuplicate={m.checkNameDuplicate}
            publishAccess={m.publishAccess.value}
            setPublishAccess={m.setPublishAccess}
            onCreatePlaylist={() =>
              startCreatingPlaylist(m.name.value, m.playList.value, id)
            }
            loading={m.loading.value}
            setName={m.setName}
            name={m.name.value}
            setLoading={m.setLoading}
            handleSheetUrl={(linkUrl: string) =>
              handleSheetUrl(linkUrl, thisBot ?? G.thisBot)
            }
            customColor={m.customColor.value}
            setCustomColor={m.setCustomColor}
            selectedColor={m.selectedColor.value}
            setSelectedColor={m.setSelectedColor}
            selectedIcon={m.selectedIcon.value}
            setSelectedIcon={m.setSelectedIcon}
            description={m.description.value}
            setDescription={m.setDescription}
          />
        )}
      </div>
    </>
  );
}
