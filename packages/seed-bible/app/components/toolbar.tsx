import { getStyleOf } from "app.styles.styler";
const { useEffect, useState, useRef } = os.appHooks;

import { useSideBarContext } from "app.hooks.sideBar";
import { useMouseMove } from "app.hooks.mouseMove";
import SurroundingDivs from "app.components.surroundingDivs";
import { useBibleContext } from "app.hooks.bibleVariables";
import { useTabsContext } from "app.hooks.tabs";

// Simple, single-toolbar component (no edit layer). Main logic unchanged.
export function Toolbar() {
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
  } = useBibleContext();

  const {
    sidebarMode,
    openOnMobile,
    isMobile,
    setSidebarWidth,
    setOpenOnMobile,
  } = useSideBarContext();
  const { setIsDragging, isDragging, setElement } = useMouseMove();
  const {
    activeSpace,
    updateToolsForSpace,
    getToolsForActiveSpace,
    activeTab,
    tabs,
  } = useTabsContext();

  // === keep original default-toolbar logic ===
  const [showToolbar, setShowToolbar] = useState(true);
  // useEffect(() => {
  //   setShowToolbar(!openOnMobile);
  // }, [openOnMobile]);

  const TabTools = getToolsForActiveSpace();
  const setActiveTools = (newTools) =>
    updateToolsForSpace(activeSpace, newTools);

  const [oldList, setOldList] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const holdTimeoutRef = useRef(null);
  const hasHeldRef = useRef(false);

  useEffect(() => {
    globalThis.SetScreens = setScreens;
  }, [setScreens]);

  useEffect(() => () => clearTimeout(holdTimeoutRef.current), []);

  function handleMouseEnter(targetIndex) {
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

  // Sync tools with active tab type (keeps main logic)
  useEffect(() => {
    if (!activeTab || !tabs) return;
    const activeTabObj = tabs.find((t) => t.id === activeTab);
    if (activeTabObj?.data?.type === "canvas") {
      setActiveTools([...canvasTools]);
    } else {
      setActiveTools([...tools]);
    }
  }, [activeTab, tabs, canvasTools, tools]);

  // expose setters globally (kept behavior)
  useEffect(() => {
    globalThis.SetTools = setTools;
    globalThis.SetCanvasTools = setCanvasTools;
    globalThis.SetMapTools = setMapTools;
    return () => {
      globalThis.SetTools = null;
      globalThis.SetCanvasTools = null;
      globalThis.SetMapTools = null;
    };
  }, [setTools, setCanvasTools, setMapTools]);

  // Disable context menu like before
  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    window.addEventListener("contextmenu", handleContextMenu);
    return () => window.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  if (!showToolbar) return <></>;

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
      />

      <div className="toolbar-container-1 boundElements">
        <SurroundingDivs action={handleMouseLeaveContainer}>
          <div
            onMouseUp={handleMouseUp}
            className="toolbar-1 boundElements"
            style={{
              border: sidebarMode?.includes("toolbarSettings")
                ? "2px solid #4459F3"
                : null,
            }}
          >
            <div className="toolbar-item-wrapper leftClick">
              <button
                onClick={() => navFunctions?.openPrevChapter()}
                className="toolbar-button"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
            </div>
            <div
              onClick={() => {
                setSidebarWidth(280);
                setOpenOnMobile(true);
                globalThis[`setOpenSidebar`] && setOpenSidebar(false);
              }}
              className="toolbar-item-wrapper mobile-only"
            >
              <button className={`toolbar-button firstToolbarbutton`}>
                <span className="material-symbols-outlined">menu</span>
              </button>
            </div>
            {tools?.map((tool, index) =>
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
                          // EmitData("appClick", {
                          //   name: `${tool?.pkgName}_package`,
                          // });
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
                          style={{ width: "22px" }}
                          alt={tool.label}
                        />
                      ) : (
                        <span className="material-symbols-outlined">
                          {tool.icon}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              )
            )}

            <div className="toolbar-item-wrapper rightClick">
              <button
                onClick={() => navFunctions?.openNextChapter()}
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
                .toolbar-edit-toggle {
                    margin-left: auto;
                }
                
                .toolbar-button.edit-active {
                    background-color: #4459F3;
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
                    border-color: #4459F3;
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
                    border-color: #4459F3;
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
                    color: #4459F3;
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
                    background: #4459F3;
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
