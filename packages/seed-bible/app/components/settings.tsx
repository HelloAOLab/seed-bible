const { useState, useEffect } = os.appHooks;
import { getStyleOf } from "app.styles.styler";
import { SpaceIcon } from "app.components.images";
import { ProfileCard } from "app.components.profileCard";
import { useSideBarContext } from "app.hooks.sideBar";
import {
  Space,
  LoadSpace,
  ToolbarIcon,
  UserAvatar,
  MenuIcon,
} from "app.components.icons";
import { useTabsContext } from "app.hooks.tabs";
import { useBibleContext } from "app.hooks.bibleVariables";
import { SpaceSettingsForm, SpaceSelector } from "app.components.spaceSettings";
import { useHoldAction } from "app.hooks.useHold";
import {
  ThemeIcon,
  BibleIcon,
  NewSettingsIcon,
  ExtensionsIcon,
  SelectionUIIcon,
} from "app.components.icons";
import {
  getSubscribedUsers,
  subscribeToUsers,
  unsubscribeFromUsers,
} from "db.annotations.library";
const SettingsSidebar = () => {
  const { t, changeLanguage, availableLanguages, language } =
    useSideBarContext();
  const [activeTab, setActiveTab] = useState("space");
  globalThis.SetActiveSettingsTab = setActiveTab;
  const { sidebarMode, setSideBarMode } = useSideBarContext();
  const {
    openPopupSettings,
    closePopupSettings,
    setUserURL,
    customIcon,
    setCustomIcon,
  } = useSideBarContext();
  const {
    updateSpace,
    activeSpace,
    spaces,
    downloadSpaceAsJSON,
    replaceActiveSpaceWithJSON,
  } = useTabsContext();
  const CurrentSpace = spaces.find((e) => e.id === activeSpace);
  const [expandedSections, setExpandedSections] = useState({
    layers: false,
    bibleDefaults: false,
    pageSettings: false,
    canvasSettings: false,
    mapSettings: false,
  });
  const [subscribedUsers, setSubscribedUsers] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [unsubscribingId, setUnsubscribingId] = useState(null);

  const getSubs = async () => {
    setLoadingSubs(true);
    const subs = await getSubscribedUsers();
    os.log(subs, "subs");
    setSubscribedUsers(subs || []);
    setLoadingSubs(false);
  };
  useEffect(() => {
    getSubs();
  }, []);

  const handleUnsubscribe = async (userId) => {
    setUnsubscribingId(userId);
    await unsubscribeFromUsers([userId]);
    await getSubs();
    setUnsubscribingId(null);
  };
  // New state for edit mode and settings customization
  const [editMode, setEditMode] = useState(false);
  const { ReSeed, setReSeed } = useBibleContext();
  useEffect(() => {
    setEditMode(ReSeed);
  }, [ReSeed]);

  // Visibility + label state reused for Space + General
  const [settingsVisibility, setSettingsVisibility] = useState({});
  const [settingsLabels, setSettingsLabels] = useState({});
  const [editingLabel, setEditingLabel] = useState(null);

  // Space content state
  const [spaceContentVisibility, setSpaceContentVisibility] = useState({});
  const [spaceContentLabels, setSpaceContentLabels] = useState({});
  const [spaceDescription, setSpaceDescription] = useState(
    "Settings for your space. Customise toolbar, theme and add extensions."
  );

  // Initialize globalThis.changes if it doesn't exist
  if (!globalThis.changes) {
    globalThis.changes = {
      settingsVisibility: {},
      settingsLabels: {},
      spaceContentVisibility: {},
      spaceContentLabels: {},
    };
  }

  // Space content configuration - store keys, translate in JSX
  const spaceContentConfig = [
    { key: "spaceIcon", labelKey: "spaceIcon", type: "component" },
    { key: "spaceName", labelKey: "spaceName", type: "component" },
    {
      key: "spaceDescription",
      labelKey: "spaceDescription",
      type: "text",
      contentKey: "spaceSettingsDescription",
    },
  ];

  // SPACE tab base config - store labelKey, translate in JSX
  const baseSettingsConfig = [
    {
      key: "theme",
      labelKey: "themeAndText",
      icon: <ThemeIcon />,
      expandable: false,
      onClick: () => setSideBarMode("themeSettings"),
    },
    // {
    //   key: "layers",
    //   label: "Layers",
    //   icon: "layers",
    //   style: "disabled",
    //   expandable: true,
    // },
    {
      key: "Extensions",
      labelKey: "configureExtensions",
      icon: <ExtensionsIcon />,
      style: "",
      expandable: false,
      onClick: () => setSideBarMode("extensions"),
    },
    /*{
      key: "selectionUI",
      labelKey: "selectionUI",
      icon: <SelectionUIIcon />,
      expandable: false,
      onClick: () => setSideBarMode("selectionUISettings"),
    },*/
    {
      key: "bibleDefaults",
      labelKey: "bibleDefaults",
      style: false,
      icon: <BibleIcon />,
      expandable: true,
      subItems: [
        {
          key: "BookOrder",
          labelKey: "bookOrder",
          App: () => {
            const [selectedOrientation, setSelectedOrientation] = useState(
              tags?.bookOrientation || "traditional"
            );
            return (
              <div
                onContextMenu={(e) => e.stopPropagation()}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "5px",
                  borderRadius: "5px",
                  backgroundColor: "var(--pageBackground)",
                  pointerEvents: "auto",
                  color: "var(--text1)",
                }}
              >
                <div
                  className={`settings-item-container`}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setSelectedOrientation("tanak");
                    setTagMask(thisBot, "bookOrientation", "tanak", "local");
                    shout("onBookOrientationChanged", { orientation: "tanak" });
                  }}
                >
                  <div style={{ width: "90%", fontSize: "14px" }}>
                    <b>
                      <span>TaNak order</span>
                    </b>
                    <p>
                      The original, unified, three-part ordering of the Hebrew
                      Bible (or Old Testament)
                    </p>
                  </div>
                  <div
                    style={{
                      width: "15px",
                      height: "15px",
                      backgroundColor:
                        selectedOrientation === "tanak"
                          ? "var(--secondaryButton)"
                          : "var(--primaryButton)",
                      borderRadius: "50%",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M10 3L4.5 8.5L2 6"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
                <div className="settings-divider"></div>
                <div
                  className={`settings-item-container`}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedOrientation("traditional");
                    setTagMask(
                      thisBot,
                      "bookOrientation",
                      "traditional",
                      "local"
                    );
                    shout("onBookOrientationChanged", {
                      orientation: "traditional",
                    });
                  }}
                >
                  <div style={{ width: "90%", fontSize: "14px" }}>
                    <b>
                      <span>Traditional order</span>
                    </b>
                    <p>The ordering found in most modern Christian Bibles</p>
                  </div>
                  <div
                    style={{
                      width: "15px",
                      height: "15px",
                      backgroundColor:
                        selectedOrientation === "traditional"
                          ? "var(--secondaryButton)"
                          : "var(--primaryButton)",
                      borderRadius: "50%",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M10 3L4.5 8.5L2 6"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            );
          },
          type: "app",
        },
      ],
    },
    // { key: "divider1", type: "divider" },
    {
      key: "pageSettings",
      labelKey: "advancedSettings",
      icon: <NewSettingsIcon />,
      expandable: true,
      subItems: [
        // { key: 'toolbar', label: 'Toolbar', icon: `construction`, onClick: () => setSideBarMode('toolbarSettings-Page') },
        {
          key: "instant_mix",
          labelKey: "editor",
          icon: `instant_mix`,
          onClick: () => setSideBarMode("editorToolbarSettings"),
        },
        {
          key: "selectionUI",
          labelKey: "selectionUI",
          icon: <SelectionUIIcon />,
          expandable: false,
          onClick: () => setSideBarMode("selectionUISettings"),
        },
        // {
        //   key: "text",
        //   label: "Text",
        //   icon: "text_fields",
        //   onClick: () => setSideBarMode("textSettings"),
        // },
        {
          key: "ai",
          labelKey: "ai",
          icon: "smart_toy",
          onClick: () => setSideBarMode("aiSettings"),
        },
        {
          key: "tab",
          labelKey: "tab",
          icon: "description",
          onClick: () => setSideBarMode("tabSettings"),
        },

        // {
        //   key: "mentuText",
        //   label: "Menu text",
        //   icon: "text_fields",
        //   onClick: () => setSideBarMode("menuTextSettings"),
        // },
      ],
    },
    // { key: "divider2", type: "divider" },
    // {
    //   key: "canvasSettings",
    //   label: "Canvas Settings",
    //   icon: "dashboard_customize",
    //   expandable: true,
    //   subItems: [
    //   //  {
    //     //  key: "toolbar",
    //     //  label: "Toolbar",
    //     //  icon: `construction`,
    //   //    onClick: () => setSideBarMode("toolbarSettings-Canvas"),
    //   //  },
    //     {
    //       key: "tab",
    //       label: "Tab",
    //       icon: "description",
    //       onClick: () => setSideBarMode("tabSettings"),
    //     },
    //     {
    //       key: "text",
    //       label: "Promt Bar",
    //       icon: "text_fields",
    //       onClick: () => setSideBarMode("promtSettings"),
    //     },
    //     {
    //       key: "ai",
    //       label: "AI",
    //       icon: "smart_toy",
    //       onClick: () => setSideBarMode("canvasAiSettings"),
    //     },
    //   ],
    // },
    // { key: 'divider2b', type: 'divider' },
    // {
    //     key: 'mapSettings', label: 'Map Settings', icon: 'map', expandable: true, subItems: [
    //         { key: 'toolbar', label: 'Toolbar', icon: `construction`, onClick: () => setSideBarMode('toolbarSettings-Canvas') },
    //         { key: 'tab', label: 'Tab', icon: 'description', onClick: () => setSideBarMode('tabSettings') },
    //         { key: 'ai', label: 'AI', icon: 'smart_toy', onClick: () => setSideBarMode('canvasAiSettings') },
    //     ]
    // },
    { key: "divider3", type: "divider" },
    {
      key: "LoadSpace",
      labelKey: "loadNewSpace",
      icon: <LoadSpace />,
      expandable: false,
      onClick: async () => {
        const files = await os.showUploadFiles();
        if (files.length !== 0) {
          const file = files[0];
          replaceActiveSpaceWithJSON(file, CurrentSpace.id);
        }
      },
    },
    // {
    //   key: "DownloadSpace",
    //   label: "Download space",
    //   icon: "download",
    //   expandable: false,
    //   onClick: () => {
    //     downloadSpaceAsJSON(CurrentSpace.id);
    //   },
    // },
    { key: "Share", labelKey: "share", icon: "share", expandable: false },
  ];

  // GENERAL tab config - store labelKey, translate in JSX
  const generalSettingsConfig = [
    // Move account section to the top as the first item
    { key: "generalHeader", type: "header", labelKey: "generalSettings" },
    {
      key: "generalDesc",
      type: "desc",
      labelKey: "manageAccountDesc",
    },
    {
      key: "yourAccount",
      type: "account",
      labelKey: "yourAccount",
    },

    // { key: 'dividerG1', type: 'divider' },

    // Account row
    {
      key: "accountSettings",
      labelKey: "accountSettings",
      icon: "manage_accounts",
      onClick: () => {
        globalThis.AccountSettingsEnteredFrom = "settings";
        setSideBarMode("createAccountSettings");
      },
    },

    // Disabled rows
    {
      key: "billing",
      labelKey: "billingServices",
      icon: "rule_settings",
      style: "disabled",
    },
    {
      key: "permissions",
      labelKey: "permissions",
      icon: "action_key",
      style: "disabled",
    },
    {
      key: "notifications",
      labelKey: "notifications",
      icon: "notification_settings",
      style: "disabled",
    },

    // { key: 'dividerG2', type: 'divider' },

    // Subscriptions "section"
    {
      key: "subscriptions",
      type: "section",
      labelKey: "subscriptions", // header text; content rendered below
    },

    // { key: 'dividerG3', type: 'divider' },

    // Language selector
    {
      key: "language",
      labelKey: "language",
      icon: "language",
      type: "language",
    },

    // ReSeed toggle item
    {
      key: "reseedToggle",
      labelKey: ReSeed ? "exit" : "propagate",
      icon: "face",
      onClick: () => setReSeed((prev) => !prev),
    },
  ];

  // Load saved changes from globalThis and initialize visibility and labels
  useEffect(() => {
    const savedVisibility = globalThis.changes.settingsVisibility || {};
    const savedLabels = globalThis.changes.settingsLabels || {};
    const savedSpaceVisibility =
      globalThis.changes.spaceContentVisibility || {};
    const savedSpaceLabels = globalThis.changes.spaceContentLabels || {};

    const initialVisibility = {};
    const initialLabels = {};

    const initializeSettings = (items, parentKey = "") => {
      items.forEach((item) => {
        if (item.type !== "divider") {
          const fullKey = parentKey ? `${parentKey}.${item.key}` : item.key;
          // Use saved visibility or default to true
          initialVisibility[fullKey] =
            savedVisibility[fullKey] !== undefined
              ? savedVisibility[fullKey]
              : true;
          // Use saved label if exists (don't set default - we'll translate in render)
          if (savedLabels[fullKey]) {
            initialLabels[fullKey] = savedLabels[fullKey];
          }
          if (item.subItems) {
            initializeSettings(item.subItems, item.key);
          }
        }
      });
    };

    // Initialize space content visibility and labels
    const initializeSpaceContent = () => {
      const spaceVisibility = {};
      const spaceLabels = {};

      spaceContentConfig.forEach((item) => {
        spaceVisibility[item.key] =
          savedSpaceVisibility[item.key] !== undefined
            ? savedSpaceVisibility[item.key]
            : true;
        // Use saved label if exists (don't set default - we'll translate in render)
        if (savedSpaceLabels[item.key]) {
          spaceLabels[item.key] = savedSpaceLabels[item.key];
        }
      });

      setSpaceContentVisibility(spaceVisibility);
      setSpaceContentLabels(spaceLabels);
    };

    // Include BOTH Space and General configs in initialization
    initializeSettings(baseSettingsConfig);
    initializeSettings(generalSettingsConfig);
    initializeSpaceContent();

    setSettingsVisibility(initialVisibility);
    setSettingsLabels(initialLabels);
  }, []); // run once

  // Generate SPACE settings config with custom labels and visibility
  const settingsConfig = baseSettingsConfig
    .map((item) => {
      if (item.type === "divider") return item;

      const isVisible = settingsVisibility[item.key] !== false;
      if (!isVisible && !editMode) return null;

      // Use saved label if exists, otherwise translate the labelKey
      const customLabel =
        settingsLabels[item.key] || (item.labelKey ? t(item.labelKey) : "");

      return {
        ...item,
        label: customLabel,
        hidden: !isVisible,
        subItems: item.subItems
          ?.map((subItem) => {
            const subKey = `${item.key}.${subItem.key}`;
            const subVisible = settingsVisibility[subKey] !== false;
            if (!subVisible && !editMode) return null;

            return {
              ...subItem,
              label:
                settingsLabels[subKey] ||
                (subItem.labelKey ? t(subItem.labelKey) : ""),
              hidden: !subVisible,
            };
          })
          .filter(Boolean),
      };
    })
    .filter(Boolean);

  // Generate GENERAL settings config with the same behavior
  const generalConfig = generalSettingsConfig
    .map((item) => {
      if (item.type === "divider") return item;

      const isVisible = settingsVisibility[item.key] !== false;
      if (!isVisible && !editMode) return null;

      // Use saved label if exists, otherwise translate the labelKey
      const computedLabel =
        settingsLabels[item.key] || (item.labelKey ? t(item.labelKey) : "");
      return {
        ...item,
        label: computedLabel,
        hidden: !isVisible,
      };
    })
    .filter(Boolean);

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleVisibility = (key, parentKey = "") => {
    const fullKey = parentKey ? `${parentKey}.${key}` : key;
    const newVisibility = {
      ...settingsVisibility,
      [fullKey]: !settingsVisibility[fullKey],
    };

    setSettingsVisibility(newVisibility);

    // Save to globalThis.changes
    globalThis.changes.settingsVisibility = newVisibility;
  };

  const handleLabelEdit = (key, parentKey = "", newLabel) => {
    const fullKey = parentKey ? `${parentKey}.${key}` : key;
    const newLabels = {
      ...settingsLabels,
      [fullKey]: newLabel,
    };

    setSettingsLabels(newLabels);

    // Save to globalThis.changes
    globalThis.changes.settingsLabels = newLabels;
  };

  const startEditingLabel = (key, parentKey = "") => {
    const fullKey = parentKey ? `${parentKey}.${key}` : key;
    setEditingLabel(fullKey);
  };

  const finishEditingLabel = () => {
    setEditingLabel(null);
  };

  const toggleSpaceContentVisibility = (key) => {
    const newVisibility = {
      ...spaceContentVisibility,
      [key]: !spaceContentVisibility[key],
    };

    setSpaceContentVisibility(newVisibility);
    globalThis.changes.spaceContentVisibility = newVisibility;
  };

  const handleSpaceContentLabelEdit = (key, newLabel) => {
    const newLabels = {
      ...spaceContentLabels,
      [key]: newLabel,
    };

    setSpaceContentLabels(newLabels);
    globalThis.changes.spaceContentLabels = newLabels;
  };

  const handleSpaceDescriptionEdit = (newDescription) => {
    setSpaceDescription(newDescription);
    if (!globalThis.changes.spaceContentData) {
      globalThis.changes.spaceContentData = {};
    }
    globalThis.changes.spaceContentData.spaceDescription = newDescription;
  };

  // Load space description from saved data
  useEffect(() => {
    const savedDescription =
      globalThis.changes.spaceContentData?.spaceDescription;
    if (savedDescription) {
      setSpaceDescription(savedDescription);
    }
  }, []);

  const [editSpaceName, setEditSpaceName] = useState(false);
  const [spaceName, setSpaceName] = useState(false);
  useEffect(() => {
    if (CurrentSpace) {
      setSpaceName(CurrentSpace.name);
    }
  }, [activeSpace]);
  useEffect(() => {
    updateSpace(activeSpace, { name: spaceName });
    console.log("updating name", spaceName);
  }, [spaceName]);
  const [userData, setUserData] = useState(null);
  const [subscribe, setSubscribe] = useState(false);
  const [searchFor, setSearchFor] = useState("");
  const [searchResult, setSearchResult] = useState();
  async function search() {
    const data = await os.getData(tags.key, searchFor);
    os.log(data, "the dt");
    if (data.success) setSearchResult(data.data);
  }
  useEffect(() => {
    if (searchFor) {
      // search()
    }
  }, [searchFor]);
  const getUserData = async () => {
    if (!authBot?.id) return;

    const data = await os.getData(tags.key, authBot.id);
    if (data.success) {
      const payload = data.data;
      setUserData(payload);
      globalThis.SetGlobalProfilePic(payload?.photoLink);
    }
  };
  useEffect(() => {
    getUserData();
  }, []);
  const { eventHandlers, shouldSuppressClick } = useHoldAction(async () => {
    const url = await os.showInput(null, {
      placeholder: "Enter Url",
    });
    setUserURL(url);
  }, 1000);
  // put this above your component or inside it before render
  const chunkByDividers = (list) => {
    const sections = [];
    let current = { divider: null, items: [] };
    for (const item of list) {
      if (item?.type === "divider") {
        sections.push(current);
        current = { divider: item, items: [] }; // the divider belongs to the NEXT section
      } else {
        if (item != null) current.items.push(item);
      }
    }
    sections.push(current);
    return sections;
  };
  const SpaceIconOptions = {
    type: "normal",
    items: [
      {
        icon: <MenuIcon name="upload" />,
        title: "Upload icon",
        onClick: async () => {
          const img = await thisBot.uploadHandler();
          setCustomIcon({ icon: <img style={{ width: "25px" }} src={img} /> });
        },
      },
      {
        disabled: !customIcon,
        icon: <MenuIcon name="add_link" />,
        title: "Add link",
        onClick: async () => {
          const link = await os.showInput(null, {
            title: "Add link",
          });
          os.log(link, "link");
          if (link)
            setCustomIcon((prev) => ({
              ...prev,
              link,
            }));
        },
      },
      {
        disabled: !customIcon,
        icon: <MenuIcon name="hide_image" />,
        title: "Remove icon",
        onClick: async () => {
          setCustomIcon(null);
        },
      },
    ],
  };
  const settingsSections = chunkByDividers(settingsConfig);
  const generalSections = chunkByDividers(generalConfig);

  return (
    <div onClick={() => setSearchResult(null)} className="settings-sidebar">
      <div className="settings-header">
        <h2>{t("settings")}</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {editMode && (
            <button
              onClick={() => setReSeed(false)}
              className={`edit-mode-button ${editMode ? "active" : ""}`}
              title="Toggle edit mode"
            >
              <span className="material-symbols-outlined">
                {editMode ? "check" : "edit"}
              </span>
            </button>
          )}
          <button
            onClick={() => setSideBarMode("default")}
            className="close-button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <div className="settings-tabs">
        <button
          className={`tab-button ${activeTab === "space" ? "active" : ""}`}
          onClick={() => setActiveTab("space")}
        >
          {t("spaceSettings")}
        </button>
        <button
          className={`tab-button ${activeTab === "general" ? "active" : ""}`}
          onClick={() => setActiveTab("general")}
        >
          {t("generalSettings")}
        </button>
      </div>

      {activeTab === "space" ? (
        <div className="settings-content">
          {spaceContentVisibility.spaceIcon !== false && (
            <div
              className={`space-content-item ${
                spaceContentVisibility.spaceIcon === false ? "hidden-item" : ""
              }`}
            >
              {editMode && (
                <button
                  className="hide-button space-content-hide"
                  onClick={() => toggleSpaceContentVisibility("spaceIcon")}
                  title="Hide space icon"
                >
                  <span className="material-symbols-outlined">
                    {spaceContentVisibility.spaceIcon === false
                      ? "visibility"
                      : "visibility_off"}
                  </span>
                </button>
              )}
              <div className="space-details">
                <div
                  {...eventHandlers}
                  onClick={(e) => {
                    if (shouldSuppressClick()) return;

                    openPopupSettings(
                      <SpaceSelector
                        activeSpace={activeSpace}
                        spaces={spaces}
                        updateSpace={updateSpace}
                      />,
                      null,
                      true
                    );
                  }}
                  className="space-icon material-symbols-outlined"
                >
                  <div style={{ "pointer-events": "none" }}>
                    {CurrentSpace?.icon || (
                      <div class="activeBg">
                        <span></span>
                      </div>
                    )}
                  </div>
                </div>
                {spaceContentVisibility.spaceName !== false && (
                  <div
                    onContextMenu={(e) => {
                      openPopupSettings(SpaceIconOptions);
                    }}
                    className="space-name-container"
                  >
                    {editMode && (
                      <button
                        className="hide-button space-name-hide"
                        onClick={() =>
                          toggleSpaceContentVisibility("spaceName")
                        }
                        title="Hide space name"
                      >
                        <span className="material-symbols-outlined">
                          {spaceContentVisibility.spaceName === false
                            ? "visibility"
                            : "visibility_off"}
                        </span>
                      </button>
                    )}
                    {customIcon ? (
                      <div className="space-name">{customIcon.icon}</div>
                    ) : !editSpaceName ? (
                      <div
                        onClick={() => setEditSpaceName(true)}
                        className="space-name"
                      >
                        {CurrentSpace.name}
                      </div>
                    ) : (
                      <input
                        onBlur={() => setEditSpaceName(false)}
                        style={{ height: "35px", width: "220px" }}
                        id="input"
                        value={spaceName}
                        onChange={(e) => {
                          e.target.value !== "" && setSpaceName(e.target.value);
                        }}
                        className="input-field number selectInput"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {spaceContentVisibility.spaceDescription !== false && (
            <div
              className={`space-content-item ${
                spaceContentVisibility.spaceDescription === false
                  ? "hidden-item"
                  : ""
              }`}
            >
              {editMode && (
                <button
                  className="hide-button space-content-hide"
                  onClick={() =>
                    toggleSpaceContentVisibility("spaceDescription")
                  }
                  title="Hide space description"
                >
                  <span className="material-symbols-outlined">
                    {spaceContentVisibility.spaceDescription === false
                      ? "visibility"
                      : "visibility_off"}
                  </span>
                </button>
              )}
              <div className="space-description">
                {editMode && editingLabel === "spaceDescription" ? (
                  <textarea
                    value={spaceDescription}
                    onChange={(e) => handleSpaceDescriptionEdit(e.target.value)}
                    onBlur={finishEditingLabel}
                    className="space-description-edit"
                    autoFocus
                    rows="3"
                  />
                ) : (
                  <div
                    onClick={
                      editMode
                        ? () => setEditingLabel("spaceDescription")
                        : undefined
                    }
                    className={editMode ? "editable-text" : ""}
                  >
                    {spaceDescription}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="settings-list">
            {settingsSections.map(({ divider, items }) => {
              // when NOT in editMode, items already exclude hidden ones, so empty means "all hidden"
              const hasContent = editMode ? items.length > 0 : items.length > 0;
              if (!hasContent) return null; // hide the whole section including its divider

              return (
                <div
                  key={
                    (divider && divider.key) ||
                    items.map((i) => i.key).join("_")
                  }
                >
                  {divider && (
                    <div className="settings-divider">
                      <div className="sidebarLine"></div>
                    </div>
                  )}
                  {items.map(
                    ({
                      key,
                      label,
                      icon,
                      expandable,
                      subItems,
                      type,
                      onClick,
                      style,
                      hidden,
                    }) =>
                      type === "divider" ? null : (
                        <div
                          key={key}
                          className={`settings-item-container ${
                            hidden ? "hidden-item" : ""
                          }`}
                        >
                          <div className="settings-item-wrapper">
                            {editMode && (
                              <button
                                className="hide-button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleVisibility(key);
                                }}
                                title={hidden ? "Show item" : "Hide item"}
                              >
                                <span className="material-symbols-outlined">
                                  {hidden ? "visibility" : "visibility_off"}
                                </span>
                              </button>
                            )}
                            <div
                              className={`settings-item ${style} ${
                                hidden ? "hidden" : ""
                              }`}
                              onClick={
                                expandable ? () => toggleSection(key) : onClick
                              }
                            >
                              <div className="item-icon">
                                <span className="material-symbols-outlined">
                                  {icon}
                                </span>
                              </div>
                              <div className="item-text">
                                {editMode && editingLabel === key ? (
                                  <input
                                    type="text"
                                    value={label}
                                    onChange={(e) =>
                                      handleLabelEdit(key, "", e.target.value)
                                    }
                                    onBlur={finishEditingLabel}
                                    onKeyPress={(e) =>
                                      e.key === "Enter" && finishEditingLabel()
                                    }
                                    className="label-edit-input"
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <span
                                    onClick={
                                      editMode
                                        ? (e) => {
                                            e.stopPropagation();
                                            startEditingLabel(key);
                                          }
                                        : undefined
                                    }
                                    className={editMode ? "editable-label" : ""}
                                  >
                                    {label}
                                  </span>
                                )}
                              </div>
                              {expandable && (
                                <div className="item-chevron">
                                  <span className="material-symbols-outlined">
                                    {expandedSections[key]
                                      ? "expand_less"
                                      : "expand_more"}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {expandable &&
                            expandedSections[key] &&
                            subItems?.length > 0 && (
                              <div className="sub-settings-list">
                                {subItems.map(
                                  ({
                                    key: subKey,
                                    label: subLabel,
                                    icon: subIcon,
                                    onClick,
                                    hidden: subHidden,
                                    type: subType,
                                    App,
                                  }) => {
                                    if (subType === "app") {
                                      return <App />;
                                    }
                                    return (
                                      <div
                                        key={subKey}
                                        className={`settings-item-container ${
                                          subHidden ? "hidden-item" : ""
                                        }`}
                                      >
                                        <div className="settings-item-wrapper">
                                          {editMode && (
                                            <button
                                              className="hide-button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggleVisibility(subKey, key);
                                              }}
                                              title={
                                                subHidden
                                                  ? "Show item"
                                                  : "Hide item"
                                              }
                                            >
                                              <span className="material-symbols-outlined">
                                                {subHidden
                                                  ? "visibility"
                                                  : "visibility_off"}
                                              </span>
                                            </button>
                                          )}
                                          <div
                                            onClick={onClick}
                                            className={`settings-item sub-item ${
                                              subHidden ? "hidden" : ""
                                            }`}
                                          >
                                            <div className="item-icon">
                                              <span className="material-symbols-outlined">
                                                {subIcon}
                                              </span>
                                            </div>
                                            <div className="item-text">
                                              {editMode &&
                                              editingLabel ===
                                                `${key}.${subKey}` ? (
                                                <input
                                                  type="text"
                                                  value={subLabel}
                                                  onChange={(e) =>
                                                    handleLabelEdit(
                                                      subKey,
                                                      key,
                                                      e.target.value
                                                    )
                                                  }
                                                  onBlur={finishEditingLabel}
                                                  onKeyPress={(e) =>
                                                    e.key === "Enter" &&
                                                    finishEditingLabel()
                                                  }
                                                  className="label-edit-input"
                                                  autoFocus
                                                  onClick={(e) =>
                                                    e.stopPropagation()
                                                  }
                                                />
                                              ) : (
                                                <span
                                                  onClick={
                                                    editMode
                                                      ? (e) => {
                                                          e.stopPropagation();
                                                          startEditingLabel(
                                                            subKey,
                                                            key
                                                          );
                                                        }
                                                      : undefined
                                                  }
                                                  className={
                                                    editMode
                                                      ? "editable-label"
                                                      : ""
                                                  }
                                                >
                                                  {subLabel}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            )}
                        </div>
                      )
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : activeTab === "general" ? (
        <div className="settings-content">
          {generalSections.map(({ divider, items }) => {
            // hide the entire section (and its top divider) if every item is hidden when not in edit mode
            const hasVisibleItem = editMode
              ? items.length > 0
              : items.some((i) => !i.hidden);
            if (!hasVisibleItem) return null;

            return (
              <div
                key={
                  (divider && divider.key) || items.map((i) => i.key).join("_")
                }
              >
                {divider && (
                  <div className="settings-divider">
                    <div className="sidebarLine"></div>
                  </div>
                )}

                {items.map((item) => {
                  // normalize helpers
                  const hidden = !!item.hidden;
                  const label = item.label;

                  // Handle the "Your account" section at the top
                  if (item.type === "account") {
                    if (hidden && !editMode) return null;
                    return (
                      <div
                        key={item.key}
                        className={`activeAccount ${
                          hidden ? "hidden-item" : ""
                        }`}
                        style={{ position: "relative" }}
                      >
                        {editMode && (
                          <button
                            className="hide-button"
                            onClick={() => toggleVisibility(item.key)}
                            title={hidden ? "Show account" : "Hide account"}
                          >
                            <span className="material-symbols-outlined">
                              {hidden ? "visibility" : "visibility_off"}
                            </span>
                          </button>
                        )}
                        {userData && userData?.photoLink ? (
                          <img
                            style={{
                              borderRadius: "50%",
                              height: "40px",
                              width: "40px",
                              border: "1px solid #4459F3",
                            }}
                            src={userData.photoLink}
                          />
                        ) : (
                          <UserAvatar />
                        )}
                        <div className="softText">
                          {editMode && editingLabel === item.key ? (
                            <input
                              type="text"
                              value={label}
                              onChange={(e) =>
                                handleLabelEdit(item.key, "", e.target.value)
                              }
                              onBlur={finishEditingLabel}
                              onKeyPress={(e) =>
                                e.key === "Enter" && finishEditingLabel()
                              }
                              className="label-edit-input"
                              autoFocus
                            />
                          ) : (
                            <span
                              onClick={
                                editMode
                                  ? () => startEditingLabel(item.key)
                                  : undefined
                              }
                              className={editMode ? "editable-label" : ""}
                            >
                              {label}
                            </span>
                          )}
                        </div>

                        {!userData && (
                          <div
                            style={{ justifyContent: "center" }}
                            className="activeAccount"
                          >
                            <button
                              onClick={() => {
                                globalThis.AccountSettingsEnteredFrom =
                                  "settings";
                                setSideBarMode("createAccountSettings");
                              }}
                              className="create-profile-btn"
                            >
                              {userData
                                ? "Open account settings"
                                : " + Create profile"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }

                  // 1) headers
                  if (item.type === "header") {
                    if (hidden && !editMode) return null;
                    return (
                      <div
                        key={item.key}
                        className={`space-details ${
                          hidden ? "hidden-item" : ""
                        }`}
                        style={{ position: "relative" }}
                      >
                        {editMode && (
                          <button
                            className="hide-button"
                            onClick={() => toggleVisibility(item.key)}
                            title={hidden ? "Show section" : "Hide section"}
                          >
                            <span className="material-symbols-outlined">
                              {hidden ? "visibility" : "visibility_off"}
                            </span>
                          </button>
                        )}
                        <div className="space-name">
                          {editMode && editingLabel === item.key ? (
                            <input
                              type="text"
                              value={label}
                              onChange={(e) =>
                                handleLabelEdit(item.key, "", e.target.value)
                              }
                              onBlur={finishEditingLabel}
                              onKeyPress={(e) =>
                                e.key === "Enter" && finishEditingLabel()
                              }
                              className="label-edit-input"
                              autoFocus
                            />
                          ) : (
                            <span
                              onClick={
                                editMode
                                  ? () => startEditingLabel(item.key)
                                  : undefined
                              }
                              className={editMode ? "editable-label" : ""}
                            >
                              {label}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // 2) descriptions
                  if (item.type === "desc") {
                    if (hidden && !editMode) return null;
                    return (
                      <div
                        key={item.key}
                        className={`space-description ${
                          hidden ? "hidden-item" : ""
                        }`}
                        style={{ position: "relative" }}
                      >
                        {editMode && (
                          <button
                            className="hide-button"
                            onClick={() => toggleVisibility(item.key)}
                            title={hidden ? "Show text" : "Hide text"}
                          >
                            <span className="material-symbols-outlined">
                              {hidden ? "visibility" : "visibility_off"}
                            </span>
                          </button>
                        )}
                        {editMode && editingLabel === item.key ? (
                          <textarea
                            value={label}
                            onChange={(e) =>
                              handleLabelEdit(item.key, "", e.target.value)
                            }
                            onBlur={finishEditingLabel}
                            className="space-description-edit"
                            autoFocus
                            rows="2"
                          />
                        ) : (
                          <div
                            onClick={
                              editMode
                                ? () => startEditingLabel(item.key)
                                : undefined
                            }
                            className={editMode ? "editable-text" : ""}
                          >
                            {label}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // 3) sections (Subscriptions block)
                  if (item.type === "section" && item.key === "subscriptions") {
                    if (hidden && !editMode) return null;
                    return (
                      <div
                        key={item.key}
                        className={`general-section ${
                          hidden ? "hidden-item" : ""
                        }`}
                        style={{ position: "relative" }}
                      >
                        {editMode && (
                          <button
                            className="hide-button"
                            onClick={() => toggleVisibility(item.key)}
                            title={hidden ? "Show section" : "Hide section"}
                          >
                            <span className="material-symbols-outlined">
                              {hidden ? "visibility" : "visibility_off"}
                            </span>
                          </button>
                        )}

                        <div className="activeAccount" style={{ gap: "8px" }}>
                          <img
                            style={{
                              borderRadius: "50%",
                              height: "20px",
                              width: "20px",
                            }}
                            src="https://res.cloudinary.com/dfbtwwa8p/image/upload/v1751169026/517d2d9057397c32ea562a20df4640807915b4df_udws5p.png"
                          />
                          <div className="softText">
                            {editMode && editingLabel === item.key ? (
                              <input
                                type="text"
                                value={label}
                                onChange={(e) =>
                                  handleLabelEdit(item.key, "", e.target.value)
                                }
                                onBlur={finishEditingLabel}
                                onKeyPress={(e) =>
                                  e.key === "Enter" && finishEditingLabel()
                                }
                                className="label-edit-input"
                                autoFocus
                              />
                            ) : (
                              <span
                                onClick={
                                  editMode
                                    ? () => startEditingLabel(item.key)
                                    : undefined
                                }
                                className={editMode ? "editable-label" : ""}
                              >
                                {label}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Subscribed Users List */}
                        {loadingSubs ? (
                          <div
                            style={{
                              justifyContent: "center",
                              padding: "20px",
                            }}
                            className="activeAccount"
                          >
                            <div className="softText">Loading...</div>
                          </div>
                        ) : subscribedUsers.length > 0 ? (
                          <div style={{ width: "100%" }}>
                            <div
                              className="softText"
                              style={{
                                marginBottom: "8px",
                                textAlign: "center",
                              }}
                            >
                              {`You have ${subscribedUsers.length} subscription${subscribedUsers.length > 1 ? "s" : ""}`}
                            </div>
                            {subscribedUsers.map((user) => (
                              <div
                                key={user.id}
                                className="activeAccount"
                                style={{
                                  justifyContent: "space-between",
                                  padding: "8px 12px",
                                  marginBottom: "6px",
                                  borderRadius: "8px",
                                  backgroundColor: "var(--pageBackground)",
                                  opacity:
                                    unsubscribingId === user.id ? 0.5 : 1,
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                  }}
                                >
                                  {user.photoLink ? (
                                    <img
                                      style={{
                                        borderRadius: "50%",
                                        height: "32px",
                                        width: "32px",
                                        objectFit: "cover",
                                      }}
                                      src={user.photoLink}
                                      title={user.name || "User"}
                                    />
                                  ) : (
                                    <UserAvatar />
                                  )}
                                  <div>
                                    <div
                                      style={{
                                        fontWeight: "500",
                                        fontSize: "14px",
                                      }}
                                    >
                                      {user.name || "Unknown User"}
                                    </div>
                                    <div
                                      className="softText"
                                      style={{ fontSize: "11px" }}
                                    >
                                      {user.id.slice(0, 16)}...
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleUnsubscribe(user.id)}
                                  disabled={unsubscribingId === user.id}
                                  style={{
                                    background: "transparent",
                                    border: "1px solid #e0e0e0",
                                    borderRadius: "6px",
                                    cursor:
                                      unsubscribingId === user.id
                                        ? "wait"
                                        : "pointer",
                                    padding: "4px 8px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                  title="Unsubscribe"
                                >
                                  <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: "16px", color: "#666" }}
                                  >
                                    {unsubscribingId === user.id
                                      ? "hourglass_empty"
                                      : "person_remove"}
                                  </span>
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div
                            style={{ justifyContent: "center" }}
                            className="activeAccount"
                          >
                            <div className="softText">
                              You haven't subscribed to anyone yet.
                            </div>
                          </div>
                        )}

                        {/* Subscribe Form */}
                        <div
                          style={{
                            justifyContent: "center",
                            marginTop: "12px",
                          }}
                          className="activeAccount"
                        >
                          {!subscribe ? (
                            <button
                              onClick={() => setSubscribe(true)}
                              className="create-profile-btn"
                            >
                              + Add Subscription
                            </button>
                          ) : (
                            <div style={{ width: "100%" }}>
                              <div
                                style={{ marginBottom: "8px" }}
                                className="blackText"
                              >
                                Enter User ID
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                }}
                              >
                                <input
                                  style={{ height: "32px", flex: 1 }}
                                  placeholder="Enter user ID..."
                                  className="selectInput"
                                  value={searchFor}
                                  disabled={subscribing}
                                  onChange={(e) => setSearchFor(e.target.value)}
                                />
                                <button
                                  disabled={subscribing || !searchFor}
                                  onClick={async () => {
                                    if (searchFor) {
                                      setSubscribing(true);
                                      // Fetch user details before subscribing
                                      const userDataResult = await os.getData(
                                        tags.key,
                                        searchFor
                                      );
                                      const userData = userDataResult.success
                                        ? userDataResult.data
                                        : null;
                                      const userDetails = {
                                        id: searchFor,
                                        name: userData?.name,
                                        photoLink: userData?.photoLink,
                                      };
                                      await subscribeToUsers([userDetails]);
                                      setSearchFor("");
                                      setSubscribe(false);
                                      setSubscribing(false);
                                      getSubs();
                                    }
                                  }}
                                  style={{
                                    borderRadius: "8px",
                                    padding: "8px 12px",
                                    cursor: subscribing ? "wait" : "pointer",
                                    opacity:
                                      subscribing || !searchFor ? 0.6 : 1,
                                  }}
                                  className="create-profile-btn"
                                >
                                  <span className="material-symbols-outlined">
                                    {subscribing
                                      ? "hourglass_empty"
                                      : "person_add"}
                                  </span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // 4) Language selector
                  if (item.type === "language") {
                    if (hidden && !editMode) return null;
                    return (
                      <div
                        key={item.key}
                        className={`settings-item-container ${
                          hidden ? "hidden-item" : ""
                        }`}
                      >
                        <div className="settings-item-wrapper">
                          {editMode && (
                            <button
                              className="hide-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleVisibility(item.key);
                              }}
                              title={hidden ? "Show item" : "Hide item"}
                            >
                              <span className="material-symbols-outlined">
                                {hidden ? "visibility" : "visibility_off"}
                              </span>
                            </button>
                          )}

                          <div
                            className={`settings-item ${hidden ? "hidden" : ""}`}
                            style={{ justifyContent: "space-between" }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                              }}
                            >
                              <div className="item-icon">
                                <span className="material-symbols-outlined">
                                  {item.icon}
                                </span>
                              </div>
                              <div className="item-text">{label}</div>
                            </div>
                            <select
                              value={language}
                              onChange={(e) => changeLanguage(e.target.value)}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "6px",
                                border: "1px solid #ddd",
                                backgroundColor: "var(--pageBackground)",
                                color: "var(--text1)",
                                fontSize: "14px",
                                cursor: "pointer",
                                outline: "none",
                              }}
                            >
                              {availableLanguages.map((lang) => (
                                <option key={lang.code} value={lang.code}>
                                  {lang.nativeName}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 5) regular clickable rows
                  if (hidden && !editMode) return null;
                  return (
                    <div
                      key={item.key}
                      className={`settings-item-container ${
                        hidden ? "hidden-item" : ""
                      }`}
                    >
                      <div className="settings-item-wrapper">
                        {editMode && (
                          <button
                            className="hide-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleVisibility(item.key);
                            }}
                            title={hidden ? "Show item" : "Hide item"}
                          >
                            <span className="material-symbols-outlined">
                              {hidden ? "visibility" : "visibility_off"}
                            </span>
                          </button>
                        )}

                        <div
                          onClick={item.onClick}
                          className={`settings-item ${item.style || ""} ${
                            hidden ? "hidden" : ""
                          }`}
                        >
                          <div className="item-icon">
                            <span className="material-symbols-outlined">
                              {item.icon}
                            </span>
                          </div>
                          <div
                            className={`item-text ${
                              item.style === "disabled" ? "disabled" : ""
                            }`}
                          >
                            {editMode && editingLabel === item.key ? (
                              <input
                                type="text"
                                value={label}
                                onChange={(e) =>
                                  handleLabelEdit(item.key, "", e.target.value)
                                }
                                onBlur={finishEditingLabel}
                                onKeyPress={(e) =>
                                  e.key === "Enter" && finishEditingLabel()
                                }
                                className="label-edit-input"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <span
                                onClick={
                                  editMode
                                    ? (e) => {
                                        e.stopPropagation();
                                        startEditingLabel(item.key);
                                      }
                                    : undefined
                                }
                                className={editMode ? "editable-label" : ""}
                              >
                                {label}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          <div style={{ height: "80px" }}></div>
        </div>
      ) : null}
      <style>{`
                ${getStyleOf("settings.css")}
                
                /* Additional styles for edit mode */
                .edit-mode-button {
                    background: transparent;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    padding: 4px 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    transition: all 0.2s;
                }
                
                .edit-mode-button:hover {
                    background: #f5f5f5;
                }
                
                .edit-mode-button.active {
                    background: #4459F3;
                    color: white;
                    border-color: #4459F3;
                }
                
                .settings-item-container {
                    position: relative;
                }
                
                .settings-item-wrapper {
                    display: flex;
                    align-items: center;
                    position: relative;
                }
                
                .hide-button {
                    position: absolute;
                    right: 8px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    padding: 2px;
                    border-radius: 3px;
                    z-index: 10;
                    opacity: 0.6;
                    transition: opacity 0.2s;
                    scale:0.8;
                }
                
                .hide-button:hover {
                    opacity: 1;
                    background: #f0f0f0;
                }
                
                .hidden-item {
                    opacity: 0.5;
                }
                
                .hidden-item .settings-item {
                    background: rgba(255, 0, 0, 0.05);
                }
                
                .label-edit-input {
                    background: white;
                    border: 1px solid #4459F3;
                    border-radius: 3px;
                    padding: 2px 6px;
                    font-size: inherit;
                    font-family: inherit;
                    width: 100%;
                    min-width: 120px;
                }
                
                .editable-label {
                    cursor: pointer;
                    padding: 2px;
                    border-radius: 3px;
                    transition: background 0.2s;
                }
                
                .editable-label:hover {
                    background: rgba(68, 89, 243, 0.1);
                }
                
                .sub-settings-list .settings-item-wrapper {
                    padding-left: 20px;
                }
                
                /* Space content specific styles */
                .space-content-item {
                    position: relative;
                    margin-top: 10px;

                }
                
                .space-content-hide {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    z-index: 10;
                }
                
                .space-name-container {
                     position: relative;
                    display: inline-block;
                    margin-top: -15px;
                    margin-left: -17px;
                }
                
                .space-name-hide {
                    position: absolute;
                    top: -8px;
                    right: -24px;
                }
                
                .space-description-edit {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #4459F3;
                    border-radius: 6px;
                    font-family: inherit;
                    font-size: inherit;
                    line-height: 1.4;
                    resize: vertical;
                }
                
                .editable-text {
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    transition: background 0.2s;
                }
                
                .editable-text:hover {
                    background: rgba(68, 89, 243, 0.1);
                }
            `}</style>
    </div>
  );
};

export default SettingsSidebar;
