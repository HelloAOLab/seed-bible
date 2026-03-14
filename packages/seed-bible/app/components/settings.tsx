const { useState, useEffect, createContext, useContext } = os.appHooks;
import { getStyleOf } from "app.styles.styler";
import { getSettingsPreset } from "app.components.types";
import { useSideBarContext } from "app.hooks.sideBar";
import { useTabsContext } from "app.hooks.tabs";
import { useBibleContext } from "app.hooks.bibleVariables";
import { useHoldAction } from "app.hooks.useHold";
import {
  Space,
  LoadSpace,
  UserAvatar,
  MenuIcon,
  ThemeIcon,
  BibleIcon,
  NewSettingsIcon,
  ExtensionsIcon,
  SelectionUIIcon,
} from "app.components.icons";
import {
  TreeIcon,
  LogIcon,
  LeafIcon,
  CatIcon,
  DogIcon,
  CoffeBeanIcon,
} from "app.components.phosphoricons";
import { SpaceSelector } from "app.components.spaceSettings";
import {
  getSubscribedUsers,
  subscribeToUsers,
  unsubscribeFromUsers,
} from "db.annotations.library";

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS CONTEXT - Shared state for all setting components
// ═══════════════════════════════════════════════════════════════════════════════
const SettingsContext = createContext(null);

export const useSettingsContext = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx)
    throw new Error("useSettingsContext must be used within SettingsProvider");
  return ctx;
};

