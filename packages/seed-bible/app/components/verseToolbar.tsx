const { useState, useEffect, useRef, useMemo } = os.appHooks;
import {
  MenuIcon,
  ApologistIcon,
  CopyIcon,
  ShareIcon,
  LocationIcon,
  AskIcon,
  BookMarkIcon,
  HighlightIcon,
} from "app.components.icons";
import { getStyleOf } from "app.styles.styler";

export function VerseToolbar({
  clickedVersesContext,
  clickedVerses,
  toggleVerseHighlight,
  book,
  chapter,
  onColorSelect,
  highlighted,
  onClose,
  activeSpace,
  showVerseToolbar,
  spaces,
}) {
  // Get Selection UI settings - first try globalThis, then fall back to saved space data
  // we intentionally ignore any copyVerseMode stored in the settings
  const getSelectionSettings = () => {
    const pick = (s) => ({
      showSelectedItems: s.showSelectedItems ?? true,
      showHighlightColors: s.showHighlightColors ?? true,
      showIconText: s.showIconText ?? true,
    });
    // First check globalThis (set by SelectionUISettings component)
    if (globalThis.selectionUIBehavior?.[activeSpace]) {
      return pick(globalThis.selectionUIBehavior[activeSpace]);
    }
    // Fall back to saved space data
    const currentSpace = spaces?.find((s) => s.id === activeSpace);
    if (currentSpace?.selectionUIBehavior) {
      // Also populate globalThis for future use
      if (!globalThis.selectionUIBehavior) {
        globalThis.selectionUIBehavior = {};
      }
      globalThis.selectionUIBehavior[activeSpace] =
        currentSpace.selectionUIBehavior;
      return pick(currentSpace.selectionUIBehavior);
    }
    // Default settings
    return {
      showSelectedItems: true,
      showHighlightColors: true,
      showIconText: true,
    };
  };

  const selectionSettings = getSelectionSettings();

  const [selectedColor, setSelectedColor] = useState("#FDE047");
  const [customColors, setCustomColors] = useState(
    masks?.customColors ? masks.customColors : []
  );

  useEffect(() => {
    masks.customColors = customColors;
  }, [customColors]);
  const [tempColor, setTempColor] = useState("#FDE047");
  const [isPickingColor, setIsPickingColor] = useState(false);
  const [showMobileColors, setShowMobileColors] = useState(false);
  const colorInputRef = useRef(null);
  const colorPickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isPickingColor &&
        colorPickerRef.current &&
        !colorPickerRef.current.contains(event.target)
      ) {
        // Add color to customColors array, max 3
        setCustomColors((prev) => {
          // Check if color already exists
          if (prev.includes(tempColor)) {
            return prev;
          }

          // If less than 3, add it at the beginning
          if (prev.length < 3) {
            return [tempColor, ...prev];
          }

          // If 3 or more, remove last and add new one at the beginning
          return [tempColor, ...prev.slice(0, -1)];
        });

        handleColorClick(tempColor);
        setSelectedColor(tempColor);
        setIsPickingColor(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPickingColor, tempColor]);

  const getVerseReference = () => {
    if (clickedVerses.length === 0) return "";
    const sorted = [...clickedVerses].sort((a, b) => a - b);

    const groups = [];
    let start = sorted[0];
    let end = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        groups.push(start === end ? `${start}` : `${start}-${end}`);
        start = sorted[i];
        end = sorted[i];
      }
    }
    groups.push(start === end ? `${start}` : `${start}-${end}`);

    return `${book} ${chapter}:${groups.join(",")}`;
  };

  const containerStyle = {
    position: "relative",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
    padding: "6px 10px",
    zIndex: 1000,
    animation: "slideUp 0.3s ease-out",
    maxWidth: "95vw",
    width: "auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "var(--panelBackground)",
  };

  const headerStyle = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    width: "max-content",
    maxWidth: "90dvw",
  };

  const verseRefStyle = {
    fontSize: "14px",
    fontWeight: "600",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    padding: "8px 16px",
    borderRadius: "8px",
    color: "var(--text1)",
    backgroundColor: "var(--panelBackground)",
    // border: "1px solid #e5e5e5",
    // boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    width: "fit-content",
    // margin: "0 auto 8px auto",
  };

  const dividerStyle = {
    width: "1px",
    height: "24px",
    backgroundColor: "#d1d1d1",
  };

  const colorButtonsStyle = {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    position: "relative",
  };

  const circleButtonStyle = (color) => ({
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: color,
    border: "none",
    cursor: "pointer",
    transition: "transform 0.2s",
  });

  const plusButtonStyle = {
    width: "44px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "transparent",
    border: "2px solid transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: "20px",
    fontWeight: "bold",
    color: "#666",
    transition: "transform 0.2s",
    position: "relative",
    padding: "0",
    lineHeight: "1",
    "-webkit-user-drag": "none",
  };

  const toolButtonsStyle = {
    display: "flex",
    gap: "12px",
    marginLeft: "auto",
    alignItems: "center",
  };

  const iconButtonStyle = {
    width: "36px",
    height: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    color: "var(--text1) !important",
    transition: "background-color 0.2s",
    borderRadius: "4px",
    fontSize: "10px",
  };

  const colorInputStyle = {
    width: "0",
    height: "0",
    border: "1px solid #d1d1d1",
    borderRadius: "4px",
    cursor: "pointer",
    "pointer-events": "none",
    position: "absolute",
    opacity: 0,
  };

  const closeButtonStyle = {
    width: "24px",
    height: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    color: "#999",
    fontSize: "20px",
    marginLeft: "8px",
  };

  const { color } = GetOrSetVisualInTags(configBot.id);

  const defaultColors = [color, "#FDE047"];

  const allHighlighted = clickedVerses.some((num) => {
    const key = `${book}-${chapter}-${num}`;
    return highlighted[key];
  });

  const handleColorClick = (color) => {
    onColorSelect(color);
  };

  const handleClearHighlights = () => {
    clickedVerses.forEach((verseNum) => {
      if (globalThis.UnHighlightVerse) {
        globalThis.UnHighlightVerse(verseNum);
      }
    });
    onClose();
  };

  const handleClearAllHighlights = () => {
    Object.keys(highlighted).forEach((key) => {
      const parts = key.split("-");
      const verseNum = parseInt(parts[parts.length - 1] ?? "0");
      if (globalThis.UnHighlightVerse) {
        globalThis.UnHighlightVerse(verseNum);
      }
    });
    onClose();
  };

  const hasAnyHighlights = Object.keys(highlighted).length > 0;

  const handlePlusClick = () => {
    setTempColor(selectedColor);
    setIsPickingColor(true);
    colorInputRef.current?.click();
  };

  const handleColorChange = (e) => {
    const newColor = e.target.value;
    setTempColor(newColor);
  };

  const menuOptions = useMemo(() => {
    return (
      getMenuActions(clickedVersesContext, onClose, activeSpace, spaces) || []
    );
  }, [clickedVersesContext, activeSpace, spaces]);
  const disableHighlighting =
    tags?.settingsConfigs?.presets?.[
      configBot?.tags?.settingsPreset || thisBot.tags.settingsPreset || "full"
    ]?.pageSettings?.disableHighlighting;
  const removeBookMark =
    tags?.settingsConfigs?.presets?.[
      configBot?.tags?.settingsPreset || thisBot.tags.settingsPreset || "full"
    ]?.appSettings?.removeBookMark;

  return (
    <>
      <style>{`
        .toolbar-1.mounted{
          pointer-events:${globalThis.IsMobileNow() && showVerseToolbar ? "none !important" : ""}
        }
        `}</style>
      {globalThis.IsMobileNow() && selectionSettings.showSelectedItems && (
        <>
          {
            null /*<div className="verse-ref">
            <img src="https://res.cloudinary.com/dfbtwwa8p/image/upload/v1764875876/Rectangle_11_yzpmpm.svg" />
          </div>*/
          }
          <span
            className="verse-ref"
            style={{
              ...verseRefStyle,
              padding: "8px 36px",
              borderRadius: "2px",
              backgroundColor: "var(--pageBackground)",
            }}
          >
            {getVerseReference()}
          </span>
        </>
      )}
      <div className="verse-toolbar" style={containerStyle}>
        <style>
          {`
          .mobile-action-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex: 1;
            background: transparent;
            border: none;
            cursor: pointer;
            gap: 4px;
            color: var(--text1);
            padding: 0;
            height: 100%;
            font-family: DM Sans;
            font-weight: 400;
            font-size: 14px;
          }

          .mobile-action-btn svg {
            width: 24px;
            height: 24px;
          }

          .mobile-action-btn .material-symbols-outlined {
            font-size: 24px;
            line-height: 1;
          }

          @keyframes slideUp {
            from {
              transform: translateX(-50%) translateY(20px);
              opacity: 0;
            }
            to {
              transform: translateX(-50%) translateY(0);
              opacity: 1;
            }
          }
          
          @media (max-width: 480px) {
                    .verse-toolbar {
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        transform: none !important;
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 0 !important;
        padding: 9px 16px !important;
        height: 64px;
        background: var(--pageBackground) !important;
        box-shadow: 7px 1px 9px rgba(0, 0, 0, 0.08) !important;
    }

            .header-ref {
              flex-direction: row !important;
              width: 100% !important;
              gap: 6px !important;
              align-items: center !important;
              justify-content: flex-start !important;
            }

            .verse-ref {
              position: absolute !important;
              top: -93vh !important;
              left: 53% !important;
              transform: translateX(-50%) !important;
              margin: 0 !important;
              }

            .color-buttons {
              display: flex !important;
              align-items: center !important;
              gap: 10px !important;
              flex: 1 !important;
            }

            .color-circle {
              width: 34px !important;
              height: 34px !important;
              flex-shrink: 0 !important;
            }

            .plus-button {
              flex-shrink: 0 !important;
            }

            .clear-eraser-btn {
              margin-left: auto !important;
              flex-shrink: 0 !important;
            }

            .tool-buttons {
              display: none !important;
            }

            .verse-toolbar .divider-vertical {
              display: none !important;
            }

            .icon-button {
              width: 28px !important;
              height: 28px !important;
            }

            .mobile-action-btn {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        flex: 1 !important;
        background: transparent !important;
        border: none !important;
        cursor: pointer !important;
        gap: 4px !important;
        color: var(--text1) !important;
        /* font-size: 10px !important; */
        /* font-weight: 500 !important; */
        padding: 0 !important;
        height: 100% !important;
        font-family: DM Sans !important;
        font-weight: 400 !important;
        font-size: 14px !important;
    }

            .mobile-action-btn svg {
              width: 24px !important;
              height: 24px !important;
            }

            .mobile-action-btn .material-symbols-outlined {
              font-size: 24px !important;
              line-height: 1 !important;
            }
          }
        `}
        </style>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />

        <div
          className="header-ref"
          style={headerStyle}
          onContextMenu={(e) => {
            e.stopPropagation();
          }}
        >
          {/* ── Action buttons (mobile + desktop) ── */}
          <div
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              display: "flex",
              width: "100%",
              alignItems: "center",
              height: "100%",
              gap: "1rem",
            }}
          >
            {showMobileColors ? (
              /* Color picker panel */
              <>
                <button
                  onClick={() => setShowMobileColors(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text1)",
                    padding: "4px 4px 4px 0",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                  }}
                  aria-label="Back"
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "24px" }}
                  >
                    chevron_left
                  </span>
                </button>

                <div
                  className="color-buttons"
                  style={{ ...colorButtonsStyle, flex: 1 }}
                >
                  {isPickingColor && (
                    <>
                      <button
                        key="cancel-color"
                        className="color-circle"
                        style={{
                          ...circleButtonStyle("#fff"),
                          border: "2px solid #999",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "16px",
                          lineHeight: 1,
                          color: "#666",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsPickingColor(false);
                          setTempColor(selectedColor);
                        }}
                      >
                        ✕
                      </button>
                      <button
                        key="temp-preview"
                        className="color-circle"
                        style={{
                          ...circleButtonStyle(tempColor),
                          border: "3px solid #666",
                          boxShadow: "0 0 8px rgba(0,0,0,0.3)",
                        }}
                      />
                    </>
                  )}

                  {customColors.map((color) => (
                    <button
                      key={color}
                      className="color-circle"
                      style={circleButtonStyle(color)}
                      onClick={() => handleColorClick(color)}
                      aria-label={`Highlight with ${color}`}
                    />
                  ))}

                  {defaultColors.map((color) => (
                    <button
                      key={color}
                      className="color-circle"
                      style={circleButtonStyle(color)}
                      onClick={() => handleColorClick(color)}
                      aria-label={`Highlight with ${color}`}
                    />
                  ))}

                  <div ref={colorPickerRef}>
                    <button
                      className="plus-button"
                      style={plusButtonStyle}
                      onClick={handlePlusClick}
                      aria-label="Add color"
                    >
                      <img
                        style={{ width: "44px", "-webkit-user-drag": "none" }}
                        src="https://res.cloudinary.com/dfbtwwa8p/image/upload/v1761753902/329cd5727522c1b0f09580e4c7b13964cb2b1a87_fvmcdy.png"
                      />
                    </button>
                    <input
                      ref={colorInputRef}
                      type="color"
                      value={tempColor}
                      onChange={handleColorChange}
                      style={colorInputStyle}
                    />
                  </div>

                  <button
                    onClick={allHighlighted ? handleClearHighlights : undefined}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "transparent",
                      border: "none",
                      cursor: allHighlighted ? "pointer" : "default",
                      gap: "2px",
                      color: "var(--text1)",
                      fontSize: "10px",
                      padding: "4px 8px",
                      marginLeft: "auto",
                      opacity: allHighlighted ? 1 : 0.35,
                      fontWeight: "500",
                      flexShrink: 0,
                    }}
                    aria-label="Clear highlight"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "20px" }}
                    >
                      ink_eraser
                    </span>
                    <span>Clear</span>
                  </button>

                  <button
                    onClick={
                      hasAnyHighlights ? handleClearAllHighlights : undefined
                    }
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "transparent",
                      border: "none",
                      cursor: hasAnyHighlights ? "pointer" : "default",
                      gap: "2px",
                      color: "#ef4444",
                      fontSize: "10px",
                      padding: "4px 8px",
                      opacity: hasAnyHighlights ? 1 : 0.35,
                      fontWeight: "500",
                      flexShrink: 0,
                    }}
                    aria-label="Clear all highlights"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "20px" }}
                    >
                      ink_eraser
                    </span>
                    <span>Clear All</span>
                  </button>
                </div>
              </>
            ) : (
              /* Action buttons — same style as bottom navbar */
              <>
                {!removeBookMark && (
                  <button className="mobile-action-btn">
                    <BookMarkIcon />
                    <span>Bookmark</span>
                  </button>
                )}
                {selectionSettings.showHighlightColors &&
                  !disableHighlighting && (
                    <button
                      className="mobile-action-btn"
                      onClick={() => setShowMobileColors(true)}
                    >
                      <HighlightIcon />
                      <span>Highlight</span>
                    </button>
                  )}
                {menuOptions
                  .filter((o) => o?.type !== "line")
                  .map((option, i) => (
                    <button
                      key={i}
                      className="mobile-action-btn"
                      onClick={option?.onClick}
                    >
                      {option.icon}
                      <span style={{ width: "max-content" }}>
                        {typeof option.title === "function"
                          ? (option.title as any)(clickedVersesContext)
                          : option.title}
                      </span>
                    </button>
                  ))}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function getMenuActions(that, onClose, activeSpace, spaces) {
  os.log("GET MENU ACTIONS VERSE TOOLBAR", that);
  const { SharePopup } = thisBot.Chips();
  // copy mode is fixed to always include reference – ignore any stored setting
  // (we don't need to read selection settings for this function)

  // Build verse reference for copy with reference
  const buildReference = () => {
    const verseNumbers = that.verseNumber || [];
    const sorted = [...verseNumbers].sort((a, b) => a - b);
    const groups = [];
    if (sorted.length > 0) {
      let start = sorted[0];
      let end = sorted[0];
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === end + 1) {
          end = sorted[i];
        } else {
          groups.push(start === end ? `${start}` : `${start}-${end}`);
          start = sorted[i];
          end = sorted[i];
        }
      }
      groups.push(start === end ? `${start}` : `${start}-${end}`);
    }
    return `${that.book} ${that.chapter}:${groups.join(",")}`;
  };
  const removeAiAgent =
    tags?.settingsConfigs?.presets?.[
      configBot?.tags?.settingsPreset || thisBot.tags.settingsPreset || "full"
    ]?.pageSettings?.removeAiAgent;

  const MenuOptions = {
    type: "normal",
    items: [
      {
        icon: <CopyIcon height="24" width="24" />,
        onClick: () => {
          // always include the verse reference when copying
          const textToCopy = `${that.text}\n— ${buildReference()}`;
          os.setClipboard(textToCopy);
          SetInHold(null);
          onClose();
        },
        title: "Copy",
      },

      ...(!removeAiAgent
        ? [
            {
              icon: <AskIcon />,
              onClick: () => {
                ClearUserSelection();
                SetShowCommands(true);
                SetInHold(null);
              },
              title: "Ask",
            },
          ]
        : []),
      {
        icon: <ShareIcon height="24" width="24" />,
        onClick: () => {
          closePopupSettings();
          setTimeout(() => {
            // Build verse reference from the context
            const verseNumbers = that.verseNumber || [];
            const sorted = [...verseNumbers].sort((a, b) => a - b);
            const groups = [];
            if (sorted.length > 0) {
              let start = sorted[0];
              let end = sorted[0];
              for (let i = 1; i < sorted.length; i++) {
                if (sorted[i] === end + 1) {
                  end = sorted[i];
                } else {
                  groups.push(start === end ? `${start}` : `${start}-${end}`);
                  start = sorted[i];
                  end = sorted[i];
                }
              }
              groups.push(start === end ? `${start}` : `${start}-${end}`);
            }
            const reference = `${that.book} ${that.chapter}:${groups.join(",")}`;
            openPopupSettings(
              <SharePopup
                shareTitle={`${that.text}`}
                shareReference={reference}
              />,
              null,
              true
            );
            SetInHold(null);
          }, 50);
        },
        title: "Share",
      },
    ],
  };

  // Add dynamic global context items
  if (Array.isArray(globalThis.ContextMenuOptions)) {
    globalThis.ContextMenuOptions.forEach(({ label, items }) => {
      const panelKey = `${label.toUpperCase().replace(/\s/g, "_")}_PANEL_ID`;
      if (globalThis[panelKey]) {
        items.forEach((el) => {
          MenuOptions.items.push({
            icon: el.icon,
            onClick: () => {
              if (el.onClick) el.onClick(that);
              SetInHold(null);
            },
            title: el.title,
          });
        });
      }
    });
  }

  const verseContextMenuOptions = {};

  if (that.verseNumber) {
    for (const verseNumber of that.verseNumber) {
      if (
        globalThis?.VerseContextMenuOptions?.[
          `${that.book}-${that.chapter}-${verseNumber}`
        ]
      ) {
        globalThis.VerseContextMenuOptions[
          `${that.book}-${that.chapter}-${verseNumber}`
        ].forEach((item) => {
          if (verseContextMenuOptions[item.title]) {
            verseContextMenuOptions[item.title] = {
              ...verseContextMenuOptions[item.title],
              items: [
                ...verseContextMenuOptions[item.title].items,
                ...item.items,
              ],
            };
          } else {
            verseContextMenuOptions[item.title] = {
              ...item,
            };
          }
        });
      }
    }
  }

  for (const title of Object.keys(verseContextMenuOptions)) {
    const titleArray = [];
    const itemsHolder = [];
    MenuOptions.items.push({ type: "line" });
    verseContextMenuOptions[title].items.forEach((el) => {
      if (!titleArray.includes(el.title)) {
        itemsHolder.push({
          ...el,
          onClick: (e: MouseEvent) => {
            if (el.onClick) el.onClick(e);
            SetInHold({});
          },
        });
        titleArray.push(el.title);
      }
    });
    MenuOptions.items.push({
      ...verseContextMenuOptions[title],
      icon: (
        <span class="toolbar-icon-container">
          {verseContextMenuOptions[title].icon}
          <span class="toolbar-icon-count">{titleArray.length}</span>
        </span>
      ),
      onClick: () => {
        openPopupSettings(<SubOptions items={itemsHolder} />, null, true);
      },
    });
  }

  // Add extra contextual items
  if (Array.isArray(that?.extraContext)) {
    that.extraContext.forEach(({ items }) => {
      items.forEach((el) => {
        MenuOptions.items.push({
          icon: el.icon,
          onClick: (e: MouseEvent) => {
            if (el.onClick) el.onClick(that);
            SetInHold(null);
          },
        });
      });
    });
  }

  // Return only icon + onClick array
  return MenuOptions.items.map(({ icon, onClick, title, type }) => ({
    icon,
    onClick,
    title,
    type,
  }));
}

