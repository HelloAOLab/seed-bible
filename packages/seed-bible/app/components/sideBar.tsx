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
} from "app.components.icons";
import { useBibleContext } from "app.hooks.bibleVariables";
import { useSideBarContext } from "app.hooks.sideBar";
import SurroundingDivs from "app.components.surroundingDivs";
import { TabOptions } from "app.components.types";
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
                backgroundColor: color,
                marginLeft: index > 0 ? "-4px" : "0",
                zIndex: visibleCount - index,
              }}
            >
              <IconComponent style={{ width: "12px", height: "12px" }} />
            </div>
          );
        })}

        {remaining > 0 && (
          <div
            onClick={() => setIsModalOpen(true)}
            style={{
              ...circleStyle,
              backgroundColor: "#9ca3af",
              fontSize: "12px",
              marginLeft: "-12px",
              zIndex: 0,
            }}
          >
            +{remaining}
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
                const { Icon, color } = globalThis?.GetOrSetVisualInTags(
                  value[0]
                );
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
                      <Icon style={{ width: "18px", height: "18px" }} />
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
}) {
  const { openPopupSettings, closePopupSettings, userURL } =
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

  const OPTIONS = (tab) => ({
    type: "normal",
    items: [
      {
        icon: <MenuIcon name="delete" />,
        title: "Delete tab",
        onClick: () => {
          removeTab(el.id);
          closePopupSettings();
        },
        active: TabOptions.Delete.active,
      },
      {
        icon: <MenuIcon name="edit" />,
        title: "Edit mode",
        onClick: () => {
          globalThis[`SetEnableEditorOf${tab.id}`]((prev) => !prev);
          closePopupSettings();
        },
        active: TabOptions.Edit.active,
      },
      {
        icon: <MenuIcon name="check_box" />,
        title: multiSelectMode ? `Deselect` : `Select`,
        onClick: () => {
          setMultiSelectMode((prev) => !prev);
          setSelectedTabs([activeTab]);
        },
        active: TabOptions.Select.active,
      },
    ],
  });
  const CANVASOPTIONS = {
    type: "normal",
    items: [
      {
        icon: <MenuIcon name="delete" />,
        title: "Delete tab",
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
        title: "Delete tab",
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
    if (activeTab === el.id) return;

    if (el.sharedTab) {
      globalThis?.HandleSharedTabClick();
    }
    const checkEmpty = PanelsApps.find((e) => !e.tabData);
    console.log(checkEmpty, PanelsApps);
    if (el.data.type === "book" && checkEmpty) {
      console.log("canvas replacing");
      setActiveTab(el.id);
      const id = uuid();
      ReplaceApplication(checkEmpty.id, {
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
    if (globalThis[`UpdateTabWidthId${el?.id}`])
      globalThis[`UpdateTabWidthId${el?.id}`](el);
    globalThis.UpdateTab(el);
  };
  const circles = onlineUsers
    ? Object.fromEntries(
        Object.entries(onlineUsers).filter(
          ([, v]) =>
            v?.bookId === el?.data?.bookId && v?.chapter === el?.data?.chapter
        )
      )
    : {};
  const notJoinedSharedTab =
    masks["sharedTab"] === el.id && activeTab !== el.id;
  const info = el.sharedTab && globalThis?.GetOrSetVisualInTags(el.hostId);

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
      onClick={handleTabClick}
      style={{
        ...(index === 0 &&
          masks["sharedTab"] === el.id && {
            "border-top": "none",
            "border-radius": "0 0 5px 5px",
            border: `1px solid ${info.color} !important`,
            background: `color-mix(in srgb, ${info.color} 50%, transparent) !important`,
            marginBottom: "5px",
          }),
      }}
      className={`

      ${index === 0 && masks["sharedTab"] === el.id && "sharedTab"}
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
          <div className="tabInfo">
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
            </span>
            <CircleCounter
              data={Object.entries(circles)}
              book={el?.data?.book}
              chapter={el?.data?.chapter}
            />
          </div>

          {activeTab === el.id && (
            <span
              onClick={() => {
                openPopupSettings(OPTIONS(el));
              }}
              style={{ display: activeTab ? "" : "none" }}
              className="material-symbols-outlined "
            >
              more_vert
            </span>
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

function Folder({ folder, onlineUsers, collapsed }) {
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
  const { openPopupSettings, closePopupSettings } = useSideBarContext();

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
    setTabEntered(false);
  }
  const OPTIONS = {
    type: "normal",
    items: [
      {
        icon: <MenuIcon name="delete" />,
        title: "Delete folder",
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

function SideBar() {
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
  } = useTabsContext();
  globalThis.AddTab = addTab;
  const { screens, setScreens, fullScreen, setFullScreen, ReSeed, setReSeed } =
    useBibleContext();
  const [customScreens, setCustomScreens] = useState({ value: 1 });
  const [onlineUsers, setOnlineUsers] = useState(false);
  globalThis.SetOnlineUsers = setOnlineUsers;
  const [showSearch, setShowSearch] = useState(false); // New state for search visibility
  const [editMode, setEditMode] = useState(false); // New state for edit mode
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
  } = useSideBarContext();
  const { setIsDragging, isDragging, setElement, Element } = useMouseMove();
  const [tabEntered, setTabEntered] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const isResizing = useRef(false);
  const sidebarRef = useRef();

  const handleMouseDown = (e) => {
    isResizing.current = true;
  };

  const handleMouseMove = (e) => {
    if (!isResizing.current) return;
    const newWidth = Math.max(40, Math.min(e.clientX, 300));
    if (newWidth <= 140) {
      setCollapsed(true);
    } else {
      setCollapsed(false);
    }
    if (newWidth < 55) {
      setSidebarWidth(0);
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
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const check = window.innerWidth < 768;
      setIsMobile(check);
      if (!check) {
        setSidebarWidth(280);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
      setOpenOnMobile(false);
      setIsMobile(true);
    }
  }, [customScreens]);

  const toggleSidebar = () => {
    if (isMobile) setOpenOnMobile(false);
    else setCollapsed(!collapsed);
  };

  // Toggle search visibility function
  const toggleSearchVisibility = () => {
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

  const ScreenOptions = ({ setCustomScreens }) => {
    return (
      <div
        style={{
          width: "370px",
          height: "100%",
          " flex-shrink": "0",
          "border-radius": "10px",
          background: " #202020",
          padding: "20px",
        }}
      >
        <div
          style={{
            color: "white",
            textAlign: "left",
            marginBottom: "10px",
            color: " #FFF",
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

  const MenuOptions = {
    type: "normal",
    items: [
      {
        disabled: !configBot.inst,
        icon: <MenuIcon name="screen_record" />,
        title: "Start session",
        onClick: () => {
          // os.log(globalThis?.StartSession,globalThis)
          HandleSharedTabClick();
        },
      },
      {
        disabled: false,
        icon: <MenuIcon name="logout" />,
        title: "Invite to session",
        onClick: async () => {
          const {QRCodeComponent} = thisBot.Chips();
          const url = `https://ao.bot/?pattern=SeedBibleDev&inst=${uuid()}&hosted=${configBot.id}`;
          ShowModal(<QRCodeComponent url={url} />);
        },
      },
      {
        disabled: false,
        icon: <MenuIcon name="content_copy" />,
        title: "Join another session",
         onClick: async () => {
          const id = await os.showInput("", {
            title: "Enter session link",
          });
          if (id) os.goToURL(id);
        },
      },
      { type: "line" },
      {
        disabled: false,
        icon: <MenuIcon name="fullscreen" />,
        title: "Full screen",
        onClick: () => {
          setFullScreen(true);
        },
      },
      { type: "line" },
      {
        disabled: false,
        icon: <MenuIcon name={showSearch ? "visibility_off" : "visibility"} />,
        title: showSearch ? "Hide Search" : "Show Search",
        onClick: toggleSearchVisibility,
      },
      // {
      //     disabled: false,
      //     icon: <MenuIcon name={editMode ? "edit_off" : "edit"} />,
      //     title: editMode ? 'Exit ReSeed Mode' : 'Enter ReSeed Mode',
      //     onClick: toggleEditMode
      // },
      // { disabled: true, icon: <MenuIcon name="extension" />, title: 'Extensions', onClick: () => { } },
      { type: "line" },
      {
        disabled: true,
        icon: <MenuIcon name="bug_report" />,
        title: "Report a bug",
        onClick: () => {},
      },
      {
        disabled: true,
        icon: <MenuIcon name="help" />,
        title: "Help",
        onClick: () => {},
      },
    ],
  };

  const AddingOption = () => {
    const input = {
      type: "normal",
      items: [
        {
          icon: <MenuIcon name="description" />,
          title: "Page tab",
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
                translation: "BSB",
              },
            });
            closePopupSettings();
          },
        },
        {
          icon: <MenuIcon name="create_new_folder" />,
          title: "New folder",
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
    os.log(customScreens, "customScreens");
  }, [customScreens]);

  const { moveMultipleTabs } = useTabsContext();
  const holdTimeout = useRef({ time: null, clicked: null });

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
          }}
        >
          <span className="material-symbols-outlined">menu</span>
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
          }}
        >
          <span className="material-symbols-outlined">menu</span>
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
          width: `${sidebarWidth}px`,
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

        <div className="headbar">
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
              </div>
              <div className="canvasOptions">
                <span
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
                  {customScreens?.value <= 1 ? (
                    <SingleScreenIcon />
                  ) : customScreens?.value === 2 ? (
                    <DualScreenIcon />
                  ) : customScreens?.value === 3 ? (
                    <ThreeScreenIcon />
                  ) : customScreens?.value === 4 ? (
                    <QuadScreenIcon />
                  ) : null}
                </span>
                <span
                  onClick={() => {
                    openPopupSettings(MenuOptions);
                  }}
                  className="material-symbols-outlined PageOptionsButton"
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
                <input placeholder="Search..." />
              </div>
            )}
            <UserPresence />
            {tabs
              .filter((tab) => tab.sharedTab)
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
                />
              ))}
            <div className="tabsContainer">
              <span>Tabs</span>
              <div
                style={{ display: "flex", alignItems: "center", gap: "5px" }}
              >
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
                          translation: "BSB",
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
            onlineUsers={onlineUsers}
            folder={folder}
            collapsed={collapsed}
            editMode={editMode}
          />
        ))}
        {folders.length > 0 && (
          <div style={{ marginBottom: "10px" }} className={"sidebarLine"}></div>
        )}
        {multiSelectMode && (
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
                      console.log(tabs.map((e) => selectedTabs.includes(e.id)));
                      moveMultipleTabs(selectedTabs, item.id);
                      setMultiSelectMode(false);
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
            </div>
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
            <span
              onclick={() => {
                setSidebarWidth(280);
                setCollapsed(false);
              }}
              class="material-symbols-outlined"
            >
              menu
            </span>
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
          {tabs
            .filter((tab) => !tab.sharedTab)
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
              />
            ))}

          {collapsed && (
            <span
              onClick={() => {
                openPopupSettings(AddingOption());
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
                style={{ cursor: "pointer" }}
                onClick={() => setSideBarMode("settings")}
                className="material-symbols-outlined"
              >
                settings
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

  const { sidebarMode, setSideBarMode, closePopupSettings } =
    useSideBarContext();

  const OPTIONS = (id) => {
    return {
      type: "normal",
      items: [
        {
          icon: <MenuIcon name="add" />,
          title: "Create a new space",
          external: (
            <CreateNewSpaceModal addSpace={addSpace} activeSpace={id} />
          ),
          onClick: () => {},
        },
        { type: "line" },
        {
          icon: <MenuIcon name="edit" />,
          title: "Edit space",
          onClick: () => {
            setSideBarMode("settings");
          },
        },
        // { icon: <MenuIcon name="palette" />, title: 'Edit space',external: <CreateNewSpaceModal />, onClick: () => { } },
        { type: "line" },
        {
          icon: <MenuIcon name="download" />,
          title: "Import space",
          external: <ImportSpaceModal />,
          onClick: () => {},
        },
        { type: "line" },
        { icon: <MenuIcon name="share" />, title: "Share", onClick: () => {} },
        {
          icon: <MenuIcon name="delete" />,
          title: "Delete",
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

  return (
    <div className="dot">
      {spaces.map((space) => {
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
  const { colorIndex, iconIndex } = GetOrSetVisualInTags(configBot.id);
  const Icon = icons[iconIndex];
  return (
    <div
      onClick={() => {
        globalThis.AccountSettingsEnteredFrom = "default";
        setSideBarMode("createAccountSettings");
      }}
      style={{ background: userData?.photoLink && "transparent" }}
      className="userProfile"
    >
      <div
        onClick={() => {}}
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          border: `2px solid ${colors[colorIndex]}`,
          padding: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <Icon width={15} height={15} />
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
        color: var(--themeText1);
    }
`;

export { SideBar };
