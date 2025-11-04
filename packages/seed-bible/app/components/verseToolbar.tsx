const { useState, useEffect } = os.appHooks;
import { MenuIcon, ApologistIcon } from "app.components.icons";

export function VerseToolbar({ clickedVersesContext, clickedVerses, setClickedVerses, toggleVerseHighlight, book, chapter, onColorSelect, highlighted, onClose }) {
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [selectedColor, setSelectedColor] = useState('#FDE047');
    const [customColors, setCustomColors] = useState([]);

    // Format verse reference with grouping logic
    const getVerseReference = () => {
        if (clickedVerses.length === 0) return '';
        const sorted = [...clickedVerses].sort((a, b) => a - b);

        // Group consecutive numbers
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

        return `${book} ${chapter}:${groups.join(',')}`;
    };

    const containerStyle = {
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        padding: '12px 20px',
        zIndex: 1000,
        animation: 'slideUp 0.3s ease-out',
        maxWidth: '95vw',
        width: 'auto',
    };

    const headerStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    };

    const verseRefStyle = {
        fontSize: '14px',
        fontWeight: '600',
        color: '#000',
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
    };

    const dividerStyle = {
        width: '1px',
        height: '24px',
        backgroundColor: '#d1d1d1',
    };

    const colorButtonsStyle = {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        position: 'relative',
    };

    const circleButtonStyle = (color) => ({
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        backgroundColor: color,
        border: 'none',
        cursor: 'pointer',
        transition: 'transform 0.2s',
    });

    const plusButtonStyle = {
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        backgroundColor: '#fff',
        border: '2px solid #d1d1d1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#666',
        transition: 'transform 0.2s',
        position: 'relative',
        padding: '0',
        lineHeight: '1',
    };

    const toolButtonsStyle = {
        display: 'flex',
        gap: '12px',
        marginLeft: 'auto',
    };

    const iconButtonStyle = {
        width: '36px',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: '#333',
        transition: 'background-color 0.2s',
        borderRadius: '4px',
        fontSize: '20px',
    };

    const colorPickerOverlayStyle = {
        position: 'absolute',
        bottom: '40px',
        left: '0',
        backgroundColor: '#fff',
        border: '1px solid #d1d1d1',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 1001,
    };

    const colorPickerLabelStyle = {
        fontSize: '12px',
        color: '#666',
        marginBottom: '8px',
        display: 'block',
        fontWeight: '500',
    };

    const colorInputStyle = {
        width: '150px',
        height: '40px',
        border: '1px solid #d1d1d1',
        borderRadius: '4px',
        cursor: 'pointer',
    };

    const closeButtonStyle = {
        width: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: '#999',
        fontSize: '20px',
        marginLeft: '8px',
    };

    const defaultColors = ['#FDE047', '#5EEAD4', '#A3E635', '#FCA5A5', '#C4B5FD'];

    // Check if all clicked verses are already highlighted
    const allHighlighted = clickedVerses.some(num => highlighted[num]);


    const handleColorClick = (color) => {
        onColorSelect(color);
    };

    const handleClearHighlights = () => {
        // Clear highlights for clicked verses
        clickedVerses.forEach(verseNum => {
            if (globalThis.UnHighlightVerse) {
                globalThis.UnHighlightVerse(verseNum);
            }
        });
        onClose();
    };

    const handleClearAll = () => {
        // globalThis.ClearAllWordHighlights()
        Object.keys(highlighted).forEach(key => {
            // const value = myObject[key];
            toggleVerseHighlight(Number(key));
            setClickedVerses([])
        });
    };

    const handleCustomColorAdd = () => {
        if (!customColors.includes(selectedColor)) {
            setCustomColors(prev => [...prev, selectedColor]);
        }
        handleColorClick(selectedColor);
        setShowColorPicker(false);
    };
    const menuOptions = getMenuActions(clickedVersesContext) || []
    return (
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
            .tool-buttons button span {
              font-size: 16px !important;
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
              flex-wrap:wrap;
            }
            .divider-vertical{
                display:none;
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

            <div className="header-ref" style={headerStyle}>
                <span className="verse-ref" style={verseRefStyle}>{getVerseReference()}</span>

                <div className="divider-vertical" style={dividerStyle}></div>

                <div className="color-buttons" style={colorButtonsStyle}>
                    {allHighlighted ? (
                        // Show clear options when verses are highlighted
                        <>
                            <button
                                className="clear-button"
                                style={{
                                    ...plusButtonStyle,
                                    width: 'auto',
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    color: '#dc2626',
                                    border: '2px solid #dc2626',
                                    backgroundColor: '#fff',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#fee2e2';
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#fff';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                                onClick={handleClearHighlights}
                            >
                                Clear Selected
                            </button>
                            <button
                                className="clear-all-button"
                                style={{
                                    ...plusButtonStyle,
                                    width: 'auto',
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    color: '#991b1b',
                                    border: '2px solid #991b1b',
                                    backgroundColor: '#fff',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#fecaca';
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#fff';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                                onClick={handleClearAll}
                            >
                                Clear All
                            </button>
                        </>
                    ) : (
                        // Show color options when verses are not highlighted
                        <>
                            {defaultColors.map(color => (
                                <button
                                    key={color}
                                    className="color-circle"
                                    style={circleButtonStyle(color)}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    onClick={() => handleColorClick(color)}
                                    aria-label={`Highlight with ${color}`}
                                />
                            ))}

                            {customColors.map(color => (
                                <button
                                    key={color}
                                    className="color-circle"
                                    style={circleButtonStyle(color)}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    onClick={() => handleColorClick(color)}
                                    aria-label={`Highlight with ${color}`}
                                />
                            ))}

                            <button
                                className="plus-button"
                                style={plusButtonStyle}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                onClick={() => setShowColorPicker(!showColorPicker)}
                                aria-label="Add color"
                            >
                                <img style={{ width: '38px' }} src={"https://res.cloudinary.com/dfbtwwa8p/image/upload/v1761753902/329cd5727522c1b0f09580e4c7b13964cb2b1a87_fvmcdy.png"} />
                            </button>

                            {showColorPicker && (
                                <div style={colorPickerOverlayStyle}>
                                    <label style={colorPickerLabelStyle}>Choose a color:</label>
                                    <input
                                        type="color"
                                        value={selectedColor}
                                        onChange={(e) => setSelectedColor(e.target.value)}
                                        style={colorInputStyle}
                                    />
                                    <button
                                        onClick={handleCustomColorAdd}
                                        style={{
                                            marginTop: '8px',
                                            padding: '6px 12px',
                                            borderRadius: '4px',
                                            border: '1px solid #ccc',
                                            backgroundColor: '#f5f5f5',
                                            cursor: 'pointer',
                                            fontSize: '12px'
                                        }}
                                    >
                                        Add Color
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="divider-vertical" style={dividerStyle}></div>

                <div className="tool-buttons" style={toolButtonsStyle}>
                    {
                        menuOptions.map(option =>
                            <div onClick={option?.onClick} className="icon-button" style={iconButtonStyle}>
                                {option.icon}
                            </div>
                        )
                    }
                    {null/*<button className="icon-button" style={iconButtonStyle} aria-label="Edit">
                        <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button className="icon-button" style={iconButtonStyle} aria-label="Frame">
                        <span className="material-symbols-outlined">crop_square</span>
                    </button>
                    <button className="icon-button" style={iconButtonStyle} aria-label="AI Tools">
                        <span className="material-symbols-outlined">auto_awesome</span>
                    </button>
                    <button className="icon-button" style={iconButtonStyle} aria-label="Share">
                        <span className="material-symbols-outlined">share</span>
                    </button>
                    <button className="icon-button" style={iconButtonStyle} aria-label="Bookmark">
                        <span className="material-symbols-outlined">bookmark</span>
                    </button>
                    <button className="icon-button" style={iconButtonStyle} aria-label="Copy">
                        <span className="material-symbols-outlined">content_copy</span>
                    </button>*/}
                </div>
            </div>
        </div>
    );
}

function getMenuActions(that) {
    const {SharePopup} = thisBot.Chips();
    const MenuOptions = {
        type: "normal",
        items: [
            {
                icon: <MenuIcon name="copy_all" />,
                onClick: () => {
                    os.setClipboard(that.text);
                    SetInHold(null);
                },
            },
            {
                icon: <ApologistIcon />,
                onClick: () => {
                    ClearUserSelection();
                    SetShowCommands(true);
                    SetInHold(null);
                },
            },
            {
                icon: <MenuIcon name="share" />,
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
    return MenuOptions.items
        // .filter((i) => i.icon && typeof i.onClick === "function")
        .map(({ icon, onClick }) => ({ icon, onClick }));
}
