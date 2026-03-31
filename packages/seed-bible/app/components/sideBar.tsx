import { getStyleOf } from "app.styles.styler";
import { useTabsContext } from "app.hooks.tabs";
import { useMouseMove, useClickAndHold } from "app.hooks.mouseMove";
import {
  DualScreenIcon,
  ThreeScreenIcon,
  QuadScreenIcon,
  SingleScreenIcon,
  MenuIcon,
  Panel1,
  Panel2,
  Panel3,
  Panel4,
  Panel3Row,
  Panel4Row,
  StartSessionIcon,
  JoinSession,
  TheNewSettingsIcon,
  GoPrivateIcon,
  BurgerMenuIcon,
  ClientLogo,
  BookMarkIcon,
  MobileSettingsIcon,
  PlusIcon,
} from "app.components.icons";
import { useBibleContext } from "app.hooks.bibleVariables";
import { useSideBarContext } from "app.hooks.sideBar";
import SurroundingDivs from "app.components.surroundingDivs";
import { TabOptions, getSettingsPreset } from "app.components.types";
import { FolderIcon, OpenFolderIcon } from "app.components.icons";
import {
  ImportSpaceModal,
  RenameSpaceModal,
  CreateNewSpaceModal,
} from "app.components.spaceSettings";
import { AOLabUpdateCard } from "app.components.notifications";
import { ThePageWithEditor } from "app.components.thePage";
import { UserPresence } from "app.components.userPresence";
import {
  TreeIcon,
  LogIcon,
  LeafIcon,
  CatIcon,
  DogIcon,
  CoffeBeanIcon,
} from "app.components.phosphoricons";
// import { CircleCounter } from 'app.components.circleCounter'
// console.log(CircleCounter, 'CircleCounter')
const Reciver = getBot("system", "app.reciver");
const { useState, useRef, useEffect, useMemo } = os.appHooks;

const LOCAL_ENV = !configBot.tags.pattern;
const removeBookMark =
  tags?.settingsConfigs?.presets?.[getSettingsPreset()]?.appSettings
    ?.removeBookMark;
const removeAddSession =
  tags?.settingsConfigs?.presets?.[getSettingsPreset()]?.appSettings
    ?.removeAddSession;

