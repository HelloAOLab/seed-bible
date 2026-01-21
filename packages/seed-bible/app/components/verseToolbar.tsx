const { useState, useEffect, useRef, useMemo } = os.appHooks;
import {
  MenuIcon,
  ApologistIcon,
  CopyIcon,
  ShareIcon,
  LocationIcon,
} from "app.components.icons";
import { getStyleOf } from "app.styles.styler";

export function VerseToolbar({
  clickedVersesContext,
  clickedVerses,
  setClickedVerses,
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
  const getSelectionSettings = () => {
    // First check globalThis (set by SelectionUISettings component when user changes settings)
    if (globalThis.selectionUIBehavior?.[activeSpace]) {
      return globalThis.selectionUIBehavior[activeSpace];
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
      return currentSpace.selectionUIBehavior;
    }
    // Default settings
    return {
      showSelectedItems: true,
      showHighlightColors: true,
      showIconText: true,
      copyVerseMode: "withReference",
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
  const colorInputRef = useRef(null);
  const colorPickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isPickingColor && colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
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
    backgroundColor: "#fff",
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
  };

  const headerStyle = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  };

  const verseRefStyle = {
    fontSize: "14px",
    fontWeight: "600",
    color: "#000",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    backgroundColor: "#fff",
    padding: "8px 16px",
    borderRadius: "8px",
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
    backgroundColor: "#fff",
    border: "2px solid white",
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

  const handleClearAll = () => {
    // Extract verse numbers from composite keys (e.g., "Genesis-1-3" -> 3)
    const verseNumbers = Object.keys(highlighted).map((key) => {
      const parts = key.split('-');
      return Number(parts[parts.length - 1]);
    }).filter(num => !isNaN(num));

    // Clear all highlights
    verseNumbers.forEach((verseNum) => {
      if (globalThis.UnHighlightVerse) {
        globalThis.UnHighlightVerse(verseNum);
      }
    });

    // Close toolbar
    setClickedVerses([]);
    onClose();
  };

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

  return (
    <>
      <style>{`
        .toolbar-1.mounted{
          pointer-events:${globalThis.IsMobileNow() && showVerseToolbar ? "none !important" : ""}
        }
        
        `}</style>
      {globalThis.IsMobileNow() && selectionSettings.showSelectedItems && (
        <>
          <div className="verse-ref">
            <img src="https://res.cloudinary.com/dfbtwwa8p/image/upload/v1764875876/Rectangle_11_yzpmpm.svg" />
          </div>
          <span className="verse-ref" style={{...verseRefStyle,padding:'1px 16px'}}>
            {getVerseReference()}
          </span>
        </>
      )}
      <div className="verse-toolbar" style={containerStyle}>
        <style>
          {`
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
        padding: 3px 16px !important;
        height: 52px;
         background: var(--pageBackground) !important; 
    }
                    
            .header-ref {
              flex-direction: row !important;
              width: 100% !important;
              gap: 8px !important;
              align-items: center !important;
              justify-content: center;
            }
            
            .verse-ref {
              position: absolute !important;
              top: -91.8vh !important;
              left: 50% !important;
              transform: translateX(-50%) !important;
              margin: 0 !important;
            }
            
            .tool-buttons button span {
              font-size: 16px !important;
            }
            
            .color-buttons {
              
              
            }
            
            .tool-buttons {
              
              margin-left: 10px !important;
            }
            
            .color-circle, .plus-button, 
            .clear-button, .clear-all-button {
              width: 24px !important;
              height: 24px !important;
              font-size: 11px !important;
              padding: 6px 12px !important;
            }
            .clear-button, .clear-all-button {
              width: 100px !important;
              }
            .color-circle,
            .header-ref{
              // flex-wrap:wrap;
            }
            .divider-vertical{
            }
            .icon-button {
              width: 28px !important;
              height: 28px !important;
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
          {!globalThis.IsMobileNow() && selectionSettings.showSelectedItems && (
            <span className="verse-ref" style={verseRefStyle}>
              {getVerseReference()}
            </span>
          )}

          {!globalThis.IsMobileNow() && selectionSettings.showSelectedItems && (
            <div className="divider-vertical" style={dividerStyle}></div>
          )}

          {selectionSettings.showHighlightColors && (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              className="color-buttons"
              style={colorButtonsStyle}
            >
              {allHighlighted ? (
                <>
                  <button
                    className="clear-button"
                    style={{
                      ...plusButtonStyle,
                      width: "auto",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: "500",
                      color: "#dc2626",
                      border: "2px solid #dc2626",
                      backgroundColor: "#fff",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#fee2e2";
                      e.currentTarget.style.transform = "scale(1.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#fff";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                    onClick={handleClearHighlights}
                  >
                    Clear Selected
                  </button>
                  <button
                    className="clear-all-button"
                    style={{
                      ...plusButtonStyle,
                      width: "auto",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: "500",
                      color: "#991b1b",
                      border: "2px solid #991b1b",
                      backgroundColor: "#fff",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#fecaca";
                      e.currentTarget.style.transform = "scale(1.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#fff";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                    onClick={handleClearAll}
                  >
                    Clear All
                  </button>
                </>
              ) : (
                <>
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
                          color: "#666",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsPickingColor(false);
                          setTempColor(selectedColor);
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.transform = "scale(1.1)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.transform = "scale(1)")
                        }
                        aria-label="Cancel color selection"
                      >
                        ✕
                      </button>
                      <button
                        key="temp-preview"
                        className="color-circle"
                        style={{
                          ...circleButtonStyle(tempColor),
                          border: "3px solid #666",
                          boxShadow: "0 0 8px rgba(0,0,0,0.3)"
                        }}
                        aria-label={`Preview color ${tempColor}`}
                      />
                    </>
                  )}

                  {customColors.map((color) => (
                    <button
                      key={color}
                      className="color-circle"
                      style={circleButtonStyle(color)}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.transform = "scale(1.1)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.transform = "scale(1)")
                      }
                      onClick={() => handleColorClick(color)}
                      aria-label={`Highlight with ${color}`}
                    />
                  ))}

                  {defaultColors.map((color) => (
                    <button
                      key={color}
                      className="color-circle"
                      style={circleButtonStyle(color)}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.transform = "scale(1.1)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.transform = "scale(1)")
                      }
                      onClick={() => handleColorClick(color)}
                      aria-label={`Highlight with ${color}`}
                    />
                  ))}

                  <div ref={colorPickerRef}>
                    <button
                      className="plus-button"
                      style={plusButtonStyle}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.transform = "scale(1.1)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.transform = "scale(1)")
                      }
                      onClick={handlePlusClick}
                      aria-label="Add color"
                    >
                      <img
                        style={{ width: "44px", "-webkit-user-drag": "none" }}
                        src={
                          "https://res.cloudinary.com/dfbtwwa8p/image/upload/v1761753902/329cd5727522c1b0f09580e4c7b13964cb2b1a87_fvmcdy.png"
                        }
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
                </>
              )}
            </div>
          )}

          {selectionSettings.showHighlightColors && (
            <div className="divider-vertical" style={dividerStyle}></div>
          )}

          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="tool-buttons"
            style={toolButtonsStyle}
          >
            {menuOptions.map((option) => {
              if (option?.type === "line") {
                return (
                  <div className="divider-vertical" style={dividerStyle}></div>
                );
              } else {
                return (
                  <div class="toolbar-icon-container">
                    <div
                      onClick={option?.onClick}
                      className="icon-button"
                      style={iconButtonStyle}
                    >
                      {option.icon}
                    </div>
                    {selectionSettings.showIconText && (
                      <span style={{ color: "var(--text1) !important" }}>
                        {typeof option.title === "function"
                          ? option.title(clickedVersesContext)
                          : option.title}
                      </span>
                    )}
                  </div>
                );
              }
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function getMenuActions(that, onClose, activeSpace, spaces) {
  os.log("GET MENU ACTIONS VERSE TOOLBAR", that);
  const { SharePopup } = thisBot.Chips();

  // Get copy mode setting - first try globalThis, then fall back to saved space data
  const getSettings = () => {
    if (globalThis.selectionUIBehavior?.[activeSpace]) {
      return globalThis.selectionUIBehavior[activeSpace];
    }
    const currentSpace = spaces?.find((s) => s.id === activeSpace);
    if (currentSpace?.selectionUIBehavior) {
      return currentSpace.selectionUIBehavior;
    }
    return { copyVerseMode: "withReference" };
  };
  const selectionSettings = getSettings();

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

  const MenuOptions = {
    type: "normal",
    items: [
      {
        icon: <CopyIcon height="24" width="24" />,
        onClick: () => {
          const textToCopy =
            selectionSettings.copyVerseMode === "withReference"
              ? `${that.text}\n— ${buildReference()}`
              : that.text;
          os.setClipboard(textToCopy);
          SetInHold(null);
          onClose();
        },
        title: "Copy",
      },
      {
        icon: <ApologistIcon />,
        onClick: () => {
          ClearUserSelection();
          SetShowCommands(true);
          SetInHold(null);
        },
        title: "Agent",
      },
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
          onClick: () => {
            if (el.onClick) el.onClick();
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
          onClick: () => {
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
      className={`popupSettings`}
      style={{ maxHeight: "275px", overflowY: "auto", scrollbarWidth: "none" }}
    >
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
              onClick={() => {
                item.onClick();
              }}
              className={`itemSettings`}
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
      <style>{getStyleOf("sidebar.css")}</style>
    </div>
  );
};