const SubOptions = ({ items }) => {
  return (
    <div
      className={"popupSettings2"}
      style={{
        maxHeight: "275px",
        overflowY: "auto",
        scrollbarWidth: "none",
      }}
    >
      <style>{globalThis.ThemeCSS}</style>
      <style>
        {`
.popupSettings2 {
  position: relative;
  width: 215px !important;
  height: fit-content;
  padding: 10px;
  display: flex;
  flex-direction: column;
  background: var(--primaryColor) !important;
  align-items: center;
  gap: 2px;
  border-radius: 10px;
  scrollbar-width: none;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.15),
    0 2px 6px rgba(0, 0, 0, 0.1);
}

        .popupSettings2 .itemSettings2 {
  display: flex !important;
  flex-direction: row;
  gap: 6px;
  justify-content: start !important;
  align-items: center;
  width: 100%;
  background: rgba(var(--text1), 0.9);
  color: var(--text1);
  font-family: "Satoshi", system-ui, sans-serif;
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: normal;
  border-radius: 10px;
  padding: 6px;
  cursor: pointer;
}

.popupSettings2 .itemSettings2:hover {
  background: rgba(var(--text1), 0.3);
}
        `}
      </style>
      {items.map((item) => {
        if (item.active === false) return;
        if (item?.type === "line")
          return (
            <div
              style={{
                width: "100%",
                height: "1px",
                backgroundColor: "#cdcccc3b",
              }}
            ></div>
          );
        else
          return (
            <div
              onClick={(e: MouseEvent) => {
                item.onClick(e);
              }}
              className={`itemSettings2`}
              style={{
                cursor: item?.disabled ? "not-allowed" : "pointer",
                color: item?.disabled ? "#929292" : "",
              }}
            >
              <div>{item.icon}</div>
              <div>
                {typeof item.title === "function" ? item.title() : item.title}
              </div>
            </div>
          );
      })}
    </div>
  );
};
