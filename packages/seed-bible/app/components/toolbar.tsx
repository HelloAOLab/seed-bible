import { getStyleOf } from "app.styles.styler";
import { getSettingsPreset } from "app.components.types";
const { useEffect, useState, useRef } = os.appHooks;

import { useSideBarContext } from "app.hooks.sideBar";
import { useMouseMove } from "app.hooks.mouseMove";
import SurroundingDivs from "app.components.surroundingDivs";
import { useBibleContext } from "app.hooks.bibleVariables";
import { useTabsContext } from "app.hooks.tabs";
import { BurgerMenuIcon, MoreIcon, TabsIcon } from "app.components.icons";

const G = globalThis as any;

// Simple, single-toolbar component (no edit layer). Main logic unchanged.
export function Toolbar() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    navFunctions,
    setScreens,
    tools,
    canvasTools,
    mapTools,
    mapMode,
    setTools,
    setCanvasTools,
    setMapTools,
    showNavArrows,
  }: any = useBibleContext();

  const {
    sidebarMode,
    openOnMobile,
    isMobile,
    setSidebarWidth,
    setOpenOnMobile,
    setCollapsed,
    setSideBarMode,
  }: any = useSideBarContext();

  // Hide nav arrows on mobile when a non-default sidebar panel (e.g. settings) is open
  const mobileSettingsOpen = isMobile && sidebarMode !== "default";

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<any>(null);
  useEffect(() => {
    os.addBotListener(thisBot, "onMobileScrollDown", (data) => {
      setShowMoreMenu(false);
    });
  }, []);

  useEffect(() => {
    if (!showMoreMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMoreMenu]);

  const [activeMoreApp, setActiveMoreApp] = useState(G.ActiveMoreApp || null);
  globalThis.setActiveMoreApp = setActiveMoreApp;
  globalThis.ActiveMoreApp = activeMoreApp;
  const [activeApp, setActiveApp] = useState(G.makingApp || null);

  // Watch globalThis.makingApp so arrows hide for ANY open app, not just More-button apps
  useEffect(() => {
    let _val = G.makingApp;
    Object.defineProperty(G, "makingApp", {
      get: () => _val,
      set: (val) => {
        _val = val;
        setActiveApp(val || null);
      },
      configurable: true,
    });
    return () => {
      Object.defineProperty(G, "makingApp", {
        value: _val,
        writable: true,
        configurable: true,
      });
    };
  }, []);

  const { setIsDragging, isDragging, setElement }: any = useMouseMove();
  const {
    activeSpace,
    updateToolsForSpace,
    getToolsForActiveSpace,
    activeTab,
    tabs,
  }: any = useTabsContext();

  // Get ActiveMoreApp and setActiveMoreApp
  useEffect(() => {
    G.ActiveMoreApp = activeMoreApp;
    G.SetActiveMoreApp = setActiveMoreApp;
    return () => {
      G.ActiveMoreApp = null;
      G.SetActiveMoreApp = null;
    };
  }, [activeMoreApp]);

  // === keep original default-toolbar logic ===
  const [showToolbar, setShowToolbar] = useState(false);
  G.SetShowToolbar = setShowToolbar;
  // useEffect(() => {
  //   setShowToolbar(!openOnMobile);
  // }, [openOnMobile]);

  const TabTools = getToolsForActiveSpace();
  const setActiveTools = (newTools: any) =>
    updateToolsForSpace(activeSpace, newTools);

  const [oldList, setOldList] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const holdTimeoutRef = useRef<any>(null);
  const hasHeldRef = useRef(false);

  useEffect(() => {
    G.SetScreens = setScreens;
  }, [setScreens]);

  useEffect(() => () => clearTimeout(holdTimeoutRef.current), []);

  function handleMouseEnter(targetIndex: any) {
    if (!isDragging || draggedIndex === null) return;
    if (targetIndex === draggedIndex) return;

    const reordered = [...TabTools];
    const [movedItem] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, movedItem);

    setActiveTools(reordered);
    setDraggedIndex(targetIndex);
  }

  function handleMouseLeaveContainer() {
    if (isDragging) {
      setIsDragging(false);
      setActiveTools(oldList);
      setDraggedIndex(null);
    }
  }

  function handleMouseUp() {
    if (!isDragging) return;
    setIsDragging(false);
    setElement(null);
    setDraggedIndex(null);
  }

  // Detect if current translation is RTL (Arabic)
  const [isRTL, setIsRTL] = useState(false);

  // Sync tools with active tab type (keeps main logic)
  useEffect(() => {
    if (!activeTab || !tabs) return;
    const activeTabObj = tabs.find((t: any) => t.id === activeTab);

    // Check if translation is Arabic/RTL
    const translation = activeTabObj?.data?.translation;
    if (translation === "ARBNAV" || translation === "arb_vdv") {
      setIsRTL(true);
    } else {
      setIsRTL(false);
    }

    if (activeTabObj?.data?.type === "canvas") {
      setActiveTools([...canvasTools]);
    } else {
      setActiveTools([...tools]);
    }
  }, [activeTab, tabs, canvasTools, tools]);

  // expose setters globally (kept behavior)
  useEffect(() => {
    G.SetTools = setTools;
    G.SetCanvasTools = setCanvasTools;
    G.SetMapTools = setMapTools;
    return () => {
      G.SetTools = null;
      G.SetCanvasTools = null;
      G.SetMapTools = null;
    };
  }, [setTools, setCanvasTools, setMapTools]);

  // Disable context menu like before
  useEffect(() => {
    const handleContextMenu = (e: any) => e.preventDefault();
    window.addEventListener("contextmenu", handleContextMenu);
    os.addBotListener(configBot, "onBotChanged", (that) => {
      if (that.tags.includes("book")) {
        G.Open(configBot.tags.book, configBot.tags.chapter);
      } else if (that.tags.includes("chapter")) {
        G.Open(configBot.tags.book, configBot.tags.chapter);
      }
    });
    return () => window.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  const moreTools = tools ? tools.filter((t: any) => t?.active !== false) : [];
  const mobileBookLogo =
    tags?.settingsConfigs?.presets?.[getSettingsPreset()]?.mobileBookLogo;
  const presetToolBarIcon =
    tags?.settingsConfigs?.presets?.[getSettingsPreset()]?.titlesAndIcon?.icon;
  const presetToolBarTitle =
    tags?.settingsConfigs?.presets?.[getSettingsPreset()]?.titlesAndIcon?.title;
  const presetToolName =
    tags?.settingsConfigs?.presets?.[getSettingsPreset()]?.titlesAndIcon
      ?.toolName;

  if (!showToolbar) return <></>;

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
      />

      <div className="toolbar-container-1 boundElements">
        <SurroundingDivs action={handleMouseLeaveContainer}>
          {/* Mobile Bottom Navbar */}
          <div className="mobile-bottom-navbar">
            <button
              style={{
                display:
                  showNavArrows && !activeApp && !mobileSettingsOpen
                    ? ""
                    : "none",
              }}
              className="mobile-navbar-arrow left-arrow"
              onClick={() =>
                isRTL
                  ? navFunctions?.openNextChapter()
                  : navFunctions?.openPrevChapter()
              }
              title="Previous"
              aria-label="Previous chapter"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>

            <button
              className="mobile-navbar-btn today-btn"
              title="Today"
              aria-label="Today"
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeMoreApp || activeApp) {
                    if (activeMoreApp) {
                      G.RemoveApplicationByLabel(activeMoreApp);
                      setActiveMoreApp(null);
                    }
                    G.makingApp = null;
                  }
                  os.log("Opening mobile settings", setOpenOnMobile);
                  setOpenOnMobile(true);
                  setSidebarWidth(280);
                  setCollapsed(false);
                  setSideBarMode("default");
                }}
                className="mobile-btn-content"
              >
                <TabsIcon color="var(--text1)" />
                <span className="mobile-btn-label">Tabs</span>
              </div>
            </button>

            <div
              onClick={() => {
                if (activeMoreApp || activeApp) {
                  if (activeMoreApp) {
                    if (G.openSidebar) {
                      G.RemoveApplicationByLabel(activeMoreApp);
                      setActiveMoreApp(null);
                    }
                    G.setOpenSidebar(!G.openSidebar);
                  }
                  G.makingApp = null;
                } else {
                  G.setOpenSidebar(!G.openSidebar);
                }
                G.setSelectingTranslation(false);
                // setShowMoreMenu(false);
              }}
              className="mobile-center-logo"
            >
              <div className="logo-container">
                <img
                  src={
                    mobileBookLogo ||
                    "https://res.cloudinary.com/dacw0qnpr/image/upload/v1759916122/Seed_Bible_-_All_Logos_2025-25_vvawwg.png"
                  }
                  alt="Seed Bible"
                  className="seed-bible-logo"
                />
              </div>
            </div>

            {!mobileBookLogo ? (
              <div className="more-btn-wrapper" ref={moreMenuRef}>
                {showMoreMenu && (
                  <div className="more-menu-popup">
                    {moreTools
                      .filter((tool: any) => tool.label !== "Books")
                      .map((tool: any, i: any) => (
                        <button
                          key={i}
                          className="more-menu-item"
                          onClick={() => {
                            tool?.onClick?.();
                            setShowMoreMenu(false);
                            setActiveMoreApp(tool.label);
                          }}
                        >
                          {tool?.isImg ? (
                            <img
                              src={tool.icon}
                              style={{ width: "20px" }}
                              alt={tool.label}
                            />
                          ) : (
                            <span className="material-symbols-outlined">
                              {tool?.icon}
                            </span>
                          )}
                          <span className="more-menu-item-label">
                            {tool?.label}
                          </span>
                        </button>
                      ))}
                  </div>
                )}
                <button
                  className="mobile-navbar-btn more-btn"
                  title={activeMoreApp ? "Close" : "More"}
                  aria-label={activeMoreApp ? "Close" : "More"}
                  onClick={() => {
                    if (activeMoreApp) {
                      (globalThis as any).RemoveApplicationByLabel(
                        activeMoreApp
                      );
                      (globalThis as any).makingApp = null;
                      setActiveMoreApp(null);
                    } else {
                      setShowMoreMenu((prev) => !prev);
                    }
                  }}
                >
                  <div className="mobile-btn-content">
                    {activeMoreApp ? (
                      <span className="material-symbols-outlined">close</span>
                    ) : (
                      <MoreIcon color="var(--text1)" />
                    )}
                    <span className="mobile-btn-label">
                      {activeMoreApp ? "Close" : "More"}
                    </span>
                  </div>
                </button>
              </div>
            ) : (
              <div className="more-btn-wrapper">
                <button
                  className="mobile-navbar-btn"
                  title={activeMoreApp ? "Close" : presetToolBarTitle}
                  aria-label={activeMoreApp ? "Close" : presetToolName}
                  onClick={() => {
                    if (activeMoreApp) {
                      (globalThis as any).RemoveApplicationByLabel(
                        activeMoreApp
                      );
                      (globalThis as any).makingApp = null;
                      setActiveMoreApp(null);
                    } else {
                      setActiveMoreApp(presetToolName);
                      const exploreTool = tools?.find(
                        (t) => t?.label === presetToolName
                      );
                      exploreTool?.onClick?.();
                    }
                  }}
                >
                  <div className="mobile-btn-content">
                    {activeMoreApp ? (
                      <span className="material-symbols-outlined">close</span>
                    ) : (
                      <span className="material-symbols-outlined">
                        {presetToolBarIcon}
                      </span>
                    )}
                    <span className="mobile-btn-label">
                      {activeMoreApp ? "close" : presetToolBarTitle}
                    </span>
                  </div>
                </button>
              </div>
            )}

            <button
              style={{
                display:
                  showNavArrows && !activeApp && !mobileSettingsOpen
                    ? ""
                    : "none",
              }}
              className="mobile-navbar-arrow right-arrow"
              onClick={() =>
                isRTL
                  ? navFunctions?.openPrevChapter()
                  : navFunctions?.openNextChapter()
              }
              title="Next"
              aria-label="Next chapter"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>

          {/* Desktop Toolbar */}
          <div
            onMouseUp={handleMouseUp}
            className={`toolbar-1 boundElements ${mounted ? "mounted" : ""}`}
            style={{
              border: sidebarMode?.includes("toolbarSettings")
                ? "2px solid var(--spaceSelection)"
                : null,
            }}
          >
            <div className="toolbar-item-wrapper leftClick">
              <button
                onClick={() =>
                  isRTL
                    ? navFunctions?.openNextChapter()
                    : navFunctions?.openPrevChapter()
                }
                className="toolbar-button"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
            </div>
            <div className="toolbar-divider" />
            <div
              onClick={() => {
                setSidebarWidth(280);
                setOpenOnMobile(true);
                G[`setOpenSidebar`] && G.setOpenSidebar(false);
              }}
              className="toolbar-item-wrapper mobile-only"
            >
              <button
                className={`toolbar-button firstToolbarbutton`}
                title="Open menu"
                aria-label="Open menu"
              >
                <BurgerMenuIcon size={24} color="var(--text1)" />
              </button>
            </div>
            {tools?.map((tool: any, index: any) =>
              tool?.active === false ? null : (
                <div
                  key={`${tool.icon || "tool"}-${index}`}
                  className="toolbar-item-wrapper"
                  onMouseEnter={() => handleMouseEnter(index)}
                  title={tool.label}
                >
                  {index === draggedIndex ? (
                    <div className={`toolbar-button placeholder`}></div>
                  ) : (
                    <button
                      className={`toolbar-button ${
                        index === 0 ? "firstToolbarbutton" : ""
                      }`}
                      onMouseDown={() => {
                        hasHeldRef.current = false;
                        holdTimeoutRef.current = setTimeout(() => {
                          if (tool?.onRightClick) tool.onRightClick();
                          else if (tool?.onHold) tool.onHold();
                          hasHeldRef.current = true;
                        }, 600);
                      }}
                      onMouseUp={(e) => {
                        e.stopPropagation();
                        clearTimeout(holdTimeoutRef.current);
                        if (!hasHeldRef.current && tool?.onClick) {
                          tool.onClick();
                        }
                        if (isDragging) {
                          setIsDragging(false);
                          setElement(null);
                          setDraggedIndex(null);
                        }
                      }}
                      onMouseLeave={() => clearTimeout(holdTimeoutRef.current)}
                    >
                      {tool.isImg ? (
                        <img
                          src={tool.icon}
                          style={{ width: "25px" }}
                          alt={tool.label}
                        />
                      ) : (
                        <span className="material-symbols-outlined">
                          {tool.icon}
                        </span>
                      )}
                      {tool.label && (
                        <span className="toolbar-btn-label">{tool.label}</span>
                      )}
                    </button>
                  )}
                </div>
              )
            )}

            <div className="toolbar-divider" />
            <div className="toolbar-item-wrapper rightClick">
              <button
                onClick={() =>
                  isRTL
                    ? navFunctions?.openPrevChapter()
                    : navFunctions?.openNextChapter()
                }
                className="toolbar-button"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </SurroundingDivs>
        <style>{getStyleOf("toolbar.css")}</style>
      </div>
      <style>{`
                .more-btn-wrapper {
                    position: relative;
                }

                .more-menu-popup {
                    position: absolute;
                    bottom: calc(100% + 8px);
                    right: 0;
                    background: var(--bg1, #fff);
                    border: 1px solid var(--border1, #e0e0e0);
                    border-radius: 12px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                    min-width: 180px;
                    overflow: hidden;
                    z-index: 1000;
                    display: flex;
                    flex-direction: column;
                }

                .more-menu-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    background: none;
                    border: none;
                    cursor: pointer;
                    width: 100%;
                    text-align: left;
                    color: var(--text1);
                    font-size: 14px;
                    transition: background 0.15s;
                }

                .more-menu-item:hover {
                    background: var(--hover1, rgba(0,0,0,0.06));
                }

                .more-menu-item .material-symbols-outlined {
                    font-size: 20px;
                    flex-shrink: 0;
                }

                .more-menu-item-label {
                    flex: 1;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .mobile-navbar-btn svg {
                    width: 24px;
                    height: 24px;
                }
                
                .toolbar-edit-toggle {
                    margin-left: auto;
                }
                
                .toolbar-button.edit-active {
                    background-color: var(--spaceSelection);
                    color: white;
                }
                
                .edit-mode-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                    backdrop-filter: blur(4px);
                }
                
                .edit-mode-panel {
                    background: white;
                    border-radius: 16px;
                    width: 90%;
                    max-width: 900px;
                    max-height: 85vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.3);
                    overflow: hidden;
                }
                
                .edit-panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 24px;
                    border-bottom: 1px solid #e5e5e5;
                    background: #fafafa;
                }
                
                .edit-panel-header h3 {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #1a1a1a;
                }
                
                .header-actions {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }
                
                .reset-defaults-btn, .close-panel-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #666;
                    transition: all 0.2s;
                }
                
                .reset-defaults-btn:hover {
                    background: #e3f2fd;
                    color: #1976d2;
                }
                
                .close-panel-btn:hover {
                    background: #ffebee;
                    color: #d32f2f;
                }
                
                .edit-panel-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 24px;
                }
                
                .tools-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 20px;
                }
                
                .tool-edit-item {
                    border: 2px solid #e5e5e5;
                    border-radius: 12px;
                    padding: 20px;
                    background: white;
                    transition: all 0.2s;
                    position: relative;
                }
                    .new-tool-btn {
                        background: #4caf50;
                        color: white;
                        border: none;
                        padding: 12px 20px;
                        border-radius: 8px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        font-size: 14px;
                    }
                    .new-tool-btn:hover {
                        background: #388e3c;
                    }

                .tool-edit-item:hover {
                    border-color: var(--spaceSelection);
                    box-shadow: 0 4px 12px rgba(68, 89, 243, 0.1);
                }
                
                .tool-edit-item.tool-hidden {
                    opacity: 0.6;
                    border-color: #ccc;
                    background: #f8f8f8;
                }
                
                .tool-preview {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 48px;
                    height: 48px;
                    background: #f5f5f5;
                    border: 2px solid #ddd;
                    border-radius: 8px;
                    margin-bottom: 16px;
                    font-size: 24px;
                }
                .tool-preview-page {
                  display: flex;
            align-items: center;
            justify-content: center;
            width: 48px;
            height: 48px;
            /* background: #f5f5f5; */
            /* border: 2px solid #ddd; */
            border-radius: 8px;
            /* margin-bottom: 16px; */
            font-size: 24px;
    }
                
                .tool-controls {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    margin-bottom: 12px;
                }
                
                .control-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                
                .control-label {
                    font-size: 12px;
                    font-weight: 600;
                    color: #555;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .text-input {
                    padding: 10px 12px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    font-size: 14px;
                    transition: border-color 0.2s;
                }
                
                .text-input:focus {
                    outline: none;
                    border-color: var(--spaceSelection);
                    box-shadow: 0 0 0 3px rgba(68, 89, 243, 0.1);
                }
                
                .control-row {
                    display: flex;
                    gap: 16px;
                }
                
                .toggle-control {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    font-size: 14px;
                    padding: 8px 12px;
                    border-radius: 6px;
                    transition: background-color 0.2s;
                    flex: 1;
                }
                
                .toggle-control:hover {
                    background: #f5f5f5;
                }
                
                .toggle-control input[type="checkbox"] {
                    margin: 0;
                    width: 16px;
                    height: 16px;
                }
                
                .toggle-label {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-weight: 500;
                }
                
                .toggle-label .material-symbols-outlined {
                    font-size: 16px;
                    color: #666;
                }
                
                .tool-info {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    color: #666;
                    font-size: 12px;
                    padding-top: 12px;
                    border-top: 1px solid #f0f0f0;
                }
                
                .modified-indicator {
                    color: var(--spaceSelection);
                    font-weight: 600;
                }
                
                .edit-panel-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    padding: 20px 24px;
                    border-top: 1px solid #e5e5e5;
                    background: #fafafa;
                }
                
                .reset-btn, .apply-btn {
                    padding: 12px 20px;
                    border: none;
                    border-radius: 8px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 14px;
                }
                
                .reset-btn {
                    background: #f5f5f5;
                    color: #333;
                    border: 1px solid #ddd;
                }
                
                .reset-btn:hover {
                    background: #e5e5e5;
                    border-color: #ccc;
                }
                
                .apply-btn {
                    background: var(--spaceSelection);
                    color: white;
                }
                
                .apply-btn:hover {
                    background: #3a4de8;
                    box-shadow: 0 4px 12px rgba(68, 89, 243, 0.3);
                }
            `}</style>
    </>
  );
}
