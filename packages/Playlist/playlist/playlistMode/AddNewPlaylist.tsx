const { useState, useLayoutEffect, useRef, useMemo } = os.appHooks;

const { Input, Modal, Button, Chips, Checkbox, ButtonsCover, Tooltip, Select } =
  Components;


globalThis.RECORD_STOREKEY =
  "vRK2.YW5ub3RhdGlvbnM=.TDVlSEZzRHdBWGw4UXloR2Fha3Zjdz09.subjectfull";

const predefinedColors = [
  "#FFFFFF",
  "#D9D9D9",
  "#D364338A",
  "#13998196",
  "#9B44F326",
  "#97B197",
];
const predefinedIconsOptions = [
  "subscriptions",
  "smart_display",
  "video_library",
  "slow_motion_video",
  "play_lesson",
  "auto_read_play",
];

const Tabs = await thisBot.Tabs();
const RenderIcon = await thisBot.RenderIcon();

const AddNewPlaylist = ({
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
  setCustomColor,
  selectedColor,
  publishAccess,
  setPublishAccess,
  setSelectedColor,
  selectedIcon,
  setSelectedIcon,
  description,
  setDescription,
  customIcon,
  setCustomIcon,
  isTempEdit,
  onClickBackToDiscover,
  selectedTags,
  renameScreen,
  setTags,
  isLayers,
}) => {
  const IsPlaylistPlaying = globalThis.IsPlaylistPlaying;

  const listPlaylist = useMemo(() => {
    if (renameScreen) {
      return (
        globalThis[`${id}playlists`].find((ele) => ele.id === editId)?.list ||
        []
      );
    }
    return list;
  }, [list, editId]);

  const [showMoreOptions, setShowMoreOptions] = useState(false);

  const tabsVals = [t("createManually"), t("importTab")];
  const importTabsVal = [t("googleSheet"), t("jsonFormat")];

  const [activeTab, setActiveTab] = useState(tabsVals[0]);

  const [tagName, setTagName] = useState("");

  const [uploadedFileData, setUploadedFileData] = useState([]);

  const [importTab, setImportTab] = useState(importTabsVal[0]);

  const [isChecked, setIsChecked] = useState(false);

  const [predefinedIcons, setPredefinedIcons] = useState(
    globalThis.PREDEFINED_ICONS
      ? [...globalThis.PREDEFINED_ICONS]
      : [...predefinedIconsOptions]
  );

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleImportTabChange = (tab) => {
    setUploadedFileData([]);
    setImportTab(tab);
  };

  const [informationModal, setInformationModal] = useState(false);

  const isActiveSheetImport = importTabsVal[0] === importTab;

  const onImport = async () => {
    if (editId) {
      thisBot.OnEditPlaylistName({
        parentId,
        id: editId,
        name,
        color: selectedColor,
        isCustomColor: customColor === selectedColor,
        icon: selectedIcon,
        description,
        selectedTags,
      });
      setOpenModalName(false);
      return;
    }
    if (!checkNameDuplicate()) {
      setLoading(true);
      if (isActiveSheetImport) {
        try {
          const dataRes = await handleSheetUrl(link);
          if (dataRes === null) return setLoading(false);
          onCreatePlaylist();
          setOpenModalName(false);
          setLoading(false);
        } catch (err) {
          setLoading(false);
        }
      } else {
        if (uploadedFileData.length > 0) {
          onCreatePlaylist();
          setUploadedFileData([]);
          setOpenModalName(false);
          setLoading(false);
        } else {
          ShowNotification({
            message: "Upload a File to Import Data!",
            severity: "error",
          });
        }
      }
    }
  };

  const onCreate = async () => {
    if (editId) {
      thisBot.OnEditPlaylistName({
        parentId,
        id: editId,
        name,
        color: selectedColor,
        isCustomColor: customColor === selectedColor,
        icon: selectedIcon,
        description,
        selectedTags,
      });
      setOpenModalName(false);
      return;
    }

    if (isLayers && selectedTags.length === 0) {
      ShowNotification({
        message: "Layers Should Have atleast One tag!",
        severity: "error",
      });
      return;
    }

    if (isChecked) {
      if (!description) {
        return ShowNotification({
          message: "Please fill description for auto generation!",
          severity: "error",
        });
      }
      setLoading(true);
      const { suggestedName, allItems } = await thisBot.buildPlaylistFromAI({
        text: description,
      });
      if (!name) setName(suggestedName);
      if (checkNameDuplicate(name || suggestedName)) {
        setLoading(false);
        return;
      }
      if (!allItems?.length) {
        setLoading(false);
        return ShowNotification({
          message: "Couldn't auto find any items for the given description!",
          severity: "error",
        });
      }
      onCreatePlaylist();
      setOpenModalName(false);
      setLoading(false);
      return;
    }
    onCreatePlaylist();
    setOpenModalName(false);
  };

  const isActiveTabManual = () => tabsVals[0] === activeTab;

  const isButtomDisabled = () => {
    if (isChecked) return false;
    if (isActiveTabManual()) return !name?.trim();
    return !link.trim() && !name?.trim();
  };

  useLayoutEffect(() => {
    globalThis.PREDEFINED_ICONS = predefinedIcons;
    globalThis.setPredefinedIcons = setPredefinedIcons;
    savePlaylistProgress();
    return () => {
      globalThis.setPredefinedIcons = true;
    };
  }, [predefinedIcons]);

  return (
    <>
      {showMoreOptions && (
        <>
          <div className="backdrop" onClick={() => setShowMoreOptions(false)} />
          <div
            onClick={() => setShowMoreOptions(false)}
            style={{
              ...getPosition(),
              width: "220px",
              padding: "1rem",
            }}
            className="overlay linked-item-custom"
          >
            <p>
              <b style={{ color: "white" }}>{globalThis.t("publishSettings")}</b>
            </p>
            <span style={{ fontSize: "10px", color: "#c9c8c6" }}>
              {globalThis.t("publishSettingsDesc")}
            </span>
            <div
              className="more-menu-items"
              onClick={() => {
                setPublishAccess("private");
              }}
              style={{
                borderTop: "1px solid #3E3E3E",
              }}
            >
              <span
                style={{ color: "white" }}
                class="material-symbols-outlined"
              >
                lock
              </span>
              <p>{globalThis.t("privateAccess")}</p>
              <span
                style={{ color: "white" }}
                class="material-symbols-outlined"
              >
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
              <span
                style={{ color: "white" }}
                class="material-symbols-outlined"
              >
                public
              </span>
              <p>{globalThis.t("publicAccess")}</p>
              <span
                style={{ color: "white" }}
                class="material-symbols-outlined"
              >
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
          title={globalThis.t("howToCreateFromSheet")}
          onClose={() => setInformationModal(false)}
        >
          {isActiveSheetImport ? (
            <>
              <p style={{ fontSize: "12px" }}>{globalThis.t("sheetInstructions")}</p>
              <br />
              <p style={{ fontSize: "12px" }}>
                {globalThis.t("abbreviationsInfo")}
                <br />
                {globalThis.t("spellCorrectly")}
                <br />
              </p>

              <a
                href="https://docs.google.com/spreadsheets/d/1VlBdswNKkxpkZ4y-s6eDG-3k3HHXCHJRPtvPMPGlPxw/edit?gid=0#gid=0"
                target="_blank"
                relrel="noreferrer"
              >
                {globalThis.t("seeSampleList")}
                <br />
              </a>
              <p style={{ fontSize: "12px" }}>
                <b>{globalThis.t("rememberPublic")}</b>
              </p>
            </>
          ) : (
            <>
              <p style={{ fontSize: "12px" }}>{globalThis.t("jsonInstructions")}</p>
              <br />
              <p style={{ fontSize: "12px" }}>{globalThis.t("jsonDownloadInfo")}</p>
              <a
                href="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/tedcasca/433b8ec62a5ecb249ca4dacdd4707b2186e598b4b74c1fb6e690c875bc48cf92.json"
                target="_blank"
                relrel="noreferrer"
              >
                {globalThis.t("seeSampleJSON")}
                <br />
              </a>
              <p style={{ fontSize: "12px" }}>
                <b>{globalThis.t("rememberJSONFormat")}</b>
              </p>
            </>
          )}

          {/* <ButtonsCover>
            <p> </p>
            <Button onClick={() => setInformationModal(false)} secondaryAlt>
              Close
            </Button>
          </ButtonsCover> */}
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
              if (onClickBackToDiscover) onClickBackToDiscover();
            }}
          >
            <span class="material-symbols-outlined">keyboard_backspace</span>
            <span>{editId ? t("backToDiscover") : t("backToCreate")}</span>
          </div>
        </div>
        <h3>{globalThis.t("enterDetailsBelow")}</h3>

        <p style={{ color: "#606060", margin: "8px 0" }}>
          {globalThis.t("addDetailsToSave")}
        </p>

        {false && (
          <Tabs
            tabs={tabsVals.filter((_, i) => (!editId ? true : i !== 1))}
            onTabChange={handleTabChange}
          />
        )}

        {isActiveTabManual() ? null : (
          <>
            <Tabs
              tabs={importTabsVal.filter((_, i) => (!editId ? true : i !== 1))}
              onTabChange={handleImportTabChange}
            />
            <div className="flex-col">
              <h4>{globalThis.t("importHeader")}</h4>
              <p
                onClick={() => setInformationModal(true)}
                className="align-center f-10 pointer what-this"
              >
                <span
                  style={{ marginRight: "4px" }}
                  class="material-symbols-outlined unfollow"
                >
                  info
                </span>{" "}
                <p class="underline">{globalThis.t("whatsThis")}</p>
              </p>
            </div>

            {uploadedFileData.length ? (
              <p className="success-info">
                <span class="material-symbols-outlined unfollow">
                  cloud_done
                </span>
                <span> {globalThis.t("jsonDataUploaded")}</span>
              </p>
            ) : null}

            {isActiveSheetImport ? (
              <Input
                style={{ marginBottom: "0", marginBottom: "0.75rem" }}
                value={link}
                onChangeListener={setLink}
                placeholder="e.g. https://docs.google.com/spreadsheets/abc"
              />
            ) : (
              <Button
                style={{ marginBottom: "0.5rem" }}
                onClick={async () => {
                  const files = await os.showUploadFiles();
                  const file = files[0];
                  try {
                    if (file.mimeType === "application/json") {
                      const playlistImportedData = await JSON.parse(file.data);
                      const filterdArray =
                        thisBot.filterOutValidItemFromJSON(
                          playlistImportedData
                        );
                      if (filterdArray.length) {
                        setUploadedFileData(filterdArray);
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

        {false && (
          <>
            <h3 style={{ marginTop: "0.75rem" }}>{globalThis.t("chooseColor")}</h3>
            <div
              style={{
                display: "flex",
                gap: "10px",
                marginBottom: "10px",
                padding: "0.5rem 0",
              }}
            >
              {predefinedColors.map((color, index) => (
                <div
                  key={index}
                  style={{
                    width: "40px",
                    height: "40px",
                    backgroundColor: color,
                    border:
                      selectedColor === color
                        ? "2px solid black"
                        : "2px solid #C8C3C3",
                    cursor: "pointer",
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                  }}
                  onClick={() => setSelectedColor(color)}
                >
                  {selectedColor === color && (
                    <span class="big-bold material-symbols-outlined unfollow color-inherit">
                      check
                    </span>
                  )}
                </div>
              ))}
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  backgroundColor: customColor,
                  border:
                    customColor === selectedColor
                      ? "2px solid black"
                      : "2px solid #D36433",
                  cursor: "pointer",
                  borderRadius: "50%",
                  position: "relative",
                  display: "grid",
                  placeItems: "center",
                }}
                onClick={() => setSelectedColor(customColor)}
              >
                <input
                  onChange={(e) => {
                    setCustomColor(e.target.value);
                    setSelectedColor(e.target.value);
                  }}
                  value={customColor}
                  type="color"
                  style={{
                    position: "absolute",
                    top: "0",
                    left: "0",
                    width: "100%",
                    height: "100%",
                    opacity: "0",
                  }}
                />
                <span class="big-bold material-symbols-outlined unfollow color-inherit">
                  add
                </span>
              </div>
            </div>
            <h3>{globalThis.t("chooseIcon")}</h3>
            <div
              style={{
                display: "flex",
                gap: "10px",
                marginBottom: "10px",
                flexWrap: "wrap",
                padding: "0.5rem 0",
              }}
            >
              {predefinedIcons.map((icon, index) => {
                const url = icon?.startsWith("https");
                return (
                  <div
                    key={index}
                    style={{
                      width: "40px",
                      height: "40px",
                      backgroundColor: "#fff",
                      border:
                        selectedIcon === icon
                          ? "2px solid black"
                          : "2px solid #C8C3C3",
                      cursor: "pointer",
                      display: "grid",
                      placeItems: "center",
                      borderRadius: "50%",
                    }}
                    onClick={() => setSelectedIcon(icon)}
                  >
                    {!url ? (
                      <span class="big-bold material-symbols-outlined unfollow color-inherit">
                        {icon}
                      </span>
                    ) : (
                      <img
                        src={icon}
                        style={{
                          width: "80%",
                          borderRadius: "50%",
                        }}
                        class="big-bold material-symbols-outlined unfollow color-inherit"
                      />
                    )}
                  </div>
                );
              })}
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  // background: `url(${customIcon})`,
                  // border: customIcon !== selectedIcon ? '2px solid rgb(200, 195, 195)' : '2px solid #D36433',
                  cursor: "pointer",
                  borderRadius: "50%",
                  position: "relative",
                  display: "grid",
                  placeItems: "center",
                }}
                onClick={() => setSelectedIcon(customIcon)}
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

                    const fileSave = await os.recordFile(
                      globalThis.RECORD_STOREKEY,
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

                    // console.log(fileSave, "fileSave");
                    // console.log(url, "url");
                    // setCustomIcon(url);
                    setPredefinedIcons((prev) => [...prev, url]);
                    setSelectedIcon(url);
                  }}
                  value=""
                  multiple="false"
                  type="image/*"
                  type="file"
                  style={{
                    position: "absolute",
                    borderRadius: "50%",
                    top: "0",
                    left: "0",
                    width: "100%",
                    height: "100%",
                    opacity: "0",
                  }}
                />
                <img
                  src={customIcon}
                  style={{
                    width: "80%",
                    borderRadius: "50%",
                  }}
                  class="big-bold material-symbols-outlined unfollow color-inherit"
                />
              </div>
            </div>
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

                  const fileSave = await os.recordFile(
                    globalThis.RECORD_STOREKEY,
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

                  // console.log(fileSave, "fileSave");
                  // console.log(url, "url");
                  // setCustomIcon(url);
                  // setPredefinedIcons(prev => [...prev, url]);
                  setSelectedIcon(url);
                }}
                value=""
                multiple="false"
                type="image/*"
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
                isCustomIcons={!!selectedIcon}
                onDelete={() => {
                  setSelectedIcon(null);
                }}
                big
                icon={selectedIcon}
                list={listPlaylist}
              />
              {false && (
                <img
                  src={customIcon}
                  style={{
                    width: "80%",
                    // borderRadius: '50%'
                  }}
                  class="big-bold material-symbols-outlined unfollow color-inherit"
                />
              )}
            </div>
          </div>
          <div style={{ flexGrow: "1" }}>
            <h4 style={{ margin: "0 0 0.5rem 0" }}>
              {!isLayers ? t("playlistName") : t("layerName")}
            </h4>
            <Input
              value={name}
              onChangeListener={setName}
              placeholder={globalThis.t("playlistNamePlaceholder")}
            />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
          <div style={{ flexGrow: "1" }}>
            {false && <h3>Description</h3>}
            <div>
              <Input
                style={{ marginBottom: "0" }}
                type="textarea"
                value={description}
                onChangeListener={setDescription}
                placeholder={globalThis.t("descriptionOptional")}
              />
            </div>
          </div>
        </div>

        {isActiveTabManual() && false && (
          <div className="align-center">
            <Checkbox
              style={{
                height: "18px",
                marginRight: "0.5rem",
              }}
              checked={isChecked}
              small
              onClick={(val) => {
                setIsChecked(val);
              }}
            />
            <p>{globalThis.t("autoGenerateByDescription")}</p>
          </div>
        )}
        <h3>{globalThis.t("tagsHeader")}</h3>
        <div className="align-center" style={{ gap: "1rem" }}>
          <Input
            style={{ marginBottom: "0", flexGrow: "1" }}
            value={tagName}
            name="tagName"
            onChangeListener={setTagName}
            placeholder={globalThis.t("tagPlaceholder")}
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
              setTags((prev) => {
                const old = [...prev];
                const index = old.findIndex((ele) => ele === nameFinal);
                if (index > -1) {
                  ShowNotification({
                    message: t("tagAlreadyPresent"),
                    severity: "error",
                  });
                } else {
                  old.push(nameFinal);
                  setTagName("");
                }
                return old;
              });
            }}
            secondary
          >
            {globalThis.t("add")}
          </Button>
        </div>
        <div
          className="align-center"
          style={{ flexWrap: "wrap", margin: "0.5rem 0", gap: "0.5rem" }}
        >
          {selectedTags.map((ele, index) => (
            <Chips
              label={ele}
              key={index}
              onDelete={() => {
                setTags((prev) => {
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
              if (!link.trim() && !isActiveTabManual() && isActiveSheetImport)
                return ShowNotification({
                  message: t("enterLinkToImport"),
                  severity: "error",
                });
              if (!isActiveTabManual() && !isActiveSheetImport) {
                if (uploadedFileData.length < 1) {
                  return ShowNotification({
                    message: t("uploadFileToImport"),
                    severity: "error",
                  });
                }
              }
              const checkNameDuplicate = (newName) => {
                const nameValue = (newName || name).trim();
                if (!nameValue)
                  return ShowNotification({
                    message: t("enterPlaylistName"),
                    severity: "error",
                  });

                const names = (globalThis[`${id}playlists`] || []).map(
                  (ele) => {
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
              if (!checkNameDuplicate(name)) {
                if (isActiveTabManual()) {
                  return onCreate();
                }
                onImport();
              }
            }}
            secondary
          >
            {loading
              ? t("saving")
              : isActiveTabManual()
                ? t("save")
                : t("importTab")}
          </Button>
          <Button
            isDisabled={loading}
            onClick={() => {
              onClickBackToDiscover();
            }}
            secondaryAlt
          >
            {globalThis.t("close")}
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
};

return AddNewPlaylist;
