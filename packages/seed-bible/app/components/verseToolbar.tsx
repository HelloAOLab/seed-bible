const { useState, useEffect, useRef, useMemo } = os.appHooks;
import {
  MenuIcon,
  ApologistIcon,
  CopyIcon,
  ShareIcon,
  LocationIcon,
} from "app.components.icons";

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
}) {
  const [selectedColor, setSelectedColor] = useState("#FDE047");
  const [customColors, setCustomColors] = useState(masks?.customColors?masks.customColors:[]);
  useEffect(()=>{
    masks.customColors = customColors
  },[customColors])
  const [tempColor, setTempColor] = useState(null);
  const colorInputRef = useRef(null);
  const colorPickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tempColor) {
        handleColorClick(tempColor);
        setSelectedColor(tempColor);
        setTempColor(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [tempColor, customColors]);

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
    width: "32px",
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
    color: "#333",
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

  const allHighlighted = clickedVerses.some((num) => highlighted[num]);

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
    Object.keys(highlighted).forEach((key) => {
      toggleVerseHighlight(Number(key));
      setClickedVerses([]);
    });
  };

  const handlePlusClick = () => {
    setTempColor(selectedColor);
    colorInputRef.current?.click();
  };

const handleColorChange = (e) => {
  const newColor = e.target.value;
  setTempColor(newColor);
  
  // Add color to customColors array, max 3
  setCustomColors((prev) => {
    // Check if color already exists
    if (prev.includes(newColor)) {
      return prev;
    }
    
    // If less than 3, just add it
    if (prev.length < 3) {
      return [...prev, newColor];
    }
    
    // If 3 or more, remove first and add new one at the end
    return [...prev.slice(1), newColor];
  });
};

  const menuOptions = useMemo(() => {
    return getMenuActions(clickedVersesContext,onClose) || [];
  }, [clickedVersesContext]);

  return (
    <>
    {globalThis.IsMobileNow()&&<span className="verse-ref" style={verseRefStyle}>
          {getVerseReference()}
        </span>}
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
              border-radius: 16px 16px 0 0 !important;
              padding: 12px 16px !important;
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
              top: -95vh !important;
              left: 50% !important;
              transform: translateX(-50%) !important;
              margin: 0 !important;
              border: 1px solid rgb(229, 229, 229); 
              box-shadow: rgba(0, 0, 0, 0.1) 0px 2px
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
        {!globalThis.IsMobileNow()&&<span className="verse-ref" style={verseRefStyle}>
          {getVerseReference()}
        </span>}

        {!globalThis.IsMobileNow()&&<div className="divider-vertical" style={dividerStyle}></div>}

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
                    style={{ width: "38px" ,"-webkit-user-drag": "none"}}
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

        <div className="divider-vertical" style={dividerStyle}></div>

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
                  <span>{option.title}</span>
                </div>
              );
            }
          })}
        </div>
      </div>
    </div>
  </>);
}

function getMenuActions(that,onClose) {
  const { SharePopup } = thisBot.Chips();
  const MenuOptions = {
    type: "normal",
    items: [
      {
        icon: <CopyIcon height="24" width="24" />,
        onClick: () => {
          os.setClipboard(that.text);
          SetInHold(null);
          onClose()
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
        title: "Apologist",
      },
      {
        icon: <ShareIcon height="24" width="24" />,
        onClick: () => {
          closePopupSettings();
          setTimeout(() => {
            openPopupSettings(
              <SharePopup shareTitle={`Check this out! ${that.text}`} />,
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
        const subMenuItems = {
          type: "normal",
          items: [],
        };
        subMenuItems.items.push(...itemsHolder);
        openPopupSettings(subMenuItems);
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
  return (
    MenuOptions.items
      .map(({ icon, onClick, title, type }) => ({ icon, onClick, title, type }))
  );
}