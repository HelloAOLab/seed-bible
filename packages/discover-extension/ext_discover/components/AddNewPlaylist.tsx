import { filterOutValidItemFromJSON } from "ext_discover.helper.filterOutValidItemFromJSON";
import { resetPlaylistGlobalStateVars } from "ext_discover.helper.resetPlaylistGlobalStateVars";
import { RenderIcon } from "ext_discover.components.RenderIcon";
import { Tabs } from "ext_discover.components.Tabs";
import { getAddNewPlaylistList } from "ext_discover.hooks.getAddNewPlaylistList";
import { isActiveTabManual } from "ext_discover.hooks.isActiveTabManual";
import { getAddNewPlaylistManager } from "ext_discover.managers.AddNewPlaylistManager";
import type { AddNewPlaylistProps } from "ext_discover.interfaces.components.AddNewPlaylist";
import type { AddNewPlaylistActionContext } from "ext_discover.interfaces.managers.AddNewPlaylistManager";
import { Input } from "ext_discover.features.components.Input";
import { Modal } from "ext_discover.features.components.Modal";
import { Button } from "ext_discover.features.components.Button";
import { Chips } from "ext_discover.features.components.Chips";

const G = globalThis as Record<string, any>;

export function AddNewPlaylist({
  id,
  editId,
  list,
  parentId,
  link,
  setLink,
  setOpenModalName,
  checkNameDuplicate,
  onCreatePlaylist,
  loading,
  setLoading,
  handleSheetUrl,
  name,
  setName,
  customColor,
  selectedColor,
  publishAccess,
  setPublishAccess,
  selectedIcon,
  setSelectedIcon,
  description,
  setDescription,
  onClickBackToDiscover,
  selectedTags,
  renameScreen,
  setTags,
  isLayers,
  manager: managerProp,
}: AddNewPlaylistProps) {
  const manager = managerProp ?? getAddNewPlaylistManager(id);
  manager.mount(id);

  const IsPlaylistPlaying = G.IsPlaylistPlaying;

  const listPlaylist = getAddNewPlaylistList({
    renameScreen,
    id,
    editId,
    list,
  });

  const actionCtx: AddNewPlaylistActionContext = {
    id,
    editId,
    parentId,
    name,
    link,
    description,
    selectedTags,
    selectedColor,
    customColor,
    selectedIcon,
    isLayers,
    loading,
    setLoading,
    setName,
    setOpenModalName,
    checkNameDuplicate,
    onCreatePlaylist,
    handleSheetUrl,
  };

  const showMoreOptions = manager.showMoreOptions.value;
  const activeTab = manager.activeTab.value;
  const tagName = manager.tagName.value;
  const uploadedFileData = manager.uploadedFileData.value;
  const informationModal = manager.informationModal.value;
  const importTabsVal = manager.importTabsVal.value;
  const isActiveSheetImport = manager.isActiveSheetImport.value;

  return (
    <>
      {showMoreOptions && (
        <>
          <div
            className="backdrop"
            onClick={() => manager.setShowMoreOptions(false)}
          />
          <div
            onClick={() => manager.setShowMoreOptions(false)}
            style={{
              ...getPosition(),
              width: "220px",
              padding: "1rem",
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
                setPublishAccess("private");
              }}
            >
              <span class="material-symbols-outlined">lock</span>
              <p>{t("privateAccess")}</p>
              <span class="material-symbols-outlined">
                {publishAccess === "private"
                  ? "radio_button_checked"
                  : "radio_button_unchecked"}
              </span>
            </div>
            <div
              className="more-menu-items"
              onClick={() => {
                setPublishAccess("public");
              }}
            >
              <span class="material-symbols-outlined">public</span>
              <p>{t("publicAccess")}</p>
              <span class="material-symbols-outlined">
                {publishAccess === "public"
                  ? "radio_button_checked"
                  : "radio_button_unchecked"}
              </span>
            </div>
          </div>
        </>
      )}

      {informationModal && (
        <Modal
          showIcon={false}
          title={t("howToCreateFromSheet")}
          onClose={() => manager.setInformationModal(false)}
        >
          {isActiveSheetImport ? (
            <>
              <p style={{ fontSize: "12px" }}>{t("sheetInstructions")}</p>
              <br />
              <p style={{ fontSize: "12px" }}>
                {t("abbreviationsInfo")}
                <br />
                {t("spellCorrectly")}
                <br />
              </p>

              <a
                href="https://docs.google.com/spreadsheets/d/1VlBdswNKkxpkZ4y-s6eDG-3k3HHXCHJRPtvPMPGlPxw/edit?gid=0#gid=0"
                target="_blank"
                rel="noreferrer"
              >
                {t("seeSampleList")}
                <br />
              </a>
              <p style={{ fontSize: "12px" }}>
                <b>{t("rememberPublic")}</b>
              </p>
            </>
          ) : (
            <>
              <p style={{ fontSize: "12px" }}>{t("jsonInstructions")}</p>
              <br />
              <p style={{ fontSize: "12px" }}>{t("jsonDownloadInfo")}</p>
              <a
                href="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/tedcasca/433b8ec62a5ecb249ca4dacdd4707b2186e598b4b74c1fb6e690c875bc48cf92.json"
                target="_blank"
                rel="noreferrer"
              >
                {t("seeSampleJSON")}
                <br />
              </a>
              <p style={{ fontSize: "12px" }}>
                <b>{t("rememberJSONFormat")}</b>
              </p>
            </>
          )}
        </Modal>
      )}
      <div className="add-new-playlist" style={{ border: "none" }}>
        <div
          className="align-center justify-between"
          style={{ padding: "0.5rem 0 ", justifyContent: "space-between" }}
        >
          <div
            className="back-button"
            onClick={() => {
              resetPlaylistGlobalStateVars();
              if (onClickBackToDiscover) onClickBackToDiscover();
            }}
          >
            <span class="material-symbols-outlined">keyboard_backspace</span>
            <span>{editId ? t("backToDiscover") : t("backToCreate")}</span>
          </div>
        </div>
        <h3>{t("enterDetailsBelow")}</h3>

        <p style={{ color: "#606060", margin: "8px 0" }}>
          {t("addDetailsToSave")}
        </p>

        {isActiveTabManual(activeTab) ? null : (
          <>
            <Tabs
              scope={`${id}-import-tabs`}
              tabs={importTabsVal.filter((_, i) => (!editId ? true : i !== 1))}
              onTabChange={manager.handleImportTabChange}
            />
            <div className="flex-col">
              <h4>{t("importHeader")}</h4>
              <p
                onClick={() => manager.setInformationModal(true)}
                className="align-center f-10 pointer what-this"
              >
                <span
                  style={{ marginRight: "4px" }}
                  class="material-symbols-outlined unfollow"
                >
                  info
                </span>{" "}
                <p class="underline">{t("whatsThis")}</p>
              </p>
            </div>

            {uploadedFileData.length ? (
              <p className="success-info">
                <span class="material-symbols-outlined unfollow">
                  cloud_done
                </span>
                <span> {t("jsonDataUploaded")}</span>
              </p>
            ) : null}

            {isActiveSheetImport ? (
              <Input
                style={{ marginBottom: "0.75rem" }}
                value={link}
                onChangeListener={setLink}
                placeholder="e.g. https://docs.google.com/spreadsheets/abc"
              />
            ) : (
              <Button
                style={{ marginBottom: "0.5rem" }}
                onClick={async () => {
                  const files = await os.showUploadFiles();
                  const file: any = files[0];

                  try {
                    if (file.mimeType === "application/json") {
                      const playlistImportedData = await JSON.parse(file.data);
                      const filterdArray =
                        filterOutValidItemFromJSON(playlistImportedData);
                      if (filterdArray.length) {
                        manager.setUploadedFileData(filterdArray);
                      } else {
                        ShowNotification({
                          message: "No Valid JSON Found!",
                          severity: "error",
                        });
                      }
                    } else {
                      return ShowNotification({
                        message: "Please Upload JSON format!",
                        severity: "error",
                      });
                    }
                  } catch (err) {
                    console.log("UPLOAED JSON ERROR", err);
                    ShowNotification({
                      message: "Unable to process the file!",
                      severity: "error",
                    });
                  }
                }}
                secondary
              >
                {uploadedFileData.length ? t("reUploadFile") : t("uploadFile")}
              </Button>
            )}
          </>
        )}

        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
          <div style={{ width: "auto" }}>
            <div
              style={{
                width: "auto",
                height: "auto",
                // background: `url(${customIcon})`,
                // border: customIcon !== selectedIcon ? '2px solid rgb(200, 195, 195)' : '2px solid #D36433',
                cursor: "pointer",
                borderRadius: "0.5rem",
                position: "relative",
                display: "grid",
                placeItems: "center",
              }}
              // onClick={() => setSelectedIcon(customIcon)}
            >
              <div
                onClick={async () => {
                  const files = await os.showUploadFiles();
                  const file = files?.[0];

                  if (!file) {
                    return ShowNotification({
                      message: "No File Uploaded!",
                      severity: "error",
                    });
                  }

                  if (!file?.mimeType.startsWith("image/")) {
                    return ShowNotification({
                      message: "Please Upload Image format!",
                      severity: "error",
                    });
                  }

                  const fileSave: any = await os.recordFile(
                    G.RECORD_STOREKEY,
                    file.data,
                    {
                      name: file.name,
                    }
                  );

                  const url = fileSave.url || fileSave?.existingFileUrl;

                  if (!url) {
                    return ShowNotification({
                      message: "Failed to upload File!",
                      severity: "error",
                    });
                  }
                  setSelectedIcon(url);
                }}
                value=""
                multiple={false}
                type="file"
                style={{
                  position: "absolute",
                  zIndex: "9",
                  borderRadius: "50%",
                  top: "0",
                  left: "0",
                  width: "100%",
                  height: "100%",
                  opacity: "0",
                }}
              />
              <RenderIcon
                scope={`${id}-add-new`}
                isCustomIcons={!!selectedIcon}
                onDelete={() => {
                  setSelectedIcon(null);
                }}
                big
                icon={selectedIcon}
                list={listPlaylist}
              />
            </div>
          </div>
          <div style={{ flexGrow: "1" }}>
            <h4 style={{ margin: "0 0 0.5rem 0" }}>
              {!isLayers ? t("playlistName") : t("layerName")}
            </h4>
            <Input
              value={name}
              onChangeListener={setName}
              placeholder={t("playlistNamePlaceholder")}
            />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
          <div style={{ flexGrow: "1" }}>
            <div>
              <Input
                style={{ marginBottom: "0" }}
                type="textarea"
                value={description}
                onChangeListener={setDescription}
                placeholder={t("descriptionOptional")}
              />
            </div>
          </div>
        </div>

        <h3>{t("tagsHeader")}</h3>
        <div className="align-center" style={{ gap: "1rem" }}>
          <Input
            style={{ marginBottom: "0", flexGrow: "1" }}
            value={tagName}
            name="tagName"
            onChangeListener={manager.setTagName}
            placeholder={t("tagPlaceholder")}
          />
          <Button
            onClick={() => {
              const nameFinal = tagName.trim();
              if (!nameFinal) {
                return ShowNotification({
                  message: t("tagNameMissing"),
                  severity: "error",
                });
              }
              if (selectedTags.length === 8) {
                return ShowNotification({
                  message: t("tagsLimitExceeded"),
                  severity: "error",
                });
              }
              if (
                !/^(?! )[A-Za-z0-9&-]+(?: [A-Za-z0-9&-]+)*$/.test(nameFinal)
              ) {
                return ShowNotification({
                  message: t("tagInvalidChars"),
                  severity: "error",
                });
              }
              setTags((prev: string[]) => {
                const old = [...prev];
                const index = old.findIndex((ele) => ele === nameFinal);
                if (index > -1) {
                  ShowNotification({
                    message: t("tagAlreadyPresent"),
                    severity: "error",
                  });
                } else {
                  old.push(nameFinal);
                  manager.setTagName("");
                }
                return old;
              });
            }}
            secondary
          >
            {t("add")}
          </Button>
        </div>
        <div
          className="align-center"
          style={{ flexWrap: "wrap", margin: "0.5rem 0", gap: "0.5rem" }}
        >
          {selectedTags.map((ele: string, index: number) => (
            <Chips
              label={ele}
              key={index}
              onDelete={() => {
                setTags((prev: string[]) => {
                  const old = [...prev];
                  old.splice(index, 1);
                  return old;
                });
              }}
            />
          ))}
        </div>
        <div className="add-playlist-actions">
          <Button
            onClick={() => {
              if (loading) {
                return ShowNotification({
                  message: t("saveInProgress"),
                  severity: "error",
                });
              }
              if (!name?.trim())
                return ShowNotification({
                  message: t("enterPlaylistName"),
                  severity: "error",
                });
              if (
                !link.trim() &&
                !isActiveTabManual(activeTab) &&
                isActiveSheetImport
              )
                return ShowNotification({
                  message: t("enterLinkToImport"),
                  severity: "error",
                });
              if (!isActiveTabManual(activeTab) && !isActiveSheetImport) {
                if (uploadedFileData.length < 1) {
                  return ShowNotification({
                    message: t("uploadFileToImport"),
                    severity: "error",
                  });
                }
              }
              const checkNameDuplicateLocal = (newName: string) => {
                const nameValue = (newName || name).trim();
                if (!nameValue)
                  return ShowNotification({
                    message: t("enterPlaylistName"),
                    severity: "error",
                  });

                const names = (G[`${id}playlists`] || []).map(
                  (ele: { id: string; name: string }) => {
                    if (ele.id === editId && !!editId) return null;
                    return ele.name;
                  }
                );

                if (names.includes(nameValue)) {
                  ShowNotification({
                    message: t("playlistNameExists"),
                    severity: "error",
                  });
                  return true;
                }
                return false;
              };
              if (!checkNameDuplicateLocal(name)) {
                if (isActiveTabManual(activeTab)) {
                  // Ensure the name retains
                  G.SetEditData?.((prev: any) => ({
                    ...prev,
                    id: null,
                  }));
                  G[`${id}creatingPlaylistName`] = name;
                  return void manager.onCreate(actionCtx);
                }
                void manager.onImport(actionCtx);
              }
            }}
            secondary
          >
            {loading
              ? t("saving")
              : isActiveTabManual(activeTab)
                ? t("save")
                : t("importTab")}
          </Button>
          <Button
            isDisabled={loading}
            onClick={() => {
              resetPlaylistGlobalStateVars();
              onClickBackToDiscover();
            }}
            secondaryAlt
          >
            {t("close")}
          </Button>
        </div>
        <div
          className={`mobile-pseudogap-element ${
            IsPlaylistPlaying ? "playing-playlist" : ""
          }`}
        />
      </div>
    </>
  );
}