// ═══════════════════════════════════════════════════════════════════════════════
// SETTING ITEM WRAPPER - Common wrapper for all setting items
// ═══════════════════════════════════════════════════════════════════════════════
const SettingItemWrapper = ({
  itemKey,
  parentKey,
  children,
  className = "",
}) => {
  const { editMode, visibility, toggleVisibility } = useSettingsContext();
  const fullKey = parentKey ? `${parentKey}.${itemKey}` : itemKey;
  const isHidden = visibility[fullKey] === false;

  if (isHidden && !editMode) return null;

  return (
    <div
      className={`settings-item-container ${isHidden ? "hidden-item" : ""} ${className}`}
    >
      <div className="settings-item-wrapper">
        {editMode && (
          <button
            className="hide-button"
            onClick={(e) => {
              e.stopPropagation();
              toggleVisibility(fullKey);
            }}
            title={
              isHidden
                ? (globalThis as any).t?.("showItem") || "Show item"
                : (globalThis as any).t?.("hideItem") || "Hide item"
            }
          >
            <span className="material-symbols-outlined">
              {isHidden ? "visibility" : "visibility_off"}
            </span>
          </button>
        )}
        {children}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// INDIVIDUAL SETTING COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// ---------- Basic Clickable Row ----------
export const SettingRow = ({
  itemKey,
  labelKey,
  icon,
  onClick,
  style = "",
  parentKey,
}) => {
  const {
    t,
    editMode,
    labels,
    editingLabel,
    startEditingLabel,
    finishEditingLabel,
    handleLabelEdit,
  } = useSettingsContext();
  const fullKey = parentKey ? `${parentKey}.${itemKey}` : itemKey;
  const label = labels[fullKey] || t(labelKey);

  return (
    <SettingItemWrapper itemKey={itemKey} parentKey={parentKey}>
      <div onClick={onClick} className={`settings-item ${style}`}>
        <div className="item-icon">
          {typeof icon === "string" ? (
            <span className="material-symbols-outlined">{icon}</span>
          ) : (
            icon
          )}
        </div>
        <div className={`item-text ${style === "disabled" ? "disabled" : ""}`}>
          {editMode && editingLabel === fullKey ? (
            <input
              type="text"
              value={label}
              onChange={(e) => handleLabelEdit(fullKey, e.target.value)}
              onBlur={finishEditingLabel}
              onKeyPress={(e) => e.key === "Enter" && finishEditingLabel()}
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
                      startEditingLabel(fullKey);
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
    </SettingItemWrapper>
  );
};

// ---------- Expandable Section ----------
export const SettingExpandable = ({
  itemKey,
  labelKey,
  icon,
  children,
  parentKey,
}) => {
  const {
    t,
    editMode,
    labels,
    editingLabel,
    startEditingLabel,
    finishEditingLabel,
    handleLabelEdit,
    expandedSections,
    toggleSection,
  } = useSettingsContext();
  const fullKey = parentKey ? `${parentKey}.${itemKey}` : itemKey;
  const label = labels[fullKey] || t(labelKey);
  const isExpanded = expandedSections[itemKey];

  return (
    <SettingItemWrapper itemKey={itemKey} parentKey={parentKey}>
      <div className="expandable-container" style={{ width: "100%" }}>
        <div className="settings-item" onClick={() => toggleSection(itemKey)}>
          <div className="item-icon">
            {typeof icon === "string" ? (
              <span className="material-symbols-outlined">{icon}</span>
            ) : (
              icon
            )}
          </div>
          <div className="item-text">
            {editMode && editingLabel === fullKey ? (
              <input
                type="text"
                value={label}
                onChange={(e) => handleLabelEdit(fullKey, e.target.value)}
                onBlur={finishEditingLabel}
                onKeyPress={(e) => e.key === "Enter" && finishEditingLabel()}
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
                        startEditingLabel(fullKey);
                      }
                    : undefined
                }
                className={editMode ? "editable-label" : ""}
              >
                {label}
              </span>
            )}
          </div>
          <div className="item-chevron">
            <span className="material-symbols-outlined">
              {isExpanded ? "expand_less" : "expand_more"}
            </span>
          </div>
        </div>
        {isExpanded && <div className="sub-settings-list">{children}</div>}
      </div>
    </SettingItemWrapper>
  );
};

// ---------- Divider ----------
export const SettingDivider = () => (
  <div className="settings-divider">
    <div className="sidebarLine"></div>
  </div>
);

// ---------- Header ----------
export const SettingHeader = ({ itemKey, labelKey }) => {
  const {
    t,
    editMode,
    labels,
    editingLabel,
    startEditingLabel,
    finishEditingLabel,
    handleLabelEdit,
    visibility,
    toggleVisibility,
  } = useSettingsContext();
  const label = labels[itemKey] || t(labelKey);
  const isHidden = visibility[itemKey] === false;

  if (isHidden && !editMode) return null;

  return (
    <div
      className={`space-details ${isHidden ? "hidden-item" : ""}`}
      style={{ position: "relative" }}
    >
      {editMode && (
        <button
          className="hide-button"
          onClick={() => toggleVisibility(itemKey)}
        >
          <span className="material-symbols-outlined">
            {isHidden ? "visibility" : "visibility_off"}
          </span>
        </button>
      )}
      <div className="space-name">
        {editMode && editingLabel === itemKey ? (
          <input
            type="text"
            value={label}
            onChange={(e) => handleLabelEdit(itemKey, e.target.value)}
            onBlur={finishEditingLabel}
            onKeyPress={(e) => e.key === "Enter" && finishEditingLabel()}
            className="label-edit-input"
            autoFocus
          />
        ) : (
          <span
            onClick={editMode ? () => startEditingLabel(itemKey) : undefined}
            className={editMode ? "editable-label" : ""}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
};

// ---------- Description ----------
export const SettingDescription = ({ itemKey, labelKey }) => {
  const {
    t,
    editMode,
    labels,
    editingLabel,
    startEditingLabel,
    finishEditingLabel,
    handleLabelEdit,
    visibility,
    toggleVisibility,
  } = useSettingsContext();
  const label = labels[itemKey] || t(labelKey);
  const isHidden = visibility[itemKey] === false;

  if (isHidden && !editMode) return null;

  return (
    <div
      className={`space-description ${isHidden ? "hidden-item" : ""}`}
      style={{ position: "relative" }}
    >
      {editMode && (
        <button
          className="hide-button"
          onClick={() => toggleVisibility(itemKey)}
        >
          <span className="material-symbols-outlined">
            {isHidden ? "visibility" : "visibility_off"}
          </span>
        </button>
      )}
      {editMode && editingLabel === itemKey ? (
        <textarea
          value={label}
          onChange={(e) => handleLabelEdit(itemKey, e.target.value)}
          onBlur={finishEditingLabel}
          className="space-description-edit"
          autoFocus
          rows="2"
        />
      ) : (
        <div
          onClick={editMode ? () => startEditingLabel(itemKey) : undefined}
          className={editMode ? "editable-text" : ""}
        >
          {label}
        </div>
      )}
    </div>
  );
};

// ---------- Theme Setting ----------
export const ThemeSetting = ({
  itemKey = "theme",
  labelKey = "themeAndText",
}) => {
  const { setSideBarMode } = useSideBarContext();
  return (
    <SettingRow
      itemKey={itemKey}
      labelKey={labelKey}
      icon={<ThemeIcon />}
      onClick={() => setSideBarMode("themeSettings")}
    />
  );
};

// ---------- Extensions Setting ----------
export const ExtensionsSetting = ({
  itemKey = "extensions",
  labelKey = "configureExtensions",
}) => {
  const { setSideBarMode } = useSideBarContext();
  return (
    <SettingRow
      itemKey={itemKey}
      labelKey={labelKey}
      icon={<ExtensionsIcon />}
      onClick={() => setSideBarMode("extensions")}
    />
  );
};

// ---------- Bible Defaults ----------
export const BibleDefaultsSetting = ({
  itemKey = "bibleDefaults",
  labelKey = "bibleDefaults",
}) => {
  return (
    <SettingExpandable
      itemKey={itemKey}
      labelKey={labelKey}
      icon={<BibleIcon />}
    >
      <BookOrderSetting />
    </SettingExpandable>
  );
};

const BookOrderSetting = () => {
  const [selectedOrientation, setSelectedOrientation] = useState(
    tags?.bookOrientation || "traditional"
  );

  const options = [
    {
      value: "tanak",
      title: "TaNak order",
      desc: "The original, unified, three-part ordering of the Hebrew Bible",
    },
    {
      value: "traditional",
      title: "Traditional order",
      desc: "The ordering found in most modern Christian Bibles",
    },
  ];

  return (
    <div
      onContextMenu={(e) => e.stopPropagation()}
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "5px",
        color: "var(--text1)",
      }}
    >
      {options.map((opt, i) => (
        <div key={opt.value}>
          {i > 0 && <div className="settings-divider"></div>}
          <div
            className="settings-item-container"
            style={{ display: "flex", alignItems: "center" }}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setSelectedOrientation(opt.value);
              setTagMask(thisBot, "bookOrientation", opt.value, "local");
              shout("onBookOrientationChanged", { orientation: opt.value });
            }}
          >
            <div style={{ width: "90%", fontSize: "14px" }}>
              <b>
                <span>{opt.title}</span>
              </b>
              <p>{opt.desc}</p>
            </div>
            <div
              style={{
                width: "15px",
                height: "15px",
                backgroundColor:
                  selectedOrientation === opt.value
                    ? "var(--secondaryButton)"
                    : "gray",
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
      ))}
    </div>
  );
};

// ---------- Advanced Settings ----------
export const AdvancedSettingsSetting = ({
  itemKey = "pageSettings",
  labelKey = "advancedSettings",
}) => {
  const { setSideBarMode } = useSideBarContext();

  const subItems = [
    {
      key: "instant_mix",
      labelKey: "editor",
      icon: "instant_mix",
      onClick: () => setSideBarMode("editorToolbarSettings"),
    },
    {
      key: "selectionUI",
      labelKey: "selectionUI",
      icon: <SelectionUIIcon />,
      onClick: () => setSideBarMode("selectionUISettings"),
    },
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
  ];

  return (
    <SettingExpandable
      itemKey={itemKey}
      labelKey={labelKey}
      icon={<NewSettingsIcon />}
    >
      {subItems.map((sub) => (
        <SettingRow
          key={sub.key}
          itemKey={sub.key}
          labelKey={sub.labelKey}
          icon={sub.icon}
          onClick={sub.onClick}
          parentKey={itemKey}
        />
      ))}
    </SettingExpandable>
  );
};

// ---------- Load Space ----------
export const LoadSpaceSetting = ({
  itemKey = "loadSpace",
  labelKey = "loadNewSpace",
}) => {
  const { spaces, activeSpace, replaceActiveSpaceWithJSON } = useTabsContext();
  const CurrentSpace = spaces.find((e) => e.id === activeSpace);

  return (
    <SettingRow
      itemKey={itemKey}
      labelKey={labelKey}
      icon={<LoadSpace />}
      onClick={async () => {
        const files = await os.showUploadFiles();
        if (files.length !== 0)
          replaceActiveSpaceWithJSON(files[0], CurrentSpace.id);
      }}
    />
  );
};

// ---------- Share Setting ----------
export const ShareSetting = ({ itemKey = "share", labelKey = "share" }) => {
  return (
    <SettingRow
      itemKey={itemKey}
      labelKey={labelKey}
      icon="share"
      onClick={() => {}}
    />
  );
};

// ---------- Space Icon & Name ----------
export const SpaceIconSetting = ({ itemKey = "spaceIcon" }) => {
  const {
    editMode,
    visibility,
    toggleVisibility,
    openPopupSettings,
    customIcon,
    setCustomIcon,
  } = useSettingsContext();
  const { spaces, activeSpace, updateSpace } = useTabsContext();
  const CurrentSpace = spaces.find((e) => e.id === activeSpace);
  const [editSpaceName, setEditSpaceName] = useState(false);
  const [spaceName, setSpaceName] = useState(CurrentSpace?.name || "");

  const { eventHandlers, shouldSuppressClick } = useHoldAction(async () => {
    const url = await os.showInput(null, { placeholder: "Enter Url" });
    // setUserURL(url);
  }, 1000);

  useEffect(() => {
    if (CurrentSpace) setSpaceName(CurrentSpace.name);
  }, [activeSpace]);
  useEffect(() => {
    updateSpace(activeSpace, { name: spaceName });
  }, [spaceName]);

  const isHidden = visibility[itemKey] === false;
  const isNameHidden = visibility["spaceName"] === false;

  if (isHidden && !editMode) return null;

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
          const link = await os.showInput(null, { title: "Add link" });
          if (link) setCustomIcon((prev) => ({ ...prev, link }));
        },
      },
      {
        disabled: !customIcon,
        icon: <MenuIcon name="hide_image" />,
        title: "Remove icon",
        onClick: () => setCustomIcon(null),
      },
    ],
  };

  return (
    <div className={`space-content-item ${isHidden ? "hidden-item" : ""}`}>
      {editMode && (
        <button
          className="hide-button space-content-hide"
          onClick={() => toggleVisibility(itemKey)}
        >
          <span className="material-symbols-outlined">
            {isHidden ? "visibility" : "visibility_off"}
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
          <div style={{ pointerEvents: "none" }}>
            {CurrentSpace?.icon || (
              <div className="activeBg">
                <span></span>
              </div>
            )}
          </div>
        </div>
        {(isNameHidden === false || editMode) && (
          <div
            onContextMenu={(e) => openPopupSettings(SpaceIconOptions)}
            className="space-name-container"
          >
            {editMode && (
              <button
                className="hide-button space-name-hide"
                onClick={() => toggleVisibility("spaceName")}
              >
                <span className="material-symbols-outlined">
                  {isNameHidden ? "visibility" : "visibility_off"}
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
                {CurrentSpace?.name}
              </div>
            ) : (
              <input
                onBlur={() => setEditSpaceName(false)}
                style={{ height: "35px", width: "220px" }}
                value={spaceName}
                onChange={(e) =>
                  e.target.value !== "" && setSpaceName(e.target.value)
                }
                className="input-field number selectInput"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ---------- Space Description ----------
export const SpaceDescriptionSetting = ({ itemKey = "spaceDescription" }) => {
  const {
    editMode,
    visibility,
    toggleVisibility,
    editingLabel,
    startEditingLabel,
    finishEditingLabel,
  } = useSettingsContext();
  const [description, setDescription] = useState(
    "Settings for your space. Customise toolbar, theme and add extensions."
  );
  const isHidden = visibility[itemKey] === false;

  if (isHidden && !editMode) return null;

  return (
    <div className={`space-content-item ${isHidden ? "hidden-item" : ""}`}>
      {editMode && (
        <button
          className="hide-button space-content-hide"
          onClick={() => toggleVisibility(itemKey)}
        >
          <span className="material-symbols-outlined">
            {isHidden ? "visibility" : "visibility_off"}
          </span>
        </button>
      )}
      <div className="space-description">
        {editMode && editingLabel === itemKey ? (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={finishEditingLabel}
            className="space-description-edit"
            autoFocus
            rows="3"
          />
        ) : (
          <div
            onClick={editMode ? () => startEditingLabel(itemKey) : undefined}
            className={editMode ? "editable-text" : ""}
          >
            {description}
          </div>
        )}
      </div>
    </div>
  );
};

// ---------- Account Section ----------
export const AccountSetting = ({
  itemKey = "yourAccount",
  labelKey = "yourAccount",
}) => {
  const {
    t,
    editMode,
    labels,
    editingLabel,
    startEditingLabel,
    finishEditingLabel,
    handleLabelEdit,
    visibility,
    toggleVisibility,
  } = useSettingsContext();
  const { setSideBarMode } = useSideBarContext();
  const [userData, setUserData] = useState(null);
  const label = labels[itemKey] || t(labelKey);
  const isHidden = visibility[itemKey] === false;

  const icons = [TreeIcon, LogIcon, LeafIcon, CatIcon, DogIcon, CoffeBeanIcon];
  const colors = [
    "#34D399",
    "#60A5FA",
    "#F472B6",
    "#FBBF24",
    "#A78BFA",
    "#F87171",
    "#10B981",
    "#F59E0B",
  ];

  useEffect(() => {
    const getUserData = async () => {
      if (!authBot?.id) return;
      const data = await os.getData(tags.key, authBot.id);
      if (data.success) {
        setUserData(data.data);
        globalThis.SetGlobalProfilePic(data.data?.photoLink);
      }
    };
    getUserData();
  }, []);

  if (isHidden && !editMode) return null;

  const isAnonymous =
    tags?.settingsConfigs?.presets?.[getSettingsPreset()]?.onlineUsers
      ?.anonymous;
  let colorIndex = 0;
  let iconIndex = 0;

  if (isAnonymous && (globalThis as any).GetOrSetVisualInTags) {
    const visual = (globalThis as any).GetOrSetVisualInTags(
      configBot.id,
      userData
    );
    colorIndex = visual.colorIndex;
    iconIndex = visual.iconIndex;
  }

  const Icon = icons[iconIndex];

  return (
    <div
      className={`activeAccount ${isHidden ? "hidden-item" : ""}`}
      style={{ position: "relative" }}
    >
      {editMode && (
        <button
          className="hide-button"
          onClick={() => toggleVisibility(itemKey)}
        >
          <span className="material-symbols-outlined">
            {isHidden ? "visibility" : "visibility_off"}
          </span>
        </button>
      )}
      {isAnonymous ? (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: `2px solid ${!configBot.tags.staticInst ? colors[colorIndex] : "var(--selectedSpaceColor)"}`,
            padding: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            backgroundColor: "white",
          }}
        >
          {!configBot.tags.staticInst && userData?.photoLink ? (
            <img
              style={{ "border-radius": "50%", width: "35px", border: "" }}
              src={userData?.photoLink}
            />
          ) : !configBot.tags.staticInst ? (
            <Icon width={15} height={15} />
          ) : (
            <span className="material-symbols-outlined">person</span>
          )}
        </div>
      ) : userData?.photoLink ? (
        <img
          style={{
            borderRadius: "50%",
            height: "40px",
            width: "40px",
            border: "1px solid var(--spaceSelection)",
          }}
          src={userData.photoLink}
        />
      ) : (
        <UserAvatar />
      )}
      <div className="softText">
        {isAnonymous ? (
          <div>
            <div
              style={{
                fontWeight: "600",
                fontSize: "14px",
                marginBottom: "2px",
              }}
            >
              Anonymous
            </div>
            <div style={{ fontSize: "12px", color: "#9ca3af" }}>
              ID:{configBot.id.slice(0, 12)}
            </div>
          </div>
        ) : editMode && editingLabel === itemKey ? (
          <input
            type="text"
            value={label}
            onChange={(e) =>
              handleLabelEdit(itemKey, (e.target as HTMLInputElement).value)
            }
            onBlur={finishEditingLabel}
            onKeyPress={(e) => e.key === "Enter" && finishEditingLabel()}
            className="label-edit-input"
            autoFocus
          />
        ) : (
          <span
            onClick={editMode ? () => startEditingLabel(itemKey) : undefined}
            className={editMode ? "editable-label" : ""}
          >
            {label}
          </span>
        )}
      </div>
      {!isAnonymous && !userData && (
        <div style={{ justifyContent: "center" }} className="activeAccount">
          <button
            onClick={() => {
              globalThis.AccountSettingsEnteredFrom = "settings";
              setSideBarMode("createAccountSettings");
            }}
            className="create-profile-btn"
          >
            {userData ? "Open account settings" : " + Create profile"}
          </button>
        </div>
      )}
    </div>
  );
};

// ---------- Account Settings Row ----------
export const AccountSettingsSetting = ({
  itemKey = "accountSettings",
  labelKey = "accountSettings",
}) => {
  const { setSideBarMode } = useSideBarContext();
  return (
    <SettingRow
      itemKey={itemKey}
      labelKey={labelKey}
      icon="manage_accounts"
      onClick={() => {
        globalThis.AccountSettingsEnteredFrom = "settings";
        setSideBarMode("createAccountSettings");
      }}
    />
  );
};

// ---------- Billing ----------
export const BillingSetting = ({
  itemKey = "billing",
  labelKey = "billingServices",
}) => {
  return (
    <SettingRow
      itemKey={itemKey}
      labelKey={labelKey}
      icon="rule_settings"
      style="disabled"
    />
  );
};

// ---------- Permissions ----------
export const PermissionsSetting = ({
  itemKey = "permissions",
  labelKey = "permissions",
}) => {
  return (
    <SettingRow
      itemKey={itemKey}
      labelKey={labelKey}
      icon="action_key"
      style="disabled"
    />
  );
};

// ---------- Notifications ----------
export const NotificationsSetting = ({
  itemKey = "notifications",
  labelKey = "notifications",
}) => {
  return (
    <SettingRow
      itemKey={itemKey}
      labelKey={labelKey}
      icon="notification_settings"
      style="disabled"
    />
  );
};

// ---------- Keep Screen Awake ----------
export const KeepScreenAwakeSetting = ({
  itemKey = "keepScreenAwake",
  labelKey = "keepScreenAwake",
}) => {
  const { t, editMode, labels, visibility } = useSettingsContext();
  const label = labels[itemKey] || t(labelKey);
  const isHidden = visibility[itemKey] === false;
  const [isActive, setIsActive] = useState(false);

  const toggle = async () => {
    if (isActive) {
      try {
        await os.disableWakeLock();
        setIsActive(false);
      } catch (err) {
        os.toast(
          "Could not disable keep awake: " +
            (err instanceof Error ? err.message : "")
        );
      }
    } else {
      try {
        await os.requestWakeLock();
        setIsActive(true);
      } catch (err) {
        os.toast(
          "Could not enable keep awake: " +
            (err instanceof Error ? err.message : "")
        );
      }
    }
  };

  if (isHidden && !editMode) return null;

  return (
    <SettingItemWrapper itemKey={itemKey}>
      <div
        className="settings-item"
        style={{ justifyContent: "space-between" }}
        onClick={toggle}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div className="item-icon">
            <span className="material-symbols-outlined">light_mode</span>
          </div>
          <div className="item-text">{label}</div>
        </div>
        <div className={`settings-toggle ${isActive ? "active" : ""}`}>
          <div className="settings-toggle-knob" />
        </div>
      </div>
    </SettingItemWrapper>
  );
};

// ---------- Report a Bug ----------
export const ReportBugSetting = ({
  itemKey = "reportBug",
  labelKey = "reportBug",
}) => {
  return (
    <SettingRow
      itemKey={itemKey}
      labelKey={labelKey}
      icon="bug_report"
      onClick={() => os.openURL("https://forms.gle/mhtqbQd6VPW8ZDh2A")}
    />
  );
};

// ---------- Help ----------
export const HelpSetting = ({ itemKey = "help", labelKey = "help" }) => {
  const { t, editMode, labels, visibility } = useSettingsContext();
  const label = labels[itemKey] || t(labelKey);
  const isHidden = visibility[itemKey] === false;

  if (isHidden && !editMode) return null;

  return (
    <SettingItemWrapper itemKey={itemKey}>
      <div className="settings-item">
        <div className="item-icon">
          <span className="material-symbols-outlined">help</span>
        </div>
        <div className="item-text">{label}</div>
        <span className="material-symbols-outlined item-chevron">
          chevron_right
        </span>
      </div>
    </SettingItemWrapper>
  );
};

// ---------- Subscriptions Section ----------
export const SubscriptionsSetting = ({
  itemKey = "subscriptions",
  labelKey = "subscriptions",
}) => {
  const {
    t,
    editMode,
    labels,
    editingLabel,
    startEditingLabel,
    finishEditingLabel,
    handleLabelEdit,
    visibility,
    toggleVisibility,
  } = useSettingsContext();
  const [subscribedUsers, setSubscribedUsers] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [unsubscribingId, setUnsubscribingId] = useState(null);
  const [subscribe, setSubscribe] = useState(false);
  const [searchFor, setSearchFor] = useState("");
  const label = labels[itemKey] || t(labelKey);
  const isHidden = visibility[itemKey] === false;

  const getSubs = async () => {
    setLoadingSubs(true);
    const subs = await getSubscribedUsers();
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

  if (isHidden && !editMode) return null;

  return (
    <div
      className={`general-section ${isHidden ? "hidden-item" : ""}`}
      style={{ position: "relative" }}
    >
      {editMode && (
        <button
          className="hide-button"
          onClick={() => toggleVisibility(itemKey)}
        >
          <span className="material-symbols-outlined">
            {isHidden ? "visibility" : "visibility_off"}
          </span>
        </button>
      )}
      <div className="activeAccount" style={{ gap: "8px" }}>
        <MenuIcon name="bookmark_check" />
        <div className="softText">
          {editMode && editingLabel === itemKey ? (
            <input
              type="text"
              value={label}
              onChange={(e) => handleLabelEdit(itemKey, e.target.value)}
              onBlur={finishEditingLabel}
              onKeyPress={(e) => e.key === "Enter" && finishEditingLabel()}
              className="label-edit-input"
              autoFocus
            />
          ) : (
            <span
              onClick={editMode ? () => startEditingLabel(itemKey) : undefined}
              className={editMode ? "editable-label" : ""}
            >
              {label}
            </span>
          )}
        </div>
      </div>

      {loadingSubs ? (
        <div
          style={{ justifyContent: "center", padding: "20px" }}
          className="activeAccount"
        >
          <div className="softText">Loading...</div>
        </div>
      ) : subscribedUsers.length > 0 ? (
        <div style={{ width: "100%" }}>
          <div
            className="softText"
            style={{ marginBottom: "8px", textAlign: "center" }}
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
                opacity: unsubscribingId === user.id ? 0.5 : 1,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
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
                  />
                ) : (
                  <UserAvatar />
                )}
                <div>
                  <div style={{ fontWeight: "500", fontSize: "14px" }}>
                    {user.name || "Unknown User"}
                  </div>
                  <div className="softText" style={{ fontSize: "11px" }}>
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
                  cursor: unsubscribingId === user.id ? "wait" : "pointer",
                  padding: "4px 8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
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
        <div style={{ justifyContent: "center" }} className="activeAccount">
          <div className="softText">
            {(globalThis as any).t?.("noSubscriptionsYet") ||
              "You haven't subscribed to anyone yet."}
          </div>
        </div>
      )}

      <div
        style={{ justifyContent: "center", marginTop: "12px" }}
        className="activeAccount"
      >
        {!subscribe ? (
          <button
            onClick={() => setSubscribe(true)}
            className="create-profile-btn"
          >
            {(globalThis as any).t?.("addSubscription") || "+ Add Subscription"}
          </button>
        ) : (
          <div style={{ width: "100%" }}>
            <div style={{ marginBottom: "8px" }} className="blackText">
              {(globalThis as any).t?.("enterUserId") || "Enter User ID"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                style={{ height: "32px", flex: 1 }}
                placeholder={
                  (globalThis as any).t?.("enterUserIdPlaceholder") ||
                  "Enter user ID..."
                }
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
                    const userDataResult = await os.getData(
                      tags.key,
                      searchFor
                    );
                    const userData = userDataResult.success
                      ? userDataResult.data
                      : null;
                    await subscribeToUsers([
                      {
                        id: searchFor,
                        name: userData?.name,
                        photoLink: userData?.photoLink,
                      },
                    ]);
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
                  opacity: subscribing || !searchFor ? 0.6 : 1,
                }}
                className="create-profile-btn"
              >
                <span className="material-symbols-outlined">
                  {subscribing ? "hourglass_empty" : "person_add"}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------- Language Selector ----------
const LANG_META: Record<string, { cc: string; display: string }> = {
  am: { cc: "et", display: "Amharic" },
  ar: { cc: "sa", display: "Arabic" },
  bn: { cc: "bd", display: "Bengali" },
  zh: { cc: "cn", display: "Chinese" },
  en: { cc: "us", display: "English - US" },
  fr: { cc: "fr", display: "French" },
  hi: { cc: "in", display: "Hindi" },
  iid: { cc: "id", display: "Indonesian" },
  ja: { cc: "jp", display: "Japanese" },
  ko: { cc: "kr", display: "Korean" },
  mn: { cc: "mn", display: "Mongolian" },
  ne: { cc: "np", display: "Nepali" },
  ps: { cc: "af", display: "Pashto" },
  fa: { cc: "ir", display: "Persian" },
  pt: { cc: "br", display: "Portuguese" },
  ru: { cc: "ru", display: "Russian" },
  es: { cc: "es", display: "Spanish" },
  sw: { cc: "tz", display: "Swahili" },
  ti: { cc: "er", display: "Tigrinya" },
  tr: { cc: "tr", display: "Turkish" },
  uk: { cc: "ua", display: "Ukrainian" },
  ur: { cc: "pk", display: "Urdu" },
  ug: { cc: "cn", display: "Uyghur" },
  vi: { cc: "vn", display: "Vietnamese" },
};

const FlagImg = ({ cc }: { cc: string }) => (
  <img
    src={`https://flagcdn.com/w40/${cc}.png`}
    alt=""
    style={{
      width: "22px",
      height: "22px",
      borderRadius: "50%",
      objectFit: "cover",
      flexShrink: 0,
    }}
  />
);

export const LanguageSetting = ({
  itemKey = "language",
  labelKey = "language",
}) => {
  const {
    t,
    editMode,
    labels,
    visibility,
    availableLanguages,
    language,
    changeLanguage,
  } = useSettingsContext();
  const label = labels[itemKey] || t(labelKey);
  const isHidden = visibility[itemKey] === false;
  const [isOpen, setIsOpen] = useState(false);

  if (isHidden && !editMode) return null;

  const current = LANG_META[language] || { cc: null, display: language };

  return (
    <SettingItemWrapper itemKey={itemKey}>
      <div
        className="settings-item"
        style={{ justifyContent: "space-between" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div className="item-icon">
            <span className="material-symbols-outlined">language</span>
          </div>
          <div className="item-text">{label}</div>
        </div>

        <div style={{ position: "relative" }}>
          <button
            onClick={() => setIsOpen((o) => !o)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 10px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#e8e8e8",
              cursor: "pointer",
              fontSize: "14px",
              color: "var(--text1)",
              fontFamily: "inherit",
            }}
          >
            {current.cc && <FlagImg cc={current.cc} />}
            <span>{current.display}</span>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "16px", color: "#666" }}
            >
              expand_more
            </span>
          </button>

          {isOpen && (
            <>
              <div
                style={{ position: "fixed", inset: 0, zIndex: 99 }}
                onClick={() => setIsOpen(false)}
              />
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 4px)",
                  zIndex: 100,
                  backgroundColor: "var(--pageBackground, #fff)",
                  border: "1px solid #ddd",
                  borderRadius: "10px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                  maxHeight: "220px",
                  overflowY: "auto",
                  minWidth: "180px",
                }}
              >
                {availableLanguages.map((lang) => {
                  const meta = LANG_META[lang.code];
                  const isSelected = lang.code === language;
                  return (
                    <div
                      key={lang.code}
                      onClick={() => {
                        changeLanguage(lang.code);
                        setIsOpen(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 12px",
                        cursor: "pointer",
                        fontSize: "14px",
                        color: "var(--text1)",
                        backgroundColor: isSelected
                          ? "rgba(0,0,0,0.06)"
                          : "transparent",
                        fontWeight: isSelected ? 600 : 400,
                      }}
                      onMouseEnter={(e) =>
                        ((
                          e.currentTarget as HTMLDivElement
                        ).style.backgroundColor = "rgba(0,0,0,0.06)")
                      }
                      onMouseLeave={(e) =>
                        ((
                          e.currentTarget as HTMLDivElement
                        ).style.backgroundColor = isSelected
                          ? "rgba(0,0,0,0.06)"
                          : "transparent")
                      }
                    >
                      {meta?.cc && <FlagImg cc={meta.cc} />}
                      <span>{meta?.display || lang.nativeName}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </SettingItemWrapper>
  );
};

// ---------- ReSeed Toggle ----------
export const ReSeedToggleSetting = ({ itemKey = "reseedToggle" }) => {
  const { t } = useSettingsContext();
  const { ReSeed, setReSeed } = useBibleContext();
  return (
    <SettingRow
      itemKey={itemKey}
      labelKey={ReSeed ? "exit" : "propagate"}
      icon="face"
      onClick={() => setReSeed((prev) => !prev)}
    />
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT REGISTRY - Maps config keys to actual components
// ═══════════════════════════════════════════════════════════════════════════════
const COMPONENT_REGISTRY = {
  // Space tab components
  spaceIcon: SpaceIconSetting,
  spaceName: () => null, // Handled within SpaceIconSetting
  spaceDescription: SpaceDescriptionSetting,
  theme: ThemeSetting,
  extensions: ExtensionsSetting,
  bibleDefaults: BibleDefaultsSetting,
  pageSettings: AdvancedSettingsSetting,
  loadSpace: LoadSpaceSetting,
  share: ShareSetting,
  divider: SettingDivider,

  // General tab components
  generalHeader: SettingHeader,
  generalDesc: SettingDescription,
  yourAccount: AccountSetting,
  accountSettings: AccountSettingsSetting,
  billing: BillingSetting,
  permissions: PermissionsSetting,
  notifications: NotificationsSetting,
  keepScreenAwake: KeepScreenAwakeSetting,
  subscriptions: SubscriptionsSetting,
  language: LanguageSetting,
  reseedToggle: ReSeedToggleSetting,
  reportBug: ReportBugSetting,
  help: HelpSetting,
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG-DRIVEN RENDERER
// ═══════════════════════════════════════════════════════════════════════════════
const renderFromConfig = (config) => {
  const elements = [];

  Object.entries(config.tabs).forEach(([tabKey, tabConfig]) => {
    if (!tabConfig.enabled) return;

    Object.entries(tabConfig.sections || {}).forEach(
      ([sectionKey, sectionConfig]) => {
        if (!sectionConfig.enabled) return;

        Object.entries(sectionConfig.items || {}).forEach(
          ([itemKey, itemConfig]) => {
            if (!itemConfig.enabled) return;

            const Component = COMPONENT_REGISTRY[itemKey];
            if (Component) {
              elements.push({
                tabKey,
                sectionKey,
                itemKey,
                Component,
                config: itemConfig,
              });
            }
          }
        );
      }
    );
  });

  return elements;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SETTINGS SIDEBAR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const SettingsSidebar = ({ config }) => {
  const {
    t,
    changeLanguage,
    availableLanguages,
    language,
    setSideBarMode,
    openPopupSettings,
    closePopupSettings,
    setUserURL,
    customIcon,
    setCustomIcon,
    setOpenOnMobile,
    setSidebarWidth,
  } = useSideBarContext();
  const { ReSeed, setReSeed } = useBibleContext();

  const useTabs = config.useTabs !== false; // Default to true for backwards compatibility
  const [activeTab, setActiveTab] = useState(
    useTabs
      ? Object.keys(config.tabs || {}).find((k) => config.tabs[k].enabled) ||
          "space"
      : null
  );
  globalThis.SetActiveSettingsTab = setActiveTab;

  const [editMode, setEditMode] = useState(false);
  const [visibility, setVisibility] = useState({});
  const [labels, setLabels] = useState({});
  const [editingLabel, setEditingLabel] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    setEditMode(ReSeed);
  }, [ReSeed]);

  // Initialize visibility from config
  useEffect(() => {
    const saved = globalThis.changes?.settingsVisibility || {};
    const initial = {};

    if (useTabs && config.tabs) {
      Object.entries(config.tabs).forEach(([tabKey, tabConfig]) => {
        Object.entries(tabConfig.sections || {}).forEach(
          ([sectionKey, sectionConfig]) => {
            Object.entries(sectionConfig.items || {}).forEach(
              ([itemKey, itemConfig]) => {
                initial[itemKey] =
                  saved[itemKey] !== undefined
                    ? saved[itemKey]
                    : itemConfig.enabled;
              }
            );
          }
        );
      });
    } else if (config.sections) {
      Object.entries(config.sections).forEach(([sectionKey, sectionConfig]) => {
        Object.entries(sectionConfig.items || {}).forEach(
          ([itemKey, itemConfig]) => {
            initial[itemKey] =
              saved[itemKey] !== undefined
                ? saved[itemKey]
                : itemConfig.enabled;
          }
        );
      });
    }

    setVisibility(initial);
  }, [config, useTabs]);

  const toggleVisibility = (key) => {
    const newVis = { ...visibility, [key]: !visibility[key] };
    setVisibility(newVis);
    if (!globalThis.changes) globalThis.changes = {};
    globalThis.changes.settingsVisibility = newVis;
  };

  const handleLabelEdit = (key, value) => {
    const newLabels = { ...labels, [key]: value };
    setLabels(newLabels);
    if (!globalThis.changes) globalThis.changes = {};
    globalThis.changes.settingsLabels = newLabels;
  };

  const toggleSection = (key) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const contextValue = {
    t,
    editMode,
    visibility,
    toggleVisibility,
    labels,
    handleLabelEdit,
    editingLabel,
    startEditingLabel: setEditingLabel,
    finishEditingLabel: () => setEditingLabel(null),
    expandedSections,
    toggleSection,
    availableLanguages,
    language,
    changeLanguage,
    openPopupSettings,
    closePopupSettings,
    customIcon,
    setCustomIcon,
    setSideBarMode,
  };

  // Get enabled tabs (only if using tabs)
  const enabledTabs =
    useTabs && config.tabs
      ? Object.entries(config.tabs).filter(([_, tc]) => tc.enabled)
      : [];

  // Render items for current tab or direct sections
  const renderContent = () => {
    let sectionsToRender = {};

    if (useTabs && config.tabs) {
      // Tab-based rendering
      const tabConfig = config.tabs[activeTab];
      if (!tabConfig?.enabled) return null;
      sectionsToRender = tabConfig.sections || {};
    } else {
      // Direct rendering without tabs
      sectionsToRender = config.sections || {};
    }

    const elements = [];
    Object.entries(sectionsToRender).forEach(
      ([sectionKey, sectionConfig], sIdx) => {
        if (!sectionConfig.enabled) return;

        // Add divider between sections (except first)
        if (sIdx > 0 && sectionConfig.showDivider !== false) {
          elements.push(<SettingDivider key={`divider-${sectionKey}`} />);
        }

        Object.entries(sectionConfig.items || {}).forEach(
          ([itemKey, itemConfig]) => {
            if (!itemConfig.enabled && !editMode) return;

            const Component = COMPONENT_REGISTRY[itemKey];
            if (Component) {
              elements.push(
                <Component
                  key={itemKey}
                  itemKey={itemKey}
                  {...(itemConfig.labelKey && {
                    labelKey: itemConfig.labelKey,
                  })}
                  {...itemConfig}
                />
              );
            }
          }
        );
      }
    );

    return elements;
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      <div className="settings-sidebar">
        <div className="settings-header">
          <h2>{t("settings")}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {editMode && (
              <button
                onClick={() => setReSeed(false)}
                className={`edit-mode-button active`}
              >
                <span className="material-symbols-outlined">check</span>
              </button>
            )}
            <button
              onClick={() => {
                if (globalThis.IsMobileNow()) {
                  setOpenOnMobile(false);
                  setSidebarWidth(280);
                }
                setSideBarMode("default");
              }}
              className="close-button"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {useTabs && (
          <div className="settings-tabs">
            {enabledTabs.map(([tabKey, tabConfig]) => (
              <button
                key={tabKey}
                className={`tab-button ${activeTab === tabKey ? "active" : ""}`}
                onClick={() => setActiveTab(tabKey)}
              >
                {t(tabConfig.labelKey)}
              </button>
            ))}
          </div>
        )}

        <div className="settings-content">
          {renderContent()}
          <div style={{ height: "80px" }}></div>
        </div>

        <style>{`${getStyleOf("settings.css")}
          .edit-mode-button { background: transparent; border: 1px solid #ddd; border-radius: 4px; padding: 4px 8px; cursor: pointer; display: flex; align-items: center; transition: all 0.2s; }
          .edit-mode-button:hover { background: #f5f5f5; }
          .edit-mode-button.active { background: var(--spaceSelection); color: white; border-color: var(--spaceSelection); }
          .settings-item-container { position: relative; }
          .settings-item-wrapper { display: flex; align-items: center; position: relative; width: 100%; }
          .hide-button { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: transparent; border: none; cursor: pointer; padding: 2px; border-radius: 3px; z-index: 10; opacity: 0.6; transition: opacity 0.2s; scale: 0.8; }
          .hide-button:hover { opacity: 1; background: #f0f0f0; }
          .hidden-item { opacity: 0.5; }
          .hidden-item .settings-item { background: rgba(255, 0, 0, 0.05); }
          .label-edit-input { background: white; border: 1px solid var(--spaceSelection); border-radius: 3px; padding: 2px 6px; font-size: inherit; font-family: inherit; width: 100%; min-width: 120px; }
          .editable-label { cursor: pointer; padding: 2px; border-radius: 3px; transition: background 0.2s; }
          .editable-label:hover { background: rgba(68, 89, 243, 0.1); }
          .sub-settings-list .settings-item-wrapper { padding-left: 20px; }
          .space-content-item { position: relative; margin-top: 10px; }
          .space-content-hide { position: absolute; top: 8px; right: 8px; z-index: 10; }
          .space-name-container { position: relative; display: inline-block; margin-top: -15px; margin-left: -17px; }
          .space-name-hide { position: absolute; top: -8px; right: -24px; }
          .space-description-edit { width: 100%; padding: 8px; border: 1px solid var(--spaceSelection); border-radius: 6px; font-family: inherit; font-size: inherit; line-height: 1.4; resize: vertical; }
          .editable-text { cursor: pointer; padding: 4px; border-radius: 4px; transition: background 0.2s; }
          .editable-text:hover { background: rgba(68, 89, 243, 0.1); }
          .expandable-container { display: flex; flex-direction: column; }
        `}</style>
      </div>
    </SettingsContext.Provider>
  );
};

export default SettingsSidebar;

// ═══════════════════════════════════════════════════════════════════════════════
// EXAMPLE USAGE WITH CONFIG
// ═══════════════════════════════════════════════════════════════════════════════
/*
import settingsSidebar from './settingsSidebar';

const myConfig = {
  tabs: {
    space: {
      enabled: true,
      labelKey: "spaceSettings",
      sections: {
        spaceContent: {
          enabled: true,
          showDivider: false,
          items: {
            spaceIcon: { enabled: true },
            spaceDescription: { enabled: true },
          }
        },
        mainSettings: {
          enabled: true,
          items: {
            theme: { enabled: true },
            extensions: { enabled: true },
            bibleDefaults: { enabled: false }, // Disabled
            pageSettings: { enabled: true },
          }
        },
      }
    },
    general: {
      enabled: true,
      labelKey: "generalSettings",
      sections: {
        account: {
          enabled: true,
          showDivider: false,
          items: {
            yourAccount: { enabled: true },
            accountSettings: { enabled: true },
          }
        },
      }
    },
    // Add a new custom tab!
    myCustomTab: {
      enabled: true,
      labelKey: "myCustomSettings",
      sections: {
        custom: {
          enabled: true,
          items: {
            theme: { enabled: true }, // Reuse existing components!
            language: { enabled: true },
          }
        }
      }
    }
  }
};

// Usage:
<settingsSidebar config={myConfig} />
*/