const CircleCounter = ({ data, book, chapter }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!data) return null;

  const entries = Object.entries(data);
  const visibleCount = 2;
  const remaining = entries.length - visibleCount;

  const circleStyle = {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontWeight: "600",
    fontSize: "16px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    border: "2px solid white",
    cursor: "pointer",
  };

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

  // Helper to get user's visual style
  const getUserVisual = (userId, value, index) => {
    try {
      const visual = globalThis?.GetOrSetVisualInTags(value[0]);
      // console.log(value,'the get inside')
      if (visual) {
        const IconComponent = icons[visual.iconIndex];
        const color = colors[visual.colorIndex];
        return { IconComponent, color };
      }
    } catch (e) {
      // fallback
    }
    // fallback deterministic
    // const IconComponent = icons[index % icons.length];
    // const color = colors[index % colors.length];
    // return { IconComponent, color };
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", padding: 0 }}>
        {entries.slice(0, visibleCount).map(([id, value], index) => {
          const { IconComponent, color } = getUserVisual(id, value, index);
          return (
            <div
              key={id}
              onClick={() => setIsModalOpen(true)}
              style={{
                ...circleStyle,
                backgroundColor: "white",
                zIndex: index + 1,
                marginLeft: index === 0 ? "0px" : "-4px",
                border: `1px solid ${color}`,
              }}
            >
              {masks[`${value[0]}-photo`] ? (
                <img
                  style={{
                    "border-radius": "50%",
                    width: "16px",
                  }}
                  src={masks[`${value[0]}-photo`]}
                />
              ) : (
                <IconComponent style={{ width: "12px", height: "12px" }} />
              )}
            </div>
          );
        })}

        {remaining > 0 && (
          <div
            onClick={() => setIsModalOpen(true)}
            style={{
              ...circleStyle,
              fontSize: "12px",
              marginLeft: "-5px",
              backgroundColor: "rgba(196, 196, 196, 1)",
              border: `1px solid rgba(131, 131, 131, 1)`,
              zIndex: 20,
            }}
          >
            <span
              style={{
                fontSize: "10px",
                color: "black",
                lineHeight: "20px",
                marginLeft: "-1.5px",
              }}
            >
              +{remaining}
            </span>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "500px",
              width: "90%",
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow:
                "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: "600",
                  color: "#111827",
                  margin: 0,
                }}
              >
                All Users ({entries.length})
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#6b7280",
                  padding: "0",
                  width: "30px",
                  height: "30px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {entries.map(([id, value], index) => {
                const { Icon, color } = globalThis?.GetOrSetVisualInTags
                  ? globalThis.GetOrSetVisualInTags(value[0])
                  : { Icon: TreeIcon, color: "#34D399" };
                const { role } = globalThis.GetUserSessionInfo(value[0]);
                return (
                  <div
                    key={id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "12px",
                      backgroundColor: "#f9fafb",
                      borderRadius: "8px",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        backgroundColor: color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: "600",
                        fontSize: "14px",
                        flexShrink: 0,
                      }}
                    >
                      {masks[`${value[0]}-photo`] ? (
                        <img
                          style={{
                            "border-radius": "50%",
                            width: "16px",
                          }}
                          src={masks[`${value[0]}-photo`]}
                        />
                      ) : (
                        <Icon style={{ width: "18px", height: "18px" }} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: "600",
                          color: "#111827",
                          marginBottom: "4px",
                        }}
                      >
                        User:{" "}
                        <span style={{ fontSize: "12px" }}>
                          {value?.[0] || id}
                        </span>
                      </div>
                      <div style={{ fontSize: "14px", color: "#6b7280" }}>
                        Book: {book} • Chapter: {chapter}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        // disabled={role !== 'host'}
                        onClick={() => {
                          InviteUser(value[0]);
                          setIsModalOpen(false);
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: false
                            ? "1px solid #10B981"
                            : "1px solid #d1d5db",
                          backgroundColor: false ? "#10B981" : "white",
                          color: false ? "white" : "#374151",
                          fontSize: "12px",
                          fontWeight: "500",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        {"Follow"}
                      </button>
                      <button
                        // disabled={role !== 'host'}
                        onClick={() => {
                          HandleSharedTabClick();
                          setIsModalOpen(false);
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: "1px solid #3B82F6",
                          backgroundColor: "#3B82F6",
                          color: "white",
                          fontSize: "12px",
                          fontWeight: "500",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        Invite
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

function Tab({
  el,
  activeTab,
  setActiveTab,
  setIsDragging,
  setElement,
  collapsed,
  onlineUsers,
  index,
  setSidebarWidth,
  setCollapsed,
  sharedTab,
  isBookmarked,
  onBookmarkClick,
}: any) {
  const { openPopupSettings, closePopupSettings, userURL, t } =
    useSideBarContext();
  const { setCanvasMode, setMapMode } = useBibleContext();
  useEffect(() => {
    console.log(onlineUsers, "onlineUsers var");
  }, [onlineUsers]);
  const {
    removeTab,
    multiSelectMode,
    setMultiSelectMode,
    selectedTabs,
    setSelectedTabs,
    tabsIcons,
  } = useTabsContext();
  const removeEditMode =
    tags?.settingsConfigs?.presets?.[getSettingsPreset()]?.appSettings
      ?.removeEditMode;
  const OPTIONS = (tab) => ({
    type: "normal",
    items: [
      {
        icon: <MenuIcon name="delete" />,
        title: t("deleteTab"),
        onClick: () => {
          removeTab(el.id);
          closePopupSettings();
        },
        active: TabOptions.Delete.active,
      },
      !removeEditMode && {
        icon: <MenuIcon name="edit" />,
        title: t("editMode"),
        onClick: () => {
          globalThis[`SetEnableEditorOf${tab.id}`]((prev) => !prev);
          closePopupSettings();
        },
        active: TabOptions.Edit.active,
      },
      {
        icon: <MenuIcon name="check_box" />,
        title: multiSelectMode ? t("deselect") : t("select"),
        onClick: () => {
          setMultiSelectMode((prev) => !prev);
          setSelectedTabs([activeTab]);
        },
        active: TabOptions.Select.active,
      },
    ].filter(Boolean),
  });
  const CANVASOPTIONS = {
    type: "normal",
    items: [
      {
        icon: <MenuIcon name="delete" />,
        title: t("deleteTab"),
        onClick: () => {
          removeTab(el.id);
          closePopupSettings();
        },
      },
    ],
  };

  const MAPOPTIONS = {
    type: "normal",
    items: [
      {
        icon: <MenuIcon name="delete" />,
        title: t("deleteTab"),
        onClick: () => {
          removeTab(el.id);
          closePopupSettings();
        },
      },
    ],
  };

  const dragTimeout = useRef(null);

  function handleMouseDown() {
    if (multiSelectMode) return;
    if (globalThis?.activeCanvasId && el.data.type === "canvas") return;

    dragTimeout.current = setTimeout(() => {
      setIsDragging(true);
      setElement({
        App: (
          <Tab
            el={el}
            onlineUsers={onlineUsers}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            setIsDragging={setIsDragging}
            setElement={setElement}
            collapsed={collapsed}
            setSidebarWidth={setSidebarWidth}
            setCollapsed={setCollapsed}
          />
        ),
        data: el,
      });
    }, 300); // delay before starting drag
  }

  function handleMouseUpOrLeave() {
    clearTimeout(dragTimeout.current);
  }
  useEffect(() => {
    os.log(selectedTabs, selectedTabs.lenght === 0, "selectedTabs");
    if (selectedTabs.length === 0) setMultiSelectMode(false);
  }, [selectedTabs]);

  const handleTabClick = () => {
    if (globalThis.IsMobileNow()) {
      setSidebarWidth(0);
      // setCollapsed(true);
      // setMultiSelectMode(false);
    }

    if (activeTab === el.id) return;

    if (el.sharedTab) {
      globalThis.HandleSharedTabClick();
    }
    const checkEmpty = PanelsApps.find((e) => !e.tabData);
    if (el.data.type === "book" && checkEmpty) {
      // console.log("canvas replacing");
      setActiveTab(el.id);
      const id = uuid();
      ReplaceApplication(LastClickedPanelUpdate || checkEmpty.id, {
        id: id,
        App: <ThePageWithEditor tab={el} panelId={id} preferTab={true} />,
        to: "panel",
        minWidth: "30rem",
      });
      return;
    } else if (el.data.pkgApp) {
      setActiveTab(el.id);
      const handoff = el?.data;
      const App = handoff.app;
      const tabData = {
        ...el,
        data: {
          ...el.data,
          app: null,
        },
      };
      const id = uuid();
      ReplaceApplication((checkEmpty && checkEmpty.id) || PanelsApps[0].id, {
        id: id,
        App: <App tab={tabData} panelId={id} activeTab={el.id} />,
        to: "panel",
        minWidth: "30rem",
      });
      return;
    }
    // if (globalThis?.CurrentActivePanel) {
    //     if (el.data.type === "canvas" && globalThis?.activeCanvasId) {
    //         console.log("canvas already exists")
    //         setActiveTab(el.id);
    //         return
    //     } else if (el.data.type === "canvas" && !globalThis?.activeCanvasId) {
    //         console.log("canvas loading")
    //         setActiveTab(el.id);
    //         const handoff = el?.data
    //         const App = handoff.app
    //         let tabData = {
    //             ...el,
    //             data: {
    //                 ...el.data,
    //                 app: null
    //             }
    //         }
    //         ReplaceApplication(globalThis.CurrentActivePanel,
    //             { id: globalThis.CurrentActivePanel, App: <App tab={tabData} panelId={globalThis.CurrentActivePanel} activeTab={el.id} />, to: 'panel', minWidth: '30rem' })
    //         return
    //     } else if (el.data.type === "book" && globalThis?.activeCanvasId === activeTab) {
    //         console.log("canvas replacing")
    //         setActiveTab(el.id);
    //         ReplaceApplication(globalThis.CurrentActivePanel,
    //             { id: globalThis.CurrentActivePanel, App: <ThePageWithEditor tab={el} panelId={globalThis.CurrentActivePanel} preferTab={true} />, to: 'panel', minWidth: '30rem' })
    //         return
    //     }
    // }
    console.log(
      "canvas-page updating",
      el.data.type === "book" && globalThis?.activeCanvasId === activeTab,
      el.data.type === "book",
      globalThis?.activeCanvasId === activeTab
    );
    setActiveTab(el.id);
    // if (globalThis[`UpdateTabWidthId${el?.id}`])
    //   globalThis[`UpdateTabWidthId${el?.id}`](el);

    globalThis.UpdateTab(el);
  };
  const circles = onlineUsers
    ? Object.fromEntries(
        Object.entries(onlineUsers).filter(([k, v]) => {
          // console.log('Filtering user:', k, 'v:', v, 'el.data:', el?.data);
          return (
            v?.bookId === el?.data?.bookId && v?.chapter === el?.data?.chapter
          );
        })
      )
    : {};
  // console.log('circles result:', circles, 'for tab:', el?.data?.book, el?.data?.chapter);
  const notJoinedSharedTab = sharedTab && activeTab !== el.id;
  const info =
    el.sharedTab && globalThis?.GetOrSetVisualInTags(tags.hostIdForOnlineTab);

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
      onClick={handleTabClick}
      style={{
        ...(index === 0 &&
          sharedTab && {
            "border-top": "none",
            "border-radius": "0 0 5px 5px",
            border: `1px solid ${info.color} !important`,
            background: `color-mix(in srgb, ${info.color} 50%, transparent) !important`,
            marginBottom: "5px",
          }),
      }}
      className={`

      ${index === 0 && sharedTab && "sharedTab"}
      ${
        notJoinedSharedTab
          ? "tab notJoinedSharedTab"
          : activeTab === el.id && !multiSelectMode && !collapsed
            ? "activeTab"
            : activeTab === el.id && collapsed
              ? "activeTabCollapsed"
              : collapsed
                ? "collabsedTab"
                : "tab"
      } ${selectedTabs?.includes?.(el.id) ? "selected" : ""}`}
    >
      <style>{`
        .notJoinedSharedTab {
            border: 1px solid var(--tabSelection);
            border-radius:5px;
        }
    `}</style>
      {!collapsed ? (
        <>
          <div
            className="tabInfo"
            style={{ zoom: (globalThis as any).changes?.uiTextSize || 1 }}
          >
            {multiSelectMode && (
              <input
                type="checkbox"
                className="customCheckbox"
                checked={selectedTabs.includes(el.id)}
                onChange={() => {
                  setSelectedTabs((prev) =>
                    prev.includes(el.id)
                      ? prev.filter((id) => id !== el.id)
                      : [...prev, el.id]
                  );
                }}
                // style={{ marginRight: '8px' }}
              />
            )}
            {tabsIcons && (
              <span className="tabIcon material-symbols-outlined">
                {el?.data?.type === "book"
                  ? "description"
                  : el?.data?.type === "canvas"
                    ? "deployed_code"
                    : el?.data?.type === "map"
                      ? "map"
                      : null}
              </span>
            )}
            <span className="tabName">
              {el?.data?.type === "map"
                ? "map"
                : el?.data?.type === "canvas"
                  ? el?.data?.title || "canvas"
                  : el?.data?.book
                    ? `${el?.data?.book} - ${el?.data?.chapter}`
                    : el?.data?.title}
              {el?.data?.shortName && (
                <span
                  style={{
                    fontSize: "14px",
                    color: "color-mix(in srgb, var(--text1), transparent 40%)",
                  }}
                >{` · ${el?.data?.shortName}`}</span>
              )}
            </span>
            <CircleCounter
              data={Object.entries(circles)}
              book={el?.data?.book}
              chapter={el?.data?.chapter}
            />
          </div>

          {!sharedTab && (
            <div className="tab-actions">
              {!removeBookMark && onBookmarkClick && (
                <span
                  className="tab-bookmark-btn"
                  onClick={(e: MouseEvent) => {
                    e.stopPropagation();
                    onBookmarkClick(el.id);
                  }}
                  title={isBookmarked ? "Remove bookmark" : "Bookmark"}
                >
                  <BookMarkIcon
                    stroke={
                      isBookmarked
                        ? "var(--selectedSpaceColor)"
                        : "currentColor"
                    }
                    fill={isBookmarked ? "var(--selectedSpaceColor)" : "none"}
                  />
                </span>
              )}
              {activeTab === el.id && (
                <span
                  onClick={() => {
                    openPopupSettings(OPTIONS(el));
                  }}
                  className="material-symbols-outlined"
                >
                  more_vert
                </span>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="tabInfoCollapsed">
          <span className="tabIcon">
            {el?.data?.type === "book" && `${el.data.bookId}`}
            {el?.data?.type === "map" && (
              <span className="material-symbols-outlined">map</span>
            )}
            {el?.data?.type === "canvas" && (
              <span className="material-symbols-outlined">deployed_code</span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

function Folder({
  folder,
  onlineUsers,
  collapsed,
  setSidebarWidth,
  setCollapsed,
}) {
  const {
    setActiveTab,
    activeTab,
    removeFolder,
    addTabToFolder,
    addTabsToFolder,
  } = useTabsContext();
  const { setIsDragging, isDragging, setElement, Element } = useMouseMove();
  const [open, setOpen] = useState(true);
  const { moveTab } = useTabsContext();
  const [tabEntered, setTabEntered] = useState(false);
  const { openPopupSettings, closePopupSettings, t } = useSideBarContext();

  function handleMouseEnter() {
    if (!isDragging) return;
    setTabEntered(true);
  }
  function handleMouseLeave() {
    if (!isDragging) return;
    setTabEntered(false);
  }
  function handleMouseUp() {
    if (!isDragging) return;
    moveTab(Element.data.id, folder.id);
    setIsDragging(false);
    setTabEntered(false);
  }
  const OPTIONS = {
    type: "normal",
    items: [
      {
        icon: <MenuIcon name="delete" />,
        title: t("delete"),
        onClick: () => {
          removeFolder(folder.id);
          closePopupSettings();
        },
      },
    ],
  };
  return (
    <div
      style={{
        "border-raduis": "8px",
        border: tabEntered ? "1px black dashed" : "",
      }}
      key={folder.id}
      onPointerEnter={handleMouseEnter}
      onPointerLeave={handleMouseLeave}
      onPointerUp={handleMouseUp}
      className="folder"
    >
      <div onClick={() => setOpen(!open)} className="folderHeader">
        {open ? <MenuIcon name="folder_open" /> : <MenuIcon name={"folder"} />}
        {!collapsed && <span>{folder.name}</span>}
        <span
          style={{ position: "absolute", right: "14px" }}
          onClick={() => {
            openPopupSettings(OPTIONS);
          }}
          className="material-symbols-outlined "
        >
          more_vert
        </span>
      </div>
      {open && (
        <div
          style={{ "margin-left": collapsed ? "0px" : null }}
          className="folderTabs"
        >
          {folder.tabs.map((el) => (
            <Tab
              key={el.id}
              el={el}
              onlineUsers={onlineUsers}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              setIsDragging={setIsDragging}
              setElement={setElement}
              collapsed={collapsed}
              setSidebarWidth={setSidebarWidth}
              setCollapsed={setCollapsed}
            />
          ))}
          {
            null /*<button className="addTabToFolder" onClick={() => addTabToFolder(folder.id, { id: uuid(), taken: false, data: { type: 'book', book: 'Exodus', chapter: 1 } })}>
                + Add Tab
            </button>*/
          }
        </div>
      )}
    </div>
  );
}

function SideBar({ panelsNumber }) {
  const {
    tabs,
    folders,
    addTab,
    removeTab,
    setActiveTab,
    activeTab,
    addFolder,
    removeFolder,
    addTabToFolder,
    moveTab,
    currentSpace,
    updateSpace,
    activeSpace,
    multiSelectMode,
    setMultiSelectMode,
    selectedTabs,
    setSelectedTabs,
    sharedTab,
  } = useTabsContext();
  const hidePanels =
    tags?.settingsConfigs?.presets?.[getSettingsPreset()]?.appSettings
      ?.disablePanels;
  globalThis.AddTab = addTab;
  const { screens, setScreens, fullScreen, setFullScreen, ReSeed, setReSeed } =
    useBibleContext();
  // globalThis.setScreens = setScreens
  const [customScreens, setCustomScreens] = useState({ value: 1 });
  globalThis.setCustomScreens = setCustomScreens;
  const [onlineUsers, setOnlineUsers] = useState(false);
  globalThis.SetOnlineUsers = setOnlineUsers;
  const [showSearch, setShowSearch] = useState(false); // New state for search visibility
  const [searchQuery, setSearchQuery] = useState(""); // Search filter for tabs
  const [editMode, setEditMode] = useState(false); // New state for edit mode
  const [keepAwake, setKeepAwake] = useState(false); // New state for keep device awaken

  // Bookmark state (shared between mobile and desktop)
  const [bookmarks, setBookmarks] = useState(
    () => masks.mobileBookmarks || { "My bookmarks": [] }
  );
  const [showBookmarksFilter, setShowBookmarksFilter] = useState(false);
  const [desktopExpandedCategories, setDesktopExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [selectedTabForBookmark, setSelectedTabForBookmark] = useState<
    string | null
  >(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const bookmarkedTabIds = new Set(Object.values(bookmarks).flat());

  const handleRemoveBookmark = (tabId: string) => {
    setBookmarks((prev: any) => {
      const updated: Record<string, string[]> = {};
      for (const [cat, ids] of Object.entries(prev)) {
        updated[cat] = (ids as string[]).filter((id) => id !== tabId);
      }
      setTagMask(thisBot, "mobileBookmarks", updated, "local");
      return updated;
    });
  };

  const handleBookmarkTab = (tabId: string) => {
    setSelectedTabForBookmark(tabId);
    const first = Object.keys(bookmarks)[0] || "";
    setSelectedCategory(first);
    setShowBookmarkModal(true);
  };

  const handleAddToCategory = (category: string) => {
    if (!category) return;
    setBookmarks((prev: any) => {
      const updated = { ...prev };
      if (!updated[category]) updated[category] = [];
      if (!updated[category].includes(selectedTabForBookmark)) {
        updated[category].push(selectedTabForBookmark);
      }
      setTagMask(thisBot, "mobileBookmarks", updated, "local");
      return updated;
    });
    // Auto-enable bookmarks view and expand the category so the user sees it
    setShowBookmarksFilter(true);
    setDesktopExpandedCategories((prev) => ({ ...prev, [category]: true }));
    setShowBookmarkModal(false);
    setSelectedTabForBookmark(null);
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;
    const name = newCategoryName.trim();
    setBookmarks((prev: any) => {
      const updated = { ...prev, [name]: [] };
      setTagMask(thisBot, "mobileBookmarks", updated, "local");
      if (
        selectedTabForBookmark &&
        !updated[name].includes(selectedTabForBookmark)
      ) {
        updated[name] = [selectedTabForBookmark];
        setTagMask(thisBot, "mobileBookmarks", updated, "local");
      }
      return updated;
    });
    setNewCategoryName("");
    setShowNewCategoryModal(false);
    setShowBookmarkModal(false);
    setSelectedTabForBookmark(null);
  };

  useEffect(() => {
    setEditMode(ReSeed);
  }, [ReSeed]);
  useEffect(() => {
    setCustomScreens(
      globalThis.SpaceScreens[activeSpace]
        ? { value: globalThis.SpaceScreens[activeSpace] }
        : { value: 1 }
    );
  }, [activeSpace]);

  // Initialize globalThis.changes if it doesn't exist
  useEffect(() => {
    if (!globalThis.changes) {
      globalThis.changes = {};
    }
    // Load saved search visibility state
    if (globalThis.changes.showSearch !== undefined) {
      setShowSearch(globalThis.changes.showSearch);
    }
    // Load saved edit mode state
    if (globalThis.changes.editMode !== undefined) {
      setEditMode(globalThis.changes.editMode);
    }
  }, []);

  // Save search visibility changes to globalThis.changes
  useEffect(() => {
    if (!globalThis.changes) {
      globalThis.changes = {};
    }
    globalThis.changes.showSearch = showSearch;
  }, [showSearch]);

  // Save edit mode changes to globalThis.changes
  useEffect(() => {
    if (!globalThis.changes) {
      globalThis.changes = {};
    }
    globalThis.changes.editMode = editMode;
  }, [editMode]);

  useEffect(() => {
    shout("OnOnlineUsersChanged", { onlineUsers });
  }, [onlineUsers]);

  const {
    sidebarMode,
    setSideBarMode,
    customIcon,
    setCustomIcon,
    collapsed,
    setCollapsed,
    openPopupSettings,
    sidebarWidth,
    setSidebarWidth,
    packageAddingOptions,
    openOnMobile,
    setOpenOnMobile,
    setPackageAddingOptions,
    closePopupSettings,
    userURL,
    themeColors,
    t,
  } = useSideBarContext();
  const { setIsDragging, isDragging, setElement, Element } = useMouseMove();
  const [tabEntered, setTabEntered] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const isResizing = useRef(false);
  const sidebarRef = useRef();

  const handleMouseDown = (e) => {
    // Disable resize on mobile to prevent sticking issues
    if (isMobile) return;
    isResizing.current = true;
  };

  const handleMouseMove = (e) => {
    if (!isResizing.current) return;
    // Disable resize on mobile to prevent sticking issues
    if (isMobile) {
      isResizing.current = false;
      return;
    }
    const newWidth = Math.max(40, Math.min(e.clientX, 300));
    if (newWidth <= 140) {
      setCollapsed(true);
    } else {
      setCollapsed(false);
    }
    if (newWidth < 55) {
      setSidebarWidth(0);
      isResizing.current = false;
      return;
    }
    setSidebarWidth(newWidth);
  };

  const handleMouseUp = () => {
    if (isResizing.current) {
      isResizing.current = false;
    }
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => handleMouseMove(e);
    const handleUp = () => handleMouseUp();

    window.addEventListener("mousemove", handleMove as EventListener);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleMove as EventListener);
    window.addEventListener("touchend", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove as EventListener);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove as EventListener);
      window.removeEventListener("touchend", handleUp);
    };
  }, [isMobile, collapsed]);

  useEffect(() => {
    const handleResize = () => {
      const check = window.innerWidth < 768;
      setIsMobile(check);
      if (check) {
        // On mobile, reset to closed state when switching from desktop
        if (sidebarWidth > 0 && sidebarWidth !== 300) {
          setSidebarWidth(0);
        }
      } else {
        // On desktop, ensure sidebar is visible
        if (sidebarWidth === 0 || sidebarWidth === 300) {
          setSidebarWidth(280);
          setCollapsed(false);
        }
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [sidebarWidth]);

  function handleMouseEnter() {
    if (!isDragging) return;
    setTabEntered(true);
  }

  function handleMouseLeave() {
    if (!isDragging) return;
    setTabEntered(false);
  }

  function handleMouseUpTab() {
    if (!isDragging) return;
    moveTab(Element.data.id);
    setTabEntered(false);
  }

  useEffect(() => {
    if (isMobile) {
      // setOpenOnMobile(false);
      setIsMobile(true);
    }
  }, [customScreens]);

  // const toggleSidebar = () => {
  //   if (isMobile) setOpenOnMobile(false);
  //   else setCollapsed(!collapsed);
  // };

  // Toggle search visibility function
  const toggleSearchVisibility = () => {
    if (showSearch) setSearchQuery("");
    setShowSearch(!showSearch);
  };

  // Toggle edit mode function
  const toggleEditMode = () => {
    // setEditMode(!editMode);
    setReSeed((prev) => !prev);
    // Exit multi-select mode when entering/exiting edit mode
    if (multiSelectMode) {
      setMultiSelectMode(false);
      setSelectedTabs([]);
    }
  };

  // Toggle keep device awaken function
  const toggleKeepAwake = async () => {
    if (keepAwake) {
      // Release the wake lock
      try {
        await os.disableWakeLock();
        setKeepAwake(false);
      } catch (err: any) {
        os.toast("Could not disable keep awake: " + err?.message);
      }
    } else {
      // Request a wake lock
      try {
        await os.requestWakeLock();
        setKeepAwake(true);
      } catch (err: any) {
        os.toast("Could not enable keep awake: " + err?.message);
      }
    }
  };

  const ScreenOptions = ({ setCustomScreens }) => {
    return (
      <div
        style={{
          width: "370px",
          height: "100%",
          " flex-shrink": "0",
          "border-radius": "10px",
          background: themeColors ? themeColors[1].primaryColor : "#ffffff",
          border: "1px solid #1A1A1A",
          padding: "20px",
        }}
      >
        <div
          style={{
            textAlign: "left",
            marginBottom: "10px",
            color: themeColors ? themeColors[1].pageTextColor : "#1A1A1A",
            "font-family": "'Satoshi', system-ui, sans-serif",
            "font-size": "16px",
            "font-style": "normal",
            "font-weight": "700",
            "line-height": "normal",
          }}
        >
          Panels
        </div>
        <div
          style={{
            gap: "10px",
            display: "grid",
            "grid-template-columns": "repeat(3, 1fr)",
          }}
        >
          <div
            onClick={() => {
              setCustomScreens({ value: 1 });
              setScreens({ value: 1 });
            }}
            style={{ cursor: "pointer" }}
          >
            <Panel1 />
          </div>
          <div
            onClick={() => {
              setCustomScreens({ value: 2 });
              setScreens({ value: 2 });
            }}
            style={{ cursor: "pointer" }}
          >
            <Panel2 />
          </div>
          {!isMobile && (
            <>
              {" "}
              <div
                onClick={() => {
                  setCustomScreens({ value: 3 });
                  setScreens({ value: 3 });
                }}
                style={{ cursor: "pointer" }}
              >
                <Panel3 />
              </div>
              <div
                onClick={() => {
                  setCustomScreens({ value: 3, row: true });
                  setScreens({ value: 3, row: true });
                }}
                style={{ cursor: "pointer" }}
              >
                <Panel3Row />
              </div>
              <div
                onClick={() => {
                  setCustomScreens({ value: 4 });
                  setScreens({ value: 4 });
                }}
                style={{ cursor: "pointer" }}
              >
                <Panel4 />
              </div>
              <div
                onClick={() => {
                  setCustomScreens({ value: 4, row: true });
                  setScreens({ value: 4, row: true });
                }}
                style={{ cursor: "pointer" }}
              >
                <Panel4Row />
              </div>
            </>
          )}
        </div>
      </div>
    );
  };
  const TransparentSvg = (props) => (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect width={24} height={24} fill="transparent" />
    </svg>
  );
  const removeJoinSession =
    tags?.settingsConfigs?.presets?.[getSettingsPreset()]?.appSettings
      ?.removeJoinSession || false;

  const MenuOptions = {
    type: "normal",
    items: [
      ...(!configBot.tags.staticInst
        ? [
            {
              disabled: false,
              icon: <StartSessionIcon />,
              title: t("startSession"),
              onClick: () => {
                // os.log(globalThis?.StartSession,globalThis)
                HandleSharedTabClick();
              },
            },
            {
              disabled: false,
              icon: <MenuIcon name="person_add" />,
              // icon: <TransparentSvg />,
              title: t("inviteToSession"),
              onClick: async () => {
                const { QRCodeComponent } = thisBot.Chips();
                const url = `https://ao.bot/?inst=${os.getCurrentInst()}`;
                ShowModal(<QRCodeComponent url={url} />);
              },
            },
          ]
        : []),
      ...(!removeJoinSession
        ? [
            {
              disabled: true,
              icon: <JoinSession />,
              title: t("joinAnotherSession"),
              onClick: async () => {
                const { JoinSessionComponent } = thisBot.Chips();
                const translations = {
                  joinSession: t("joinSession"),
                  enterSessionCode: t("enterSessionCode"),
                  sessionCodePlaceholder: t("sessionCodePlaceholder"),
                  join: t("join"),
                };
                ShowModal(
                  <JoinSessionComponent
                    onJoin={(code) => os.goToURL(code)}
                    translations={translations}
                    CloseModal={() => globalThis.CloseModal()}
                  />
                );
              },
            },
            ...(!configBot.tags.staticInst
              ? [
                  {
                    disabled: false,
                    icon: <GoPrivateIcon />,
                    title: globalThis.IsPrivateMode?.()
                      ? t("goPublic")
                      : t("goPrivate"),
                    onClick: async () => {
                      if (globalThis.TogglePrivateMode) {
                        await globalThis.TogglePrivateMode();
                      }
                    },
                  },
                ]
              : []),

            { type: "line" },
          ]
        : []),
      {
        disabled: false,
        // icon: <MenuIcon name={showSearch ? "visibility_off" : "visibility"} />,
        icon: <MenuIcon name="search" />,
        title: showSearch ? t("hideSearch") : t("showSearch"),
        onClick: toggleSearchVisibility,
      },
      {
        disabled: false,
        icon: <MenuIcon name="crop_free" />,
        title: t("fullScreen"),
        onClick: () => {
          setFullScreen(true);
        },
      },
      {
        disabled: false,
        icon: <MenuIcon name="brightness_high" />,
        title: t("keepDeviceAwaken"),
        toggle: keepAwake,
        onClick: toggleKeepAwake,
      },
      // { type: "line" },
      // {
      //     disabled: false,
      //     icon: <MenuIcon name={editMode ? "edit_off" : "edit"} />,
      //     title: editMode ? 'Exit ReSeed Mode' : 'Enter ReSeed Mode',
      //     onClick: toggleEditMode
      // },
      // { disabled: true, icon: <MenuIcon name="extension" />, title: 'Extensions', onClick: () => { } },
      { type: "line" },
      {
        disabled: false,
        icon: <MenuIcon name="bug_report" />,
        title: t("reportBug"),
        onClick: () => {
          os.openURL("https://forms.gle/mhtqbQd6VPW8ZDh2A");
        },
      },
      // {
      //   disabled: true,
      //   icon: <MenuIcon name="help" />,
      //   title: t("help"),
      //   onClick: () => { },
      // },
    ],
  };
  const SessionsOptions = {
    type: "normal",
    items: [
      ...(!configBot.tags.staticInst
        ? [
            {
              disabled: false,
              icon: <StartSessionIcon />,
              title: t("startSession"),
              onClick: () => {
                // os.log(globalThis?.StartSession,globalThis)
                HandleSharedTabClick();
              },
            },
            {
              disabled: false,
              icon: <MenuIcon name="person_add" />,
              // icon: <TransparentSvg />,
              title: t("inviteToSession"),
              onClick: async () => {
                const { QRCodeComponent } = thisBot.Chips();
                const url = `https://ao.bot/?inst=${os.getCurrentInst()}`;
                ShowModal(<QRCodeComponent url={url} />);
              },
            },
          ]
        : []),
      ...(!removeJoinSession
        ? [
            {
              disabled: true,
              icon: <JoinSession />,
              title: t("joinAnotherSession"),
              onClick: async () => {
                const { JoinSessionComponent } = thisBot.Chips();
                const translations = {
                  joinSession: t("joinSession"),
                  enterSessionCode: t("enterSessionCode"),
                  sessionCodePlaceholder: t("sessionCodePlaceholder"),
                  join: t("join"),
                };
                ShowModal(
                  <JoinSessionComponent
                    onJoin={(code) => os.goToURL(code)}
                    translations={translations}
                    CloseModal={() => globalThis.CloseModal()}
                  />
                );
                if (globalThis.IsMobileNow()) {
                  setOpenOnMobile(false);
                  setSidebarWidth(0);
                }
              },
            },
            ...(!configBot.tags.staticInst
              ? [
                  {
                    disabled: false,
                    icon: <GoPrivateIcon />,
                    title: globalThis.IsPrivateMode?.()
                      ? t("goPublic")
                      : t("goPrivate"),
                    onClick: async () => {
                      if (globalThis.TogglePrivateMode) {
                        await globalThis.TogglePrivateMode();
                      }
                    },
                  },
                ]
              : []),

            { type: "line" },
          ]
        : []),
    ],
  };
  const AddingOption = () => {
    const input = {
      type: "normal",
      items: [
        {
          icon: <MenuIcon name="description" />,
          title: t("pageTab"),
          onClick: () => {
            addTab({
              id: uuid(),
              taken: false,
              data: {
                use: "thePage",
                type: "book",
                book: "Genesis",
                bookId: "GEN",
                chapter: 1,
                translation: "AAB",
                shortName: "AAB",
              },
            });
            closePopupSettings();
          },
        },
        {
          icon: <MenuIcon name="create_new_folder" />,
          title: t("newFolder"),
          onClick: () => {
            addFolder(`Folder ${folders.length + 1}`);
            closePopupSettings();
          },
        },
      ],
    };

    packageAddingOptions.forEach(({ pkg, data }) => {
      const item = {
        icon: <MenuIcon name={data.icon} />,
        title: data.title,
        onClick: () => {
          addTab({
            id: uuid(),
            taken: false,
            data: {
              ...data,
              pkgApp: true,
            },
          });
          closePopupSettings();
        },
      };
      input.items.push(item);
    });

    return input;
  };

  useEffect(() => {
    os.log(openOnMobile, "openOnMobile");
  }, [openOnMobile]);

  const { moveMultipleTabs } = useTabsContext();
  const holdTimeout = useRef({ time: null, clicked: null });
  const activePreset = getSettingsPreset();
  const clientSite =
    tags?.settingsConfigs?.presets?.[activePreset]?.clientBranding?.clientSite;
  const clientName =
    tags?.settingsConfigs?.presets?.[activePreset]?.clientBranding?.clientName;
  const clientLogo =
    tags?.settingsConfigs?.presets?.[activePreset]?.clientBranding?.clientLogo;
  const isSiteOfClient =
    tags?.settingsConfigs?.presets?.[activePreset]?.clientBranding?.enabled;
  const handleOpenClientSite = () => {
    if (clientSite) {
      window.open(clientSite);
    }
  };
  // Mobile-only layout: when `isMobile` and `openOnMobile` are true, render a simplified
  // full-screen sidebar that matches the mobile design (header, list, bottom nav).
  if (isMobile && openOnMobile) {
    const [renamingCategory, setRenamingCategory] = useState("");
    const [renameValue, setRenameValue] = useState("");
    const [expandedCategories, setExpandedCategories] = useState<
      Record<string, boolean>
    >({
      ["My bookmarks"]: false,
    });
    const [showBookmarks, setShowBookmarks] = useState(false);

    const toggleCategory = (categoryName) => {
      setExpandedCategories((prev) => ({
        ...prev,
        [categoryName]: !prev[categoryName],
      }));
    };

    // Compute free tabs (tabs not bookmarked in any category)
    const freeTabs = tabs.filter(
      (tab) => !tab.sharedTab && !bookmarkedTabIds.has(tab.id)
    );

    const handleMobileTabClick = (el) => {
      setActiveTab(el.id);
      globalThis.UpdateTab(el);

      setOpenOnMobile(false);
      setSidebarWidth(0);
      setCollapsed(false);
    };

    const handleDeleteCategory = (categoryName: string) => {
      setBookmarks((prev: any) => {
        const updated = { ...prev };
        delete updated[categoryName];
        setTagMask(thisBot, "mobileBookmarks", updated, "local");
        return updated;
      });
    };

    const handleRenameCategory = () => {
      const newName = renameValue.trim();
      if (!newName || newName === renamingCategory) {
        setRenamingCategory("");
        return;
      }
      setBookmarks((prev: any) => {
        const updated: any = {};
        for (const [cat, ids] of Object.entries(prev)) {
          updated[cat === renamingCategory ? newName : cat] = ids;
        }
        setTagMask(thisBot, "mobileBookmarks", updated, "local");
        return updated;
      });
      setExpandedCategories((prev) => {
        const updated: any = { ...prev };
        if (renamingCategory in updated) {
          updated[newName] = updated[renamingCategory];
          delete updated[renamingCategory];
        }
        return updated;
      });
      setRenamingCategory("");
      setRenameValue("");
    };

    const mobileAddTab = () => {
      const newTab = {
        id: uuid(),
        taken: false,
        data: {
          use: "thePage",
          type: "book",
          book: "Genesis",
          bookId: "GEN",
          chapter: 1,
          translation: "AAB",
          shortName: "AAB",
        },
      };
      addTab(newTab);
      setActiveTab(newTab.id);
      globalThis.UpdateTab(newTab);
    };

    return (
      <>
        <div className="mobile-sidebar-overlay">
          <div
            className="mobile-sidebar-header"
            style={{ zoom: (globalThis as any).changes?.uiTextSize || 1 }}
          >
            <h2>{t("tabs")}</h2>
            <div className="mobile-header-actions">
              {/* <span
                className="mobile-header-icon"
                onClick={() => {
                  openPopupSettings(MenuOptions);
                }}
                role="button"
              >
                {<MenuIcon name={"person_add"} />}
              </span> */}
              {/* <button
                className="mobile-icon-button"
                style={{ background: "transparent" }}
                onClick={(e) => {
                  e.stopPropagation();
                  os.log("Opening mobile settings", setOpenOnMobile);
                  setOpenOnMobile(true);
                  setSidebarWidth(280);
                  setCollapsed(false);
                  setSideBarMode("settings");
                }}
                title="Settings"
              >
                <MobileSettingsIcon />
              </button> */}
              <span
                className="mobile-header-icon"
                onClick={() => {
                  setOpenOnMobile(false);
                  setSidebarWidth(0);
                }}
                role="button"
              >
                <span className="material-symbols-outlined">close</span>
              </span>
            </div>
          </div>

          <div className="mobile-tabs-list">
            {/* Bookmark folders */}
            {!removeBookMark &&
              showBookmarks &&
              Object.entries(bookmarks).map(
                ([categoryName, tabIds]: [string, any]) => (
                  <div key={categoryName} className="bookmark-category">
                    <div
                      className="bookmark-category-header"
                      onClick={() => toggleCategory(categoryName)}
                    >
                      <span className="bookmark-icon">
                        <BookMarkIcon />
                      </span>
                      <span className="category-title">{categoryName}</span>
                      <span
                        className={`collapse-icon ${
                          expandedCategories[categoryName] ? "expanded" : ""
                        }`}
                      >
                        <span className="material-symbols-outlined">
                          expand_more
                        </span>
                      </span>
                      <div
                        className="mobile-tab-actions"
                        onClick={(e: any) => {
                          e.stopPropagation();
                          const options = {
                            type: "normal",
                            items: [
                              {
                                icon: <MenuIcon name="edit" />,
                                title: "Rename",
                                onClick: () => {
                                  setRenamingCategory(categoryName);
                                  setRenameValue(categoryName);
                                  closePopupSettings();
                                },
                              },
                              {
                                icon: <MenuIcon name="delete" />,
                                title: "Delete",
                                onClick: () => {
                                  handleDeleteCategory(categoryName);
                                  closePopupSettings();
                                },
                              },
                            ],
                          };
                          openPopupSettings(options);
                        }}
                      >
                        <MenuIcon name={"more_vert"} />
                      </div>
                    </div>
                    {expandedCategories[categoryName] && (
                      <div className="bookmark-items">
                        {tabIds.length > 0 ? (
                          tabIds.map((tabId: any) => {
                            const tab = tabs.find((t: any) => t.id === tabId);
                            return tab ? (
                              <div
                                key={tabId}
                                className={`mobile-tab ${activeTab === tabId ? "active" : ""}`}
                                onClick={() => handleMobileTabClick(tab)}
                              >
                                <div className="mobile-tab-left">
                                  <div
                                    className="mobile-tab-title"
                                    style={{
                                      zoom:
                                        (globalThis as any).changes
                                          ?.uiTextSize || 1,
                                    }}
                                  >
                                    {`${tab.data?.book || tab.data?.title || ""} – ${tab.data?.chapter || ""}`}{" "}
                                    <div className="mobile-tab-sub">
                                      • {tab.data?.shortName || ""}
                                    </div>
                                  </div>
                                </div>
                                <div
                                  className="mobile-tab-actions"
                                  onClick={(e: any) => {
                                    e.stopPropagation();
                                    const options = {
                                      type: "normal",
                                      items: [
                                        {
                                          icon: (
                                            <MenuIcon name="bookmark_remove" />
                                          ),
                                          title: "Remove Bookmark",
                                          onClick: () => {
                                            handleRemoveBookmark(tabId);
                                            closePopupSettings();
                                          },
                                        },
                                        {
                                          icon: <MenuIcon name="delete" />,
                                          title: t("deleteTab"),
                                          onClick: () => {
                                            handleRemoveBookmark(tabId);
                                            removeTab(tabId);
                                            closePopupSettings();
                                          },
                                          active: TabOptions.Delete.active,
                                        },
                                      ].filter(Boolean),
                                    };
                                    openPopupSettings(options);
                                  }}
                                >
                                  <MenuIcon name={"more_vert"} />
                                </div>
                              </div>
                            ) : null;
                          })
                        ) : (
                          <div className="empty-message">
                            No bookmarks in this category
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              )}

            {/* Divider between bookmarks and free tabs */}
            {showBookmarks &&
              Object.keys(bookmarks).length > 0 &&
              freeTabs.length > 0 && <div className="mobile-tabs-divider" />}

            {/* Free tabs (not bookmarked) */}
            {freeTabs.map((el: any) => (
              <div
                key={el.id}
                className={`mobile-tab ${activeTab === el.id ? "active" : ""}`}
                onClick={() => handleMobileTabClick(el)}
              >
                <div className="mobile-tab-left">
                  <div
                    className="mobile-tab-title"
                    style={{
                      zoom: (globalThis as any).changes?.uiTextSize || 1,
                    }}
                  >
                    {`${el.data?.book || el.data?.title || ""} – ${el.data?.chapter || ""}`}{" "}
                    <div className="mobile-tab-sub">
                      • {el.data?.shortName || ""}
                    </div>
                  </div>
                </div>
                <div
                  className="mobile-tab-actions"
                  onClick={(e: any) => {
                    e.stopPropagation();
                    const options = {
                      type: "normal",
                      items: [
                        {
                          icon: <MenuIcon name="bookmark" />,
                          title: "Bookmark",
                          onClick: () => {
                            closePopupSettings();
                            setTimeout(() => handleBookmarkTab(el.id), 100);
                          },
                        },
                        {
                          icon: <MenuIcon name="delete" />,
                          title: t("deleteTab"),
                          onClick: () => {
                            removeTab(el.id);
                            closePopupSettings();
                          },
                          active: TabOptions.Delete.active,
                        },
                      ].filter(Boolean),
                    };
                    openPopupSettings(options);
                  }}
                >
                  <MenuIcon name={"more_vert"} />
                </div>
              </div>
            ))}
          </div>

          <div
            className={`mobile-bottom-nav ${
              removeBookMark && removeAddSession ? "single" : "multiple"
            }`}
          >
            {!removeJoinSession && (
              <button
                className="mobile-nav-btn"
                onClick={() => {
                  // setSideBarMode("settings");
                  openPopupSettings(SessionsOptions);
                }}
              >
                <MenuIcon name={"person_add"} />
                <div
                  className="mobile-nav-label"
                  style={{ zoom: (globalThis as any).changes?.uiTextSize || 1 }}
                >
                  {t("sessions")}
                </div>
              </button>
            )}

            <button className="mobile-nav-add" onClick={mobileAddTab}>
              <span>
                <PlusIcon />
              </span>
            </button>

            {!removeBookMark && (
              <button
                className={`mobile-nav-btn${showBookmarks ? " active" : ""}`}
                onClick={() => {
                  setShowBookmarks((prev) => !prev);
                }}
              >
                <span className="material-symbols-outlined">
                  {/* {showBookmarks ? "bookmark" : "bookmark_border"} */}
                  <BookMarkIcon
                    stroke={
                      showBookmarks ? "var(--selectedSpaceColor)" : "black"
                    }
                    fill={showBookmarks ? "var(--selectedSpaceColor)" : "none"}
                  />
                </span>
                <div
                  className="mobile-nav-label"
                  style={{ zoom: (globalThis as any).changes?.uiTextSize || 1 }}
                >
                  Bookmarks
                </div>
              </button>
            )}
          </div>

          <style>{`
            .mobile-sidebar-overlay{
              position:fixed;
              inset:0;
              background:var(--panelBackground, #fff);
              z-index:10002;
              display:flex;
              flex-direction:column;
              color:var(--text1);
            }
            .mobile-sidebar-header{
              display:flex;
              justify-content:space-between;
              align-items:center;
              padding:18px 16px;
              border-bottom:1px solid #eee;
            }
            .mobile-sidebar-header h2{margin:0;font-size:18px;font-weight:700}
            .mobile-header-actions{display:flex;gap:12px;align-items:center}
            .mobile-header-icon{cursor:pointer;display:flex;align-items:center}
            .mobile-tabs-list{
                                overflow: auto;
                        padding-top: 15px;
                        flex: 1;
                        display: flex;
                        justify-content: start;
                        flex-direction: column;
                        align-items: center;
            }
            .mobile-tab{display:flex;justify-content:space-between;align-items:center;padding:11px;border-radius:10px;margin-bottom:12px;border:1px solid transparent;cursor:pointer;width: 90%;height: 54px;}
            .mobile-tab.active{
                background: var(--activeTabFill);
                border-color: var(--activeTabBorder);
                color: var(--activeTabText);
            }
            .mobile-tab-title{font-weight:600;font-size:16px}
            .mobile-tab-sub{font-size:14px;color:rgba(0,0,0,0.45);margin-top:4px;display: inline;}
            .mobile-tab-left{display:flex;flex-direction:column}
            .mobile-tab-actions{opacity:0.6;cursor:pointer;display:flex;align-items:center;}
            .mobile-tab-actions:hover{opacity:1;}
            .mobile-bottom-nav{display:flex;align-items:center;padding:12px 30px;border-top:1px solid #eee}
            .mobile-bottom-nav.single {justify-content: center;}
            .mobile-bottom-nav.multiple {justify-content: space-between;}
            .mobile-nav-btn{background:none;border:none;display:flex;flex-direction:column;align-items:center;gap:6px;color:var(--text1);cursor:pointer}
            .mobile-nav-label{font-size:12px}
            .mobile-nav-add{
            border-radius: 46px;
            background: var(--selectedSpaceColor);
            border: none;
            color: white;
            font-size: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            width: 82px;
            height: 52px;
            padding-top: 7px;
            }

            /* bookmark folder styles */
            .bookmark-category {
              width: 90%;
              margin-bottom: 4px;
            }
            .bookmark-category-header {
              display: flex;
              align-items: center;
              padding: 12px 4px;
              background: transparent;
              cursor: pointer;
              font-weight: 600;
              font-size: 16px;
              color: var(--text1);
              transition: background 0.2s;
              gap: 10px;
            }
            .bookmark-category-header:hover {
              background: rgba(0,0,0,0.03);
              border-radius: 8px;
            }
            .bookmark-icon {
              display: flex;
              align-items: center;
              font-size: 20px;
              color: var(--text1);
            }
            .category-title {
              flex: 1;
            }
            .collapse-icon {
              display: flex;
              align-items: center;
              transition: transform 0.2s;
              color: rgba(0,0,0,0.6);
            }
            .collapse-icon.expanded {
              transform: rotate(180deg);
            }
            .bookmark-items {
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 0;
            }
            .bookmark-items .mobile-tab {
              width: 100%;
            }
            .mobile-tabs-divider {
              width: 90%;
              height: 1px;
              background: #eee;
              margin: 8px 0 16px;
            }
            .empty-message {
              padding: 32px 16px;
              text-align: center;
              color: rgba(0,0,0,0.5);
              font-size: 14px;
            }

            /* bookmark modals */
            .mobile-modal-overlay {
              position: fixed;
              inset: 0;
              background: rgba(0,0,0,0.4);
              z-index: 10004;
              display: flex;
              align-items: flex-end;
              justify-content: center;
            }
            .mobile-modal {
              background: var(--panelBackground, #fff);
              width: 100%;
              max-width: 100%;
              border-top-left-radius: 16px;
              border-top-right-radius: 16px;
              padding: 24px;
              box-shadow: 0 -4px 12px rgba(0,0,0,0.15);
              max-height: 80vh;
              overflow-y: auto;
            }
            .mobile-modal h3 {
              margin: 0 0 16px;
              font-size: 18px;
              font-weight: 700;
              color: var(--text1);
            }
            .mobile-modal input {
              width: 100%;
              padding: 12px;
              border: 1px solid #ddd;
              border-radius: 8px;
              font-size: 16px;
              margin-bottom: 16px;
              box-sizing: border-box;
              color: var(--text1);
            }
            .mobile-modal input::placeholder {
              color: rgba(0,0,0,0.4);
            }
            .mobile-modal .category-item {
              display: flex;
              align-items: center;
              padding: 12px;
              border: 1px solid #e0e0e0;
              border-radius: 8px;
              margin-bottom: 8px;
              cursor: pointer;
              transition: background 0.2s;
            }
            .mobile-modal .category-item:hover {
              background: rgba(0,0,0,0.03);
            }
            .mobile-modal .category-item input[type=radio] {
              margin-right: 12px;
              cursor: pointer;
              width: 18px;
              height: 18px;
            }
            .mobile-modal .category-item span {
              flex: 1;
              color: var(--text1);
            }
            .mobile-modal .modal-actions {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              margin-top: 20px;
            }
            .mobile-modal .modal-actions button {
              flex: 1;
              padding: 12px 16px;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: opacity 0.2s;
            }
            .mobile-modal .modal-actions button:active {
              opacity: 0.8;
            }
            .mobile-modal .modal-actions .cancel {
              background: #f0f0f0;
              color: var(--text1);
            }
            .mobile-modal .modal-actions .create {
              background: var(--selectedSpaceColor);
              color: #fff;
            }
            .mobile-modal .add-new {
              cursor: pointer;
              color: var(--selectedSpaceColor);
              padding: 12px 0;
              text-align: center;
              font-weight: 500;
              margin: 12px 0;
            }
          `}</style>

          {/* bookmark category modal */}
          {showBookmarkModal && (
            <div
              className="mobile-modal-overlay"
              onClick={() => setShowBookmarkModal(false)}
            >
              <div
                className="mobile-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <h3>Add to bookmark category</h3>
                {Object.keys(bookmarks).length > 0 ? (
                  <>
                    {Object.keys(bookmarks).map((cat) => (
                      <label key={cat} className="category-item">
                        <span>{cat}</span>

                        <input
                          type="radio"
                          name="bookmarkCat"
                          value={cat}
                          checked={selectedCategory === cat}
                          onChange={() => setSelectedCategory(cat)}
                        />
                      </label>
                    ))}
                    <div
                      className="add-new"
                      onClick={() => {
                        setShowBookmarkModal(false);
                        setShowNewCategoryModal(true);
                      }}
                    >
                      + Add to new
                    </div>
                  </>
                ) : (
                  <div
                    className="add-new"
                    onClick={() => {
                      setShowBookmarkModal(false);
                      setShowNewCategoryModal(true);
                    }}
                  >
                    + Create first category
                  </div>
                )}
                <div className="modal-actions">
                  <button
                    className="cancel"
                    onClick={() => setShowBookmarkModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="create"
                    onClick={() => handleAddToCategory(selectedCategory)}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* rename category modal */}
          {renamingCategory && (
            <div
              className="mobile-modal-overlay"
              onClick={() => setRenamingCategory("")}
            >
              <div
                className="mobile-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <h3>Rename category</h3>
                <input
                  placeholder="Category name"
                  value={renameValue}
                  onChange={(e: any) => setRenameValue(e.target.value)}
                  onKeyPress={(e: any) => {
                    if (e.key === "Enter") handleRenameCategory();
                  }}
                  autoFocus
                />
                <div className="modal-actions">
                  <button
                    className="cancel"
                    onClick={() => setRenamingCategory("")}
                  >
                    Cancel
                  </button>
                  <button className="create" onClick={handleRenameCategory}>
                    Rename
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* new category modal */}
          {showNewCategoryModal && (
            <div
              className="mobile-modal-overlay"
              onClick={() => setShowNewCategoryModal(false)}
            >
              <div
                className="mobile-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <h3>New bookmark category</h3>
                <input
                  placeholder="Category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleCreateCategory();
                  }}
                />
                <div className="modal-actions">
                  <button
                    className="cancel"
                    onClick={() => setShowNewCategoryModal(false)}
                  >
                    Cancel
                  </button>
                  <button className="create" onClick={handleCreateCategory}>
                    Create
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }
  return (
    <>
      {isResizing.current && (
        <style>
          {`
                      *{
                        user-select:none;
                        }
                    `}
        </style>
      )}
      {fullScreen && (
        <div
          onClick={() => setFullScreen(false)}
          style={{
            position: "absolute",
            left: "10px",
            top: "20px",
            zIndex: 99999,
            cursor: "pointer",
          }}
        >
          <BurgerMenuIcon size={24} color="var(--text1)" />
        </div>
      )}
      {
        null /* {isMobile && !openOnMobile && (
        <div
          onClick={() => {
            setSidebarWidth(300);
            setOpenOnMobile(true);
            globalThis?.setOpenSidebar && setOpenSidebar(false);
          }}
          style={{
            position: "absolute",
            left: "10px",
            top: "40px",
            zIndex: 99999,
            cursor: "pointer",
          }}
        >
          <BurgerMenuIcon size={24} color="var(--text1)" />
        </div>
      )} */
      }
      {sidebarWidth === 0 && (
        <div
          onMouseDown={() => {
            setSidebarWidth(300);
            setCollapsed(false);
          }}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "12px",
            height: "100vh",
            backgroundColor: "var(--primary-color)",
            borderTopRightRadius: "50%",
            borderBottomRightRadius: "50%",
            opacity: 0,
            transition: "opacity 0.3s ease-in-out",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.target.style.opacity = "1")}
          onMouseLeave={(e) => (e.target.style.opacity = "0")}
        ></div>
      )}
      <div
        onMouseUp={() => setIsDragging(false)}
        style={{
          width: `${Math.round(sidebarWidth * ((globalThis as any).changes?.uiTextSize || 1))}px`,
          display: sidebarWidth === 0 ? "none" : null,
        }}
        ref={sidebarRef}
        className={
          collapsed
            ? "sidebar-collapsed"
            : `sidebar-1 ${openOnMobile ? "open" : null} ${
                fullScreen ? "floatSidebar" : null
              }`
        }
      >
        <div
          onMouseDown={handleMouseDown}
          style={{
            position: "absolute",
            right: "0",
            top: "0",
            width: "10px",
            height: "100%",
            background: "",
            cursor: "pointer",
          }}
        ></div>

        <div
          className="headbar"
          style={{ zoom: (globalThis as any).changes?.uiTextSize || 1 }}
        >
          {!collapsed ? (
            <>
              <div className="menuOptions">
                <span
                  onClick={() => {
                    const mob = window.innerWidth < 768;
                    if (!mob) {
                      setSidebarWidth(60);
                      setCollapsed(true);
                      setMultiSelectMode(false);
                    } else {
                      setMultiSelectMode(false);
                      setSidebarWidth(0);
                      setOpenOnMobile(false);
                    }
                  }}
                  className="material-symbols-outlined"
                  style={{ color: "var(--openCloseMenuIcon, var(--text1))" }}
                >
                  menu_open
                </span>
                <div>
                  {customIcon ? (
                    <span
                      onClick={() =>
                        customIcon.link && os.openURL(customIcon.link)
                      }
                      className="material-symbols-outlined"
                    >
                      {customIcon.icon}
                    </span>
                  ) : (
                    <span></span>
                  )}
                </div>
                {isSiteOfClient && (
                  <ClientLogo
                    handleOpenClientSite={handleOpenClientSite}
                    url={clientLogo}
                    alt={clientName}
                  />
                )}
              </div>
              <div className="canvasOptions">
                <span
                  style={{
                    paddingTop: customScreens?.value >= 2 ? "3px" : "0px",
                    color: "var(--selectPanelIcon, var(--pageTextColor))",
                    display: hidePanels ? "none" : "",
                    height: "22px",
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    globalThis._skipNextMouse = true; // block next onMouseUp
                    SetShowScreenPanelOption(true);
                  }}
                  onMouseDown={(e) => {
                    // ignore if it's a right-click
                    if (e.button === 2) return;

                    globalThis._hold = false;
                    globalThis._holdTimeout = setTimeout(() => {
                      SetShowScreenPanelOption(true);
                      globalThis._hold = true;
                    }, 1000);
                  }}
                  onMouseUp={(e) => {
                    // ignore if we just did a right-click
                    setTimeout(() => {
                      if (globalThis._skipNextMouse) {
                        globalThis._skipNextMouse = false;
                        return;
                      }

                      clearTimeout(globalThis._holdTimeout);
                      if (!globalThis._hold) {
                        openPopupSettings(
                          <ScreenOptions setCustomScreens={setCustomScreens} />,
                          null,
                          true
                        );
                      }
                    }, 10);
                  }}
                  onMouseLeave={() => clearTimeout(globalThis._holdTimeout)}
                >
                  {panelsNumber <= 1 ? (
                    <SingleScreenIcon filter="var(--filter-mode)" />
                  ) : panelsNumber === 2 ? (
                    <DualScreenIcon filter="var(--filter-mode)" />
                  ) : panelsNumber === 3 ? (
                    <ThreeScreenIcon filter="var(--filter-mode)" />
                  ) : panelsNumber === 4 ? (
                    <QuadScreenIcon filter="var(--filter-mode)" />
                  ) : null}
                </span>
                <span
                  onClick={() => {
                    openPopupSettings(MenuOptions);
                  }}
                  className="material-symbols-outlined PageOptionsButton"
                  style={{ color: "var(--moreIcon, var(--text1))" }}
                >
                  more_vert
                </span>
              </div>
            </>
          ) : null}
        </div>

        {!collapsed && (
          <>
            <div className="sidebarLine"></div>
            {showSearch && (
              <div className="searchSection">
                <span className="material-symbols-outlined">search</span>
                <input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}
            {!configBot.tags.staticInst && <UserPresence />}
            {sharedTab && (
              <Tab
                key={sharedTab.id}
                el={sharedTab}
                index={0}
                onlineUsers={onlineUsers}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                setIsDragging={setIsDragging}
                setElement={setElement}
                collapsed={collapsed}
                editMode={editMode}
                sharedTab={true}
                setSidebarWidth={setSidebarWidth}
                setCollapsed={setCollapsed}
              />
            )}
            <div
              className="tabsContainer"
              style={{ zoom: (globalThis as any).changes?.uiTextSize || 1 }}
            >
              <span style={{ color: "var(--pageTextColor)" }}>
                {showBookmarksFilter ? `${t("tabs")} & Folders` : t("tabs")}
              </span>
              <div
                style={{ display: "flex", alignItems: "center", gap: "5px" }}
              >
                {!removeBookMark && (
                  <span
                    className={`sidebar-bookmark-filter-btn ${showBookmarksFilter ? "activeBM" : "inactiveBM"}`}
                    onClick={() => setShowBookmarksFilter((prev) => !prev)}
                    title={
                      showBookmarksFilter
                        ? "Show all tabs"
                        : "Show bookmarked tabs"
                    }
                  >
                    <BookMarkIcon
                      width={16}
                      height={16}
                      strokeWidth={2}
                      stroke={
                        showBookmarksFilter
                          ? "var(--addButtonIcon)"
                          : "var(--pageTextColor)"
                      }
                      fill={
                        showBookmarksFilter ? "var(--addButtonIcon)" : "none"
                      }
                    />
                  </span>
                )}
                <span
                  style={{ "user-select": "none" }}
                  onMouseDown={() => {
                    clearTimeout(holdTimeout.current.time);
                    holdTimeout.current.clicked = false;
                    holdTimeout.current.time = setTimeout(() => {
                      holdTimeout.current.clicked = true;
                      openPopupSettings(AddingOption(), true);
                    }, 600);
                  }}
                  onMouseUp={() => {
                    clearTimeout(holdTimeout.current.time);
                    if (!holdTimeout.current.clicked) {
                      addTab({
                        id: uuid(),
                        taken: false,
                        data: {
                          use: "thePage",
                          type: "book",
                          book: "Genesis",
                          bookId: "GEN",
                          chapter: 1,
                          translation: "AAB",
                          shortName: "AAB",
                        },
                      });
                    }
                    holdTimeout.current.clicked = false;
                  }}
                  onMouseLeave={() => {
                    clearTimeout(holdTimeout.current.time);
                    holdTimeout.current.clicked = false;
                  }}
                  className="material-symbols-outlined addIcon"
                >
                  add
                </span>
              </div>
            </div>
          </>
        )}
        {folders.map((folder) => (
          <Folder
            key={folder.id}
            onlineUsers={onlineUsers}
            folder={folder}
            collapsed={collapsed}
            setSidebarWidth={setSidebarWidth}
            setCollapsed={setCollapsed}
          />
        ))}
        {folders.length > 0 && (
          <div style={{ marginBottom: "10px" }} className={"sidebarLine"}></div>
        )}
        {multiSelectMode && !collapsed && (
          <div className="multiSelectActions">
            <label
              style={{
                display: "flex",
                "justify-content": "center",
                "align-items": "center",
                gap: "6px",
              }}
            >
              <input
                type="checkbox"
                className="customCheckbox"
                checked={selectedTabs.length === tabs.length}
                onChange={(e) =>
                  setSelectedTabs(e.target.checked ? tabs.map((t) => t.id) : [])
                }
              />
              Select All
            </label>
            <div
              style={{ background: "#bbc2c2", height: "20px", width: "2px" }}
            ></div>
            <div
              style={{
                display: "flex",
                "justify-content": "center",
                "align-items": "center",
                gap: "6px",
                cursor: "pointer",
              }}
              onClick={() => {
                selectedTabs.forEach((id) => removeTab(id));
                setSelectedTabs([]);
                setMultiSelectMode(false);
              }}
            >
              <span
                style={{ "font-size": "19px" }}
                class="material-symbols-outlined"
              >
                delete
              </span>
              <span>Delete All</span>
            </div>
            {/* <div
              style={{ background: "#bbc2c2", height: "20px", width: "2px" }}
            ></div> */}
            {/* <div
              style={{
                display: "flex",
                "justify-content": "center",
                "align-items": "center",
                gap: "6px",
                cursor: "pointer",
              }}
              onClick={() => {
                if (folders.length === 0) {
                  os.toast("You don't have any folders");
                  return;
                }
                const OPTIONS = { type: "normal", items: [] };
                folders.forEach((item) => {
                  OPTIONS.items.push({
                    icon: <MenuIcon name="folder" />,
                    title: `Add to ${item.name}`,
                    onClick: () => {
                      moveMultipleTabs(selectedTabs, item.id);
                      setSelectedTabs([]);
                      setMultiSelectMode(false);
                      closePopupSettings();
                    },
                  });
                });
                openPopupSettings(OPTIONS);
              }}
            >
              <span
                style={{ "font-size": "19px" }}
                class="material-symbols-outlined"
              >
                create_new_folder
              </span>
            </div> */}
          </div>
        )}
        {collapsed && (
          <div
            style={{
              display: "flex",
              "align-items": "center",
              "justify-content": "center",
              width: "100%",
              "flex-direction": "column",
              gap: "12px",
              "padding-top": "10px",
              cursor: "pointer",
            }}
          >
            <div
              onClick={() => {
                setSidebarWidth(280);
                setCollapsed(false);
              }}
              style={{ cursor: "pointer" }}
            >
              <BurgerMenuIcon size={24} color="var(--text1)" />
            </div>
            {!configBot.tags.staticInst && !removeJoinSession && (
              <UserPresence collapsed={true} />
            )}
            <div
              style={{
                height: "1px",
                width: "90%",
                background: "rgb(187, 194, 194)",
              }}
            ></div>
          </div>
        )}
        <div
          style={{
            "border-raduis": "8px",
            border: tabEntered ? "1px black dashed" : "",
          }}
          onPointerEnter={handleMouseEnter}
          onPointerLeave={handleMouseLeave}
          onPointerUp={handleMouseUpTab}
          className={collapsed ? "tabs-collapsed" : "tabs"}
        >
          {/* Bookmark folders (when bookmark filter is active) */}
          {showBookmarksFilter &&
            !collapsed &&
            Object.entries(bookmarks).map(
              ([categoryName, tabIds]: [string, any]) => (
                <div key={categoryName} className="desktop-bookmark-category">
                  <div
                    className="desktop-bookmark-category-header"
                    onClick={() =>
                      setDesktopExpandedCategories((prev) => ({
                        ...prev,
                        [categoryName]: !prev[categoryName],
                      }))
                    }
                  >
                    <span className="desktop-bookmark-icon">
                      <BookMarkIcon />
                    </span>
                    <span className="desktop-category-title">
                      {categoryName}
                    </span>
                    <span
                      className={`desktop-collapse-icon ${
                        desktopExpandedCategories[categoryName]
                          ? "expanded"
                          : ""
                      }`}
                    >
                      <span className="material-symbols-outlined">
                        expand_more
                      </span>
                    </span>
                  </div>
                  {desktopExpandedCategories[categoryName] && (
                    <div className="desktop-bookmark-items">
                      {tabIds.length > 0 ? (
                        tabIds.map((tabId: any) => {
                          const tab = tabs.find((t: any) => t.id === tabId);
                          return tab ? (
                            <Tab
                              key={tab.id}
                              el={tab}
                              index={0}
                              onlineUsers={onlineUsers}
                              activeTab={activeTab}
                              setActiveTab={setActiveTab}
                              setIsDragging={setIsDragging}
                              setElement={setElement}
                              collapsed={collapsed}
                              editMode={editMode}
                              setSidebarWidth={setSidebarWidth}
                              setCollapsed={setCollapsed}
                              isBookmarked={true}
                              onBookmarkClick={(tabId: string) => {
                                handleRemoveBookmark(tabId);
                              }}
                            />
                          ) : null;
                        })
                      ) : (
                        <div
                          style={{
                            padding: "8px 16px",
                            color: "var(--text2)",
                            fontSize: "13px",
                          }}
                        >
                          No bookmarks in this category
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            )}
          {/* Divider between bookmark folders and free tabs */}
          {showBookmarksFilter &&
            !collapsed &&
            Object.keys(bookmarks).length > 0 && (
              <div className="sidebarLine" style={{ margin: "6px 0" }}></div>
            )}
          {/* Tabs: always hide bookmarked tabs from the main list (they live inside bookmark folders) */}
          {tabs
            .filter((tab) => !tab.sharedTab)
            .filter((tab) => !bookmarkedTabIds.has(tab.id))
            .filter((tab) => {
              if (!searchQuery) return true;
              const query = searchQuery.toLowerCase();
              const name = tab?.data?.book || tab?.data?.title || "";
              const chapter = tab?.data?.chapter
                ? String(tab.data.chapter)
                : "";
              const shortName = tab?.data?.shortName || "";
              const type = tab?.data?.type || "";
              return (
                name.toLowerCase().includes(query) ||
                chapter.includes(query) ||
                shortName.toLowerCase().includes(query) ||
                type.toLowerCase().includes(query) ||
                `${name} - ${chapter}`.toLowerCase().includes(query)
              );
            })
            .map((el, index) => (
              <Tab
                key={el.id}
                el={el}
                index={index}
                onlineUsers={onlineUsers}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                setIsDragging={setIsDragging}
                setElement={setElement}
                collapsed={collapsed}
                editMode={editMode}
                setSidebarWidth={setSidebarWidth}
                setCollapsed={setCollapsed}
                isBookmarked={bookmarkedTabIds.has(el.id)}
                onBookmarkClick={(tabId: string) => {
                  if (bookmarkedTabIds.has(tabId)) {
                    handleRemoveBookmark(tabId);
                  } else {
                    handleBookmarkTab(tabId);
                  }
                }}
              />
            ))}

          {collapsed && (
            <span
              onMouseDown={() => {
                clearTimeout(holdTimeout.current.time);
                holdTimeout.current.clicked = false;
                holdTimeout.current.time = setTimeout(() => {
                  holdTimeout.current.clicked = true;
                  openPopupSettings(AddingOption(), true);
                }, 600);
              }}
              onMouseUp={() => {
                clearTimeout(holdTimeout.current.time);
                if (!holdTimeout.current.clicked) {
                  addTab({
                    id: uuid(),
                    taken: false,
                    data: {
                      use: "thePage",
                      type: "book",
                      book: "Genesis",
                      bookId: "GEN",
                      chapter: 1,
                      translation: "AAB",
                      shortName: "AAB",
                    },
                  });
                }
                holdTimeout.current.clicked = false;
              }}
              onMouseLeave={() => {
                clearTimeout(holdTimeout.current.time);
                holdTimeout.current.clicked = false;
              }}
              class="material-symbols-outlined addIconCollapsed"
            >
              add
            </span>
          )}
        </div>
        <AOLabUpdateCard />
        <style>{getStyleOf("sidebar.css")}</style>
        <style>{sidebarStyles}</style>
      </div>

      {/* Desktop bookmark category modal */}
      {showBookmarkModal && (
        <div
          className="desktop-modal-overlay"
          onClick={() => setShowBookmarkModal(false)}
        >
          <div className="desktop-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add to bookmark category</h3>
            {Object.keys(bookmarks).length > 0 ? (
              <>
                {Object.keys(bookmarks).map((cat) => (
                  <label key={cat} className="category-item">
                    <span>{cat}</span>

                    <input
                      type="radio"
                      name="bookmarkCatDesktop"
                      value={cat}
                      checked={selectedCategory === cat}
                      onChange={() => setSelectedCategory(cat)}
                    />
                  </label>
                ))}
                <div
                  className="add-new"
                  onClick={() => {
                    setShowBookmarkModal(false);
                    setShowNewCategoryModal(true);
                  }}
                >
                  + Add to new category
                </div>
              </>
            ) : (
              <div
                className="add-new"
                onClick={() => {
                  setShowBookmarkModal(false);
                  setShowNewCategoryModal(true);
                }}
              >
                + Create first category
              </div>
            )}
            <div className="modal-actions">
              <button
                className="cancel"
                onClick={() => setShowBookmarkModal(false)}
              >
                Cancel
              </button>
              <button
                className="create"
                onClick={() => handleAddToCategory(selectedCategory)}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop new category modal */}
      {showNewCategoryModal && (
        <div
          className="desktop-modal-overlay"
          onClick={() => setShowNewCategoryModal(false)}
        >
          <div className="desktop-modal" onClick={(e) => e.stopPropagation()}>
            <h3>New bookmark category</h3>
            <input
              placeholder="Category name"
              value={newCategoryName}
              onChange={(e) =>
                setNewCategoryName((e.target as HTMLInputElement).value)
              }
              onKeyPress={(e) => {
                if (e.key === "Enter") handleCreateCategory();
              }}
              autoFocus
            />
            <div className="modal-actions">
              <button
                className="cancel"
                onClick={() => setShowNewCategoryModal(false)}
              >
                Cancel
              </button>
              <button className="create" onClick={handleCreateCategory}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
export const SpaceUI = () => {
  const {
    setSideBarMode,
    collapsed,
    setCollapsed,
    sidebarWidth,
    setSidebarWidth,
    openOnMobile,
  } = useSideBarContext();
  const { screens, fullScreen, setFullScreen } = useBibleContext();
  const [globalProfilePic, setGlobalProfilePic] = useState();
  globalThis.SetGlobalProfilePic = setGlobalProfilePic;
  if (sidebarWidth !== 0)
    return (
      <>
        <style>{`
            .profileSection{
              width:${sidebarWidth}px !important;
            }
        `}</style>
        <div
          // style={{ width: `${sidebarWidth}px !important` }}
          className={
            collapsed
              ? "profileSection-collapsed"
              : `profileSection ${openOnMobile ? "open" : ""} ${
                  fullScreen ? "floatProfileSection" : null
                }`
          }
        >
          {!collapsed ? (
            <>
              <span
                style={{
                  cursor: "pointer",
                  color: "var(--settingsIcon, var(--text1))",
                }}
                onClick={() => setSideBarMode("settings")}
                className="material-symbols-outlined"
              >
                <MobileSettingsIcon filter="var(--filter-mode)" />
              </span>
              <SettingsProfile />
              <UserProfile />
            </>
          ) : (
            <>
              <Icon
                icon="settings"
                onClick={() => {
                  setCollapsed(false);
                  setSidebarWidth(280);
                  setSideBarMode("settings");
                }}
              />
              <UserProfile collapsed={true} />
            </>
          )}
          <style>{getStyleOf("sidebar.css")}</style>
        </div>
      </>
    );
};
const Icon = ({ icon, onClick }) => {
  return (
    <div className="icon-button" onClick={onClick}>
      <span className="material-symbols-outlined">{icon}</span>
    </div>
  );
};

export const SettingsProfile = () => {
  const [iss, setIss] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const holdTimeout = useRef(null);
  const {
    spaces,
    activeSpace,
    setActiveSpace,
    addSpace,
    updateSpace,
    removeSpace,
  } = useTabsContext();
  const { openPopupSettings } = useSideBarContext();
  const { setIsAbleToRightClick } = useMouseMove();

  const { sidebarMode, setSideBarMode, closePopupSettings, t } =
    useSideBarContext();

  const OPTIONS = (id) => {
    return {
      type: "normal",
      items: [
        {
          icon: <MenuIcon name="add" />,
          title: t("createNewSpace"),
          external: (
            <CreateNewSpaceModal addSpace={addSpace} activeSpace={id} />
          ),
          onClick: () => {},
        },
        { type: "line" },
        {
          icon: <MenuIcon name="edit" />,
          title: t("editSpace"),
          onClick: () => {
            setSideBarMode("settings");
          },
        },
        // { icon: <MenuIcon name="palette" />, title: 'Edit space',external: <CreateNewSpaceModal />, onClick: () => { } },
        { type: "line" },
        {
          icon: <MenuIcon name="download" />,
          title: t("importSpace"),
          external: <ImportSpaceModal />,
          onClick: () => {},
        },
        { type: "line" },
        {
          icon: <MenuIcon name="share" />,
          title: t("share"),
          onClick: () => {},
        },
        {
          icon: <MenuIcon name="delete" />,
          title: t("delete"),
          onClick: () => {
            removeSpace(id);
          },
        },
      ],
    };
  };

  const handleRightClick = (spaceId) => {
    openPopupSettings(OPTIONS(spaceId));
  };

  const handleMouseDown = (spaceId) => {
    setActiveSpace(spaceId);
    setTimeout(() => {
      globalThis.setOpenOnMobile(true);
    }, 10);
    // setIsHolding(false);
    // holdTimeout.current = setTimeout(() => {
    //     setIsHolding(true);
    //     handleRightClick(spaceId);
    // }, 900);
    // 1.2 seconds hold
  };

  const handleMouseUp = (spaceId) => {
    clearTimeout(holdTimeout.current);
    if (!isHolding) {
      setActiveSpace(spaceId);
    }
  };
  const removeSpaces =
    tags?.settingsConfigs?.presets?.[getSettingsPreset()]?.appSettings
      ?.removeSpaces;

  return (
    <div className="dot">
      {!removeSpaces &&
        spaces.map((space) => {
          return (
            <SurroundingDivs>
              <div
                onClick={() => handleMouseDown(space.id)}
                // onMouseUp={() => handleMouseUp(space.id)}
                // onMouseLeave={() => clearTimeout(holdTimeout.current)}
                onContextMenu={(e) => {
                  handleMouseDown(space.id);
                  handleRightClick(space.id);
                }}
                className={space.id === activeSpace ? "activeBg" : "bg"}
              >
                {!space?.icon ? (
                  <span></span>
                ) : (
                  <div
                    className="material-symbols-outlined"
                    style={{ scale: "0.6", cursor: "pointer" }}
                  >
                    {space.icon}
                  </div>
                )}
              </div>
            </SurroundingDivs>
          );
        })}
    </div>
  );
};

export const UserProfile = ({ collapsed }) => {
  const { setSideBarMode } = useSideBarContext();
  const [userData, setUserData] = useState(null);
  const getUserData = async () => {
    if (!authBot?.id) return;

    const data = await os.getData(tags.key, authBot.id);
    if (data.success) {
      const payload = data.data;
      setUserData(payload);
      setTagMask(
        thisBot,
        `${configBot.id}-photo`,
        payload?.photoLink,
        "shared"
      );
      globalThis.SetGlobalProfilePic(payload?.photoLink);
    }
  };
  useEffect(() => {
    getUserData();
  }, []);
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
  const { colorIndex, iconIndex } = GetOrSetVisualInTags(
    configBot.id,
    userData
  );
  const removeAccountOptions =
    tags?.settingsConfigs?.presets?.[getSettingsPreset()]?.appSettings
      ?.removeAccountOptions;
  const removeUserIcon =
    tags?.settingsConfigs?.presets?.[getSettingsPreset()]?.appSettings
      ?.removeUserIcon;
  const Icon = icons[iconIndex];
  if (removeUserIcon) return <div style={{ width: 40 }} />;
  return (
    <div
      onClick={
        removeAccountOptions
          ? undefined
          : () => {
              if (!authBot?.id) {
                globalThis.AccountSettingsEnteredFrom = "default";
                setSideBarMode("createAccountSettings");
              } else {
                openPopupSettings({
                  type: "normal",
                  items: [
                    {
                      icon: <MenuIcon name="account_circle" />,
                      title: "View profile",
                      onClick: () => {
                        globalThis.AccountSettingsEnteredFrom = "default";
                        setSideBarMode("createAccountSettings");
                      },
                    },
                    {
                      icon: <MenuIcon name="logout" />,
                      title: "Sign out",
                      onClick: async () => {
                        await os.signOut();
                        destroy(authBot);
                        setUserData(null);
                      },
                    },
                  ],
                });
              }
            }
      }
      style={{ background: userData?.photoLink && "transparent" }}
      className="userProfile"
    >
      <div
        onClick={() => {}}
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          // border: `2px solid ${!configBot.tags.staticInst ? colors[colorIndex] : "var(--pageTextColor)"}`,
          padding: 2,
          display: "flex",
          backgroundColor: "var(--addButtonIcon)",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
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
          <span
            className="material-symbols-outlined"
            style={{ color: "var(--primaryColor)" }}
          >
            person
          </span>
        )}
      </div>
      {
        null /*userData?.photoLink ? (
        <img
          style={{ "border-radius": "50%", width: "35px", border: "" }}
          src={userData?.photoLink}
        />
      ) : (
        <span className="material-symbols-outlined">person</span>
      )*/
      }
    </div>
  );
};

const sidebarStyles = `
    .sidebar-collapsed {
        padding: 15px 8px;
        width: 60px;
        height: 100vh;
        position: relative;
    }

  

    .collapsedMenu {
        display: flex;
        justify-content: center;
        width: 100%;
        cursor: pointer;
        margin-bottom:30px;
    }

    .tabs-collapsed {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-top: 20px;
        gap: 15px;
    }

    .tabInfoCollapsed {
        display: flex;
        justify-content: center;
        padding: 8px 0;
    }

    .profileSection-collapsed {
        position: absolute;
        left: 0;
        bottom: 26px;
        display: flex;
        flex-direction: column;
        gap: 15px;
        width: 100%;
        align-items: center;
    }

    .icon-button {
        cursor: pointer;
        color: var(--text1);
    }

    /* Sidebar header bookmark filter button */
    .sidebar-bookmark-filter-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 4px 4px 4px 4px;
        border-radius: 4px;
       
        filter: none !important;
        transition: opacity 0.15s, background 0.15s;
    }
    .inactiveBM {
    backgorund-color: none;
        border: 1.5px solid color-mix(in srgb, var(--pageTextColor) 30%, transparent) !important;
        }
    .activeBM {
    background-color: color-mix(in srgb, var(--addButtonIcon) 10%, transparent);
            border: 1.5px solid color-mix(in srgb, var(--addButtonIcon) 40%, transparent) !important;
      }

    .sidebar-bookmark-filter-btn:hover {
        opacity: 1;
     
    }

    /* Desktop tab bookmark icon */
    .tab-actions {
        display: flex;
        align-items: center;
        gap: 2px;
        flex-shrink: 0;
    }

    .tab-bookmark-btn {
        display: none;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 2px;
        border-radius: 3px;
        opacity: 0.6;
        line-height: 1;
    }

    .tab:hover .tab-bookmark-btn,
    .activeTab .tab-bookmark-btn {
        display: flex;
    }

    .tab-bookmark-btn:hover {
        opacity: 1;
        background: rgba(0, 0, 0, 0.06);
    }

    /* Desktop bookmark category folders */
    .desktop-bookmark-category {
        margin-bottom: 2px;
    }
    .desktop-bookmark-category-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        cursor: pointer;
        border-radius: 6px;
        user-select: none;
        font-weight: 500;
        font-size: 14px;
        color: var(--pageTextColor);
    }
    .desktop-bookmark-category-header:hover {
        background: rgba(0, 0, 0, 0.04);
    }
    .desktop-bookmark-icon {
        display: flex;
        align-items: center;
        flex-shrink: 0;
    }
    .desktop-category-title {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .desktop-collapse-icon {
        display: flex;
        align-items: center;
        transition: transform 0.2s;
        transform: rotate(-90deg);
    }
    .desktop-collapse-icon.expanded {
        transform: rotate(0deg);
    }
    .desktop-bookmark-items {
        padding-left: 8px;
    }

    /* Desktop bookmark modals */
    .desktop-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        z-index: 10004;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .desktop-modal {
        background: var(--pageBackground);
        color: var(--pageTextColor);
        width: 360px;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        max-height: 80vh;
        overflow-y: auto;
    }

    .desktop-modal h3 {
        margin: 0 0 16px;
        font-size: 16px;
        font-weight: 700;
        color: var(--pageTextColor);
    }

    .desktop-modal input {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 14px;
        margin-bottom: 16px;
        box-sizing: border-box;
        color: var(--pageTextColor);
        background: var(--inputBackground, #fff);
    }

    .desktop-modal .category-item {
      display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: background 0.15s;
    }

    .desktop-modal .category-item:hover {
        background: rgba(0, 0, 0, 0.04);
    }

    .desktop-modal .category-item input[type=radio] {
           margin-left: auto;
    cursor: pointer;
    width: auto;
    }

    .desktop-modal .category-item span {
        flex: 1;
        font-size: 14px;
        color: var(--text1);
        width: auto;
    }

    .desktop-modal .add-new {
        cursor: pointer;
        color: var(--selectedSpaceColor);
        padding: 10px 0;
        text-align: center;
        font-weight: 500;
        font-size: 14px;
        margin: 8px 0;
    }

    .desktop-modal .modal-actions {
        display: flex;
        gap: 12px;
        margin-top: 20px;
    }

    .desktop-modal .modal-actions button {
        flex: 1;
        padding: 10px 16px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.15s;
    }

    .desktop-modal .modal-actions button:hover {
        opacity: 0.85;
    }

    .desktop-modal .modal-actions .cancel {
        background: var(--inputBackground);
        color: var(--pageTextColor);
    }

    .desktop-modal .modal-actions .create {
        background: var(--selectedSpaceColor);
        color: var(--pageBackground);
    }
`;

export { SideBar };
