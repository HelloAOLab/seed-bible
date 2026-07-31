const { useEffect, useState } = os.appHooks;
import { MenuIcon, ToolbarIcon } from "app.components.icons";
import { useTabsContext } from "app.hooks.tabs";
import { useSideBarContext } from "app.hooks.sideBar";
import { useBibleContext } from "app.hooks.bibleVariables";
(globalThis as any).setPriorities = () => {};
const EditorToolbarSettings = () => {
  const { updateSpace, activeSpace, spaces } = useTabsContext();
  const { sidebarMode, setSideBarMode, closePopupSettings, t } =
    useSideBarContext();
  const { tools, setTools } = useBibleContext();

  const [priorities, setPriorities] = useState<string[]>([]);
  useEffect(() => {
    (globalThis as any).DEFAULT_TOOLBAR_PRIORITY = priorities;
    if (priorities.length > 0)
      (globalThis as any).EditorToolbar.setPriorities(priorities);
  }, [priorities]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [loading, setLoading] = useState(false);

  // Default toolbar items with their descriptions
  const defaultItems = [
    { id: "text-select", labelKey: "textSelect", descKey: "textSelectDesc" },
    { id: "bold", labelKey: "bold", descKey: "boldDesc" },
    { id: "italic", labelKey: "italic", descKey: "italicDesc" },
    { id: "underline", labelKey: "underline", descKey: "underlineDesc" },
    {
      id: "strikethrough",
      labelKey: "strikethrough",
      descKey: "strikethroughDesc",
    },
    { id: "superscript", labelKey: "superscript", descKey: "superscriptDesc" },
    { id: "subscript", labelKey: "subscript", descKey: "subscriptDesc" },
    { id: "align", labelKey: "alignment", descKey: "alignmentDesc" },
    { id: "list", labelKey: "lists", descKey: "listsDesc" },
    { id: "line-spacing", labelKey: "lineSpacing", descKey: "lineSpacingDesc" },
    { id: "attach", labelKey: "attachFile", descKey: "attachFileDesc" },
    { id: "image", labelKey: "insertImage", descKey: "insertImageDesc" },
    { id: "text-color", labelKey: "textColor", descKey: "textColorDesc" },
    {
      id: "bg-color",
      labelKey: "highlightColor",
      descKey: "highlightColorDesc",
    },
    { id: "paragraph", labelKey: "paragraph", descKey: "paragraphDesc" },
    { id: "font-family", labelKey: "fontFamily", descKey: "fontFamilyDesc" },
    { id: "font-style", labelKey: "fontStyle", descKey: "fontStyleDesc" },
    { id: "font-size", labelKey: "fontSize", descKey: "fontSizeDesc" },
    { id: "undo", labelKey: "undo", descKey: "undoDesc" },
    { id: "redo", labelKey: "redo", descKey: "redoDesc" },
    {
      id: "clear",
      labelKey: "clearFormatting",
      descKey: "clearFormattingDesc",
    },
    { id: "print", labelKey: "print", descKey: "printDesc" },
    {
      id: "margin1",
      labelKey: "verticalMargin",
      descKey: "verticalMarginDesc",
    },
    {
      id: "margin2",
      labelKey: "horizontalMargin",
      descKey: "horizontalMarginDesc",
    },
    { id: "ai-prompt", labelKey: "aiPrompt", descKey: "aiPromptDesc" },
    { id: "download", labelKey: "download", descKey: "downloadDesc" },
    { id: "upload", labelKey: "upload", descKey: "uploadDesc" },
  ];

  // Load current priorities on mount
  useEffect(() => {
    try {
      if (
        (globalThis as any).EditorToolbar &&
        (globalThis as any).EditorToolbar.getPriorities
      ) {
        const currentPriorities = (
          globalThis as any
        ).EditorToolbar.getPriorities();
        setPriorities(currentPriorities);
      } else {
        // Fallback to default order
        setPriorities(defaultItems.map((item) => item.id));
      }
    } catch (error) {
      console.error("Error loading priorities:", error);
      setPriorities(defaultItems.map((item) => item.id));
    }
  }, []);

  // Move item up in the list
  const moveUp = (index) => {
    if (index === 0) return;
    const newPriorities = [...priorities];
    [newPriorities[index - 1], newPriorities[index]] = [
      newPriorities[index],
      newPriorities[index - 1],
    ];
    setPriorities(newPriorities);
  };

  // Move item down in the list
  const moveDown = (index) => {
    if (index === priorities.length - 1) return;
    const newPriorities = [...priorities];
    [newPriorities[index], newPriorities[index + 1]] = [
      newPriorities[index + 1],
      newPriorities[index],
    ];
    setPriorities(newPriorities);
  };

  // Handle drag start
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", e.target);
  };

  // Handle drag over
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // Handle drop
  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null) return;

    const newPriorities = [...priorities];
    const draggedItem = newPriorities[draggedIndex];

    // Remove dragged item
    newPriorities.splice(draggedIndex, 1);
    // Insert at new position
    newPriorities.splice(dropIndex, 0, draggedItem);

    setPriorities(newPriorities);
    setDraggedIndex(null);
  };

  // Save priorities to the editor
  const savePriorities = async () => {
    try {
      setLoading(true);
      if (
        (globalThis as any).EditorToolbar &&
        (globalThis as any).EditorToolbar.setPriorities
      ) {
        (globalThis as any).EditorToolbar.setPriorities(priorities);
      }
      setLoading(false);
      // Show success message or feedback here if needed
    } catch (error) {
      setLoading(false);
      console.error("Error saving priorities:", error);
    }
  };

  // Reset to default priorities
  const resetToDefault = () => {
    const defaultPriorities = defaultItems.map((item) => item.id);
    setPriorities(defaultPriorities);
    if (
      (globalThis as any).EditorToolbar &&
      (globalThis as any).EditorToolbar.resetPriorities
    ) {
      (globalThis as any).EditorToolbar.resetPriorities();
    }
  };

  // Get item details by ID
  const getItemDetails = (id) => {
    const item = defaultItems.find((item) => item.id === id);
    if (item) {
      return { id, label: t(item.labelKey), description: t(item.descKey) };
    }
    return { id, label: id, description: "Custom toolbar item" };
  };

  return (
    <div
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        maxWidth: "280px",
        margin: "0 auto",
        // padding: '20px',
        // backgroundColor: 't',
        height: "100%",
        maxHeight: "100%",
        overflow: "scroll",
        padding: "10px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "20px",
          fontSize: "14px",
          color: "#666",
        }}
      >
        <div
          onClick={() => setSideBarMode("settings")}
          style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
        >
          <MenuIcon name="arrow_back" />
        </div>
        <div>{t("settings")}</div>
        <div>
          <MenuIcon name="chevron_right" />
        </div>
        <div>{t("tools")}</div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "10px",
          fontSize: "24px",
          fontWeight: "600",
          color: "var(--text1) !important",
        }}
      >
        <ToolbarIcon />
        <div>{t("customizeToolbar")}</div>
      </div>

      <div className="mediumText">{t("editorToolbarOrder")}</div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        <button
          onClick={savePriorities}
          disabled={loading}
          style={{
            backgroundColor: "var(--addButtonIcon)",
            color: "var(--primaryColor)",
            border: "none",
            borderRadius: "6px",
            padding: "10px 20px",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "14px",
            fontWeight: "500",
            opacity: loading ? 0.6 : 1,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {loading && (
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "16px", animation: "spin 1s linear infinite" }}
            >
              sync
            </span>
          )}
          {t("saveOrder")}
        </button>

        <button
          onClick={resetToDefault}
          style={{
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "6px",
            padding: "10px 20px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          {t("resetToDefault")}
        </button>
      </div>

      <div
        style={{
          // backgroundColor: '#f8f9fa',
          borderRadius: "8px",
        }}
      >
        <div className="mediumText">{t("editorToolbarOrder")}</div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {priorities.map((itemId, index) => {
            const item = getItemDetails(itemId);
            return (
              <div
                key={itemId}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid #dee2e6",
                  borderRadius: "6px",
                  padding: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "grab",
                  transition: "all 0.2s ease",
                  boxShadow:
                    draggedIndex === index
                      ? "0 4px 12px rgba(0,0,0,0.15)"
                      : "0 1px 3px rgba(0,0,0,0.1)",
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.transform =
                    "translateY(-1px)";
                  (e.target as HTMLElement).style.boxShadow =
                    "0 4px 12px rgba(0,0,0,0.15)";
                }}
                onMouseLeave={(e) => {
                  if (draggedIndex !== index) {
                    (e.target as HTMLElement).style.transform = "translateY(0)";
                    (e.target as HTMLElement).style.boxShadow =
                      "0 1px 3px rgba(0,0,0,0.1)";
                  }
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "transparent",
                      color: "var(--text1) !important",
                      borderRadius: "4px",
                      padding: "4px 8px",
                      fontSize: "12px",
                      fontWeight: "600",
                      minWidth: "30px",
                      textAlign: "center",
                    }}
                  >
                    {index + 1}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "var(--text1) !important",
                        marginBottom: "2px",
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--text1) !important",
                      }}
                    >
                      {item.description}
                    </div>
                  </div>
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveUp(index);
                    }}
                    disabled={index === 0}
                    style={{
                      background: "transparent",
                      border: "1px solid #dee2e6",
                      borderRadius: "4px",
                      width: "32px",
                      height: "32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: index === 0 ? "not-allowed" : "pointer",
                      opacity: index === 0 ? 0.4 : 1,
                      color: "var(--text1) !important",
                    }}
                    title="Move up"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "16px" }}
                    >
                      keyboard_arrow_up
                    </span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveDown(index);
                    }}
                    disabled={index === priorities.length - 1}
                    style={{
                      background: "transparent",
                      border: "1px solid #dee2e6",
                      borderRadius: "4px",
                      width: "32px",
                      height: "32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor:
                        index === priorities.length - 1
                          ? "not-allowed"
                          : "pointer",
                      opacity: index === priorities.length - 1 ? 0.4 : 1,
                      color: "var(--text1) !important",
                    }}
                    title="Move down"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "16px" }}
                    >
                      keyboard_arrow_down
                    </span>
                  </button>

                  <div
                    style={{
                      width: "20px",
                      height: "32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "grab",
                      color: "var(--text1) !important",
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "16px" }}
                    >
                      drag_indicator
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>
        {`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                .material-symbols-outlined {
                    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
                }
                `}
      </style>
    </div>
  );
};

export { EditorToolbarSettings };
