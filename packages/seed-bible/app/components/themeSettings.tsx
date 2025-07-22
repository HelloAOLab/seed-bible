const { useEffect, useState, useRef } = os.appHooks;
import { getStyleOf } from 'app.styles.styler';
import { MenuIcon, ThemeIcon } from 'app.components.icons';
import { useTabsContext } from 'app.hooks.tabs';
import { useSideBarContext } from 'app.hooks.sideBar';
import { useBibleContext } from 'app.hooks.bibleVariables';

const defaultTheme = {
    sideMenu: '#f0f1f1',
    background: 'white',
    panel: null,
    toolbar: 'white',
    text1: '#606060',
    text2: '#000',
};
const ThemeSettings = () => {
    const { updateSpace, activeSpace, currentSpace } = useTabsContext();
    const { setSideBarMode, closePopupSettings, setThemeColors, themeColors } = useSideBarContext();
    const [changesSaved, setChagesSaved] = useState(false)
    const [colorsMap, setColorsMap] = useState({});
    const [originalColorsMap, setOriginalColorsMap] = useState({});

    useEffect(() => {
        // setColorsMap(prev => {
        //     if (prev[activeSpace]) return prev;


        //     setOriginalColorsMap(orig => ({
        //         ...orig,
        //         [activeSpace]: defaultTheme
        //     }));

        //     return {
        //         ...prev,
        //         [activeSpace]: defaultTheme
        //     };
        // });
        globalThis.CurrentColors = themeColors[`${activeSpace}`] || defaultTheme
    }, []);


    const colors = colorsMap[activeSpace] || {};

    const handleColorChange = (field, value) => {
        const newColor = value.target.value;
        setChagesSaved(false)
        if (field === 'toolbar') {
            globalThis.SetToolbarBackground(newColor);
        }

        const updatedColors = {
            ...colors,
            [field]: newColor,
        };

        setColorsMap(prev => ({
            ...prev,
            [activeSpace]: updatedColors
        }));

        // Update sidebar theme state and persist
        setThemeColors(prev => ({ ...prev, [activeSpace]: updatedColors }));
        updateSpace(activeSpace, { themeColors: updatedColors });
    };
    useEffect(() => {
        if (!changesSaved) {
            // const original = originalColorsMap[activeSpace];
            // if (original) {
            // setColorsMap(prev => ({
            //     ...prev,
            //     [activeSpace]: defaultTheme
            // }));
            setThemeColors(prev => ({ ...prev, [activeSpace]:  globalThis.CurrentColors })); // apply immediately
            // updateSpace(activeSpace, { themeColors: original });
            // }
        }
    }, [activeSpace])
    return (
        <div className="themeSettings-container">

            <div className="routerOptions">
                <div onClick={() => {
                    // if (!changesSaved) {
                    //     const original = originalColorsMap[activeSpace];
                    //     if (original) {
                    //         setColorsMap(prev => ({
                    //             ...prev,
                    //             [activeSpace]: original
                    //         }));
                    //         setThemeColors(original); // apply immediately
                    //         updateSpace(activeSpace, { themeColors: original });
                    //     }
                    // }
                    if (!changesSaved) {
                        setThemeColors(prev => ({ ...prev, [activeSpace]:  globalThis.CurrentColors }));
                    }
                    setSideBarMode('settings');
                }}

                    style={{ cursor: 'pointer' }} className="blackText">
                    <MenuIcon name="arrow_back" />
                </div>
                <div className="softText">Page settings</div>
                <div className="softText"><MenuIcon name="chevron_right" /></div>
                <div className="softText">Theme</div>
            </div>

            <div className="routerTitle blackText">
                <div className="blackText"><ThemeIcon /></div>
                <div> {currentSpace.name} Theme</div>
            </div>


            <div style={{ height: '25px' }} />


            {null/*
            <div className="mediumText">Edit theme for {currentSpace.name}</div>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
            <div style={{ height: '34px' }} />
                <div
                    style={{
                        color: colors.text1,
                        "font-family": "Open Sans",
                        "font-size": "16px",
                        "font-style": "normal",
                        "font-weight": "600",
                        "line-height": "normal",
                    }}
                >
                    <span
                        style={{
                            display: "flex",
                            justifyContent: "start",
                            alignItems: "center",
                            gap: "5px",
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M5 21C4.45 21 3.97917 20.8042 3.5875 20.4125C3.19583 20.0208 3 19.55 3 19V5C3 4.45 3.19583 3.97917 3.5875 3.5875C3.97917 3.19583 4.45 3 5 3H19C19.55 3 20.0208 3.19583 20.4125 3.5875C20.8042 3.97917 21 4.45 21 5V19C21 19.55 20.8042 20.0208 20.4125 20.4125C20.0208 20.8042 19.55 21 19 21H5ZM16 19H19V5H16V19ZM14 19V5H5V19H14Z" fill="black" />
                        </svg>{" "}
                        Panel
                    </span>
                </div>
                <ColorSelect color={colors.panel} onChange={(val) => handleColorChange("panel", val)} />
            </div>*/}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <div
                    style={{
                        color: colors.text1,
                        "font-family": "Open Sans",
                        "font-size": "16px",
                        "font-style": "normal",
                        "font-weight": "600",
                        "line-height": "normal",
                    }}
                >
                    <span
                        style={{
                            display: "flex",
                            justifyContent: "start",
                            alignItems: "center",
                            gap: "5px",
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M5 21C4.45 21 3.97917 20.8042 3.5875 20.4125C3.19583 20.0208 3 19.55 3 19V5C3 4.45 3.19583 3.97917 3.5875 3.5875C3.97917 3.19583 4.45 3 5 3H19C19.55 3 20.0208 3.19583 20.4125 3.5875C20.8042 3.97917 21 4.45 21 5V19C21 19.55 20.8042 20.0208 20.4125 20.4125C20.0208 20.8042 19.55 21 19 21H5ZM8 19V5H5V19H8ZM10 19H19V5H10V19Z" fill="black" />
                        </svg>{" "}
                        Menu
                    </span>
                </div>
                <ColorSelect color={colors.sideMenu} onChange={(val) => handleColorChange("sideMenu", val)} />
            </div>
            <div style={{ height: '34px' }} />
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <div
                    style={{
                        color: colors.text1,
                        "font-family": "Open Sans",
                        "font-size": "16px",
                        "font-style": "normal",
                        "font-weight": "600",
                        "line-height": "normal",
                    }}
                >
                    <span
                        style={{
                            display: "flex",
                            justifyContent: "start",
                            alignItems: "center",
                            gap: "5px",
                        }}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                        >
                            <path
                                d="M8.5 17C8.91667 17 9.27083 16.8542 9.5625 16.5625C9.85417 16.2708 10 15.9167 10 15.5C10 15.0833 9.85417 14.7292 9.5625 14.4375C9.27083 14.1458 8.91667 14 8.5 14C8.08333 14 7.72917 14.1458 7.4375 14.4375C7.14583 14.7292 7 15.0833 7 15.5C7 15.9167 7.14583 16.2708 7.4375 16.5625C7.72917 16.8542 8.08333 17 8.5 17ZM8.5 10C8.91667 10 9.27083 9.85417 9.5625 9.5625C9.85417 9.27083 10 8.91667 10 8.5C10 8.08333 9.85417 7.72917 9.5625 7.4375C9.27083 7.14583 8.91667 7 8.5 7C8.08333 7 7.72917 7.14583 7.4375 7.4375C7.14583 7.72917 7 8.08333 7 8.5C7 8.91667 7.14583 9.27083 7.4375 9.5625C7.72917 9.85417 8.08333 10 8.5 10ZM15.5 17C15.9167 17 16.2708 16.8542 16.5625 16.5625C16.8542 16.2708 17 15.9167 17 15.5C17 15.0833 16.8542 14.7292 16.5625 14.4375C16.2708 14.1458 15.9167 14 15.5 14C15.0833 14 14.7292 14.1458 14.4375 14.4375C14.1458 14.7292 14 15.0833 14 15.5C14 15.9167 14.1458 16.2708 14.4375 16.5625C14.7292 16.8542 15.0833 17 15.5 17ZM15.5 10C15.9167 10 16.2708 9.85417 16.5625 9.5625C16.8542 9.27083 17 8.91667 17 8.5C17 8.08333 16.8542 7.72917 16.5625 7.4375C16.2708 7.14583 15.9167 7 15.5 7C15.0833 7 14.7292 7.14583 14.4375 7.4375C14.1458 7.72917 14 8.08333 14 8.5C14 8.91667 14.1458 9.27083 14.4375 9.5625C14.7292 9.85417 15.0833 10 15.5 10ZM5 21C4.45 21 3.97917 20.8042 3.5875 20.4125C3.19583 20.0208 3 19.55 3 19V5C3 4.45 3.19583 3.97917 3.5875 3.5875C3.97917 3.19583 4.45 3 5 3H19C19.55 3 20.0208 3.19583 20.4125 3.5875C20.8042 3.97917 21 4.45 21 5V19C21 19.55 20.8042 20.0208 20.4125 20.4125C20.0208 20.8042 19.55 21 19 21H5ZM5 19H19V5H5V19Z"
                                fill="black"
                            />
                        </svg>{" "}
                        Panel background
                    </span>
                </div>
                <ColorSelect color={colors.background} onChange={(val) => handleColorChange("background", val)} />

            </div>
            <div style={{ height: '34px' }} />

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <div
                    style={{
                        color: colors.text1,
                        "font-family": "Open Sans",
                        "font-size": "16px",
                        "font-style": "normal",
                        "font-weight": "600",
                        "line-height": "normal",
                    }}
                >
                    <span
                        style={{
                            display: "flex",
                            justifyContent: "start",
                            alignItems: "center",
                            gap: "5px",
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18.85 21.975C18.7167 21.975 18.5917 21.9542 18.475 21.9125C18.3583 21.8708 18.25 21.8 18.15 21.7L13.05 16.6C12.95 16.5 12.8792 16.3917 12.8375 16.275C12.7958 16.1583 12.775 16.0333 12.775 15.9C12.775 15.7667 12.7958 15.6417 12.8375 15.525C12.8792 15.4083 12.95 15.3 13.05 15.2L15.175 13.075C15.275 12.975 15.3833 12.9042 15.5 12.8625C15.6167 12.8208 15.7417 12.8 15.875 12.8C16.0083 12.8 16.1333 12.8208 16.25 12.8625C16.3667 12.9042 16.475 12.975 16.575 13.075L21.675 18.175C21.775 18.275 21.8458 18.3833 21.8875 18.5C21.9292 18.6167 21.95 18.7417 21.95 18.875C21.95 19.0083 21.9292 19.1333 21.8875 19.25C21.8458 19.3667 21.775 19.475 21.675 19.575L19.55 21.7C19.45 21.8 19.3417 21.8708 19.225 21.9125C19.1083 21.9542 18.9833 21.975 18.85 21.975ZM5.125 22C4.99167 22 4.8625 21.975 4.7375 21.925C4.6125 21.875 4.5 21.8 4.4 21.7L2.3 19.6C2.2 19.5 2.125 19.3875 2.075 19.2625C2.025 19.1375 2 19.0083 2 18.875C2 18.7417 2.025 18.6167 2.075 18.5C2.125 18.3833 2.2 18.275 2.3 18.175L7.6 12.875H9.725L10.575 12.025L6.45 7.9H5.025L2 4.875L4.825 2.05L7.85 5.075V6.5L11.975 10.625L14.875 7.725L13.8 6.65L15.2 5.25H12.375L11.675 4.55L15.225 1L15.925 1.7V4.525L17.325 3.125L20.875 6.675C21.1583 6.95833 21.375 7.27917 21.525 7.6375C21.675 7.99583 21.75 8.375 21.75 8.775C21.75 9.175 21.675 9.55833 21.525 9.925C21.375 10.2917 21.1583 10.6167 20.875 10.9L18.75 8.775L17.35 10.175L16.3 9.125L11.125 14.3V16.4L5.825 21.7C5.725 21.8 5.61667 21.875 5.5 21.925C5.38333 21.975 5.25833 22 5.125 22Z" fill="black" />
                        </svg>{" "}
                        Toolbar
                    </span>
                </div>
                <ColorSelect color={colors.toolbar} onChange={(val) => handleColorChange("toolbar", val)} />
            </div>
            <div style={{ height: '34px' }} />

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <div
                    style={{
                        color: colors.text1,
                        "font-family": "Open Sans",
                        "font-size": "16px",
                        "font-style": "normal",
                        "font-weight": "600",
                        "line-height": "normal",
                    }}
                >
                    <span
                        style={{
                            display: "flex",
                            justifyContent: "start",
                            alignItems: "center",
                            gap: "5px",
                        }}
                    >
                        <span class="material-symbols-outlined">
                            text_fields
                        </span>{" "}
                        Text color 1
                    </span>
                </div>
                <ColorSelect color={colors.text1} onChange={(val) => handleColorChange("text1", val)} />
            </div>
            <div style={{ height: '34px' }} />

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <div
                    style={{
                        color: colors.text1,
                        "font-family": "Open Sans",
                        "font-size": "16px",
                        "font-style": "normal",
                        "font-weight": "600",
                        "line-height": "normal",
                    }}
                >
                    <span
                        style={{
                            display: "flex",
                            justifyContent: "start",
                            alignItems: "center",
                            gap: "5px",
                        }}
                    >
                        <span class="material-symbols-outlined">
                            text_fields
                        </span>{" "}
                        Text color 2
                    </span>
                </div>
                <ColorSelect color={colors.text2} onChange={(val) => handleColorChange("text2", val)} />
            </div>
            <div style={{ height: '15px' }} />
            <div className="sidebarLine"></div>
            <div style={{ height: '15px' }} />
            {null/* <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <div
                    style={{
                        color: colors.text1,
                        "font-family": "Open Sans",
                        "font-size": "16px",
                        "font-style": "normal",
                        "font-weight": "600",
                        "line-height": "normal",
                    }}
                >
                    <span
                        style={{
                            display: "flex",
                            justifyContent: "start",
                            alignItems: "center",
                            gap: "5px",
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M5 21C4.45 21 3.97917 20.8042 3.5875 20.4125C3.19583 20.0208 3 19.55 3 19V5C3 4.45 3.19583 3.97917 3.5875 3.5875C3.97917 3.19583 4.45 3 5 3H19C19.55 3 20.0208 3.19583 20.4125 3.5875C20.8042 3.97917 21 4.45 21 5V19C21 19.55 20.8042 20.0208 20.4125 20.4125C20.0208 20.8042 19.55 21 19 21H5ZM5 19H19V5H5V19ZM8 9C8.28333 9 8.52083 8.90417 8.7125 8.7125C8.90417 8.52083 9 8.28333 9 8C9 7.71667 8.90417 7.47917 8.7125 7.2875C8.52083 7.09583 8.28333 7 8 7C7.71667 7 7.47917 7.09583 7.2875 7.2875C7.09583 7.47917 7 7.71667 7 8C7 8.28333 7.09583 8.52083 7.2875 8.7125C7.47917 8.90417 7.71667 9 8 9ZM12 9C12.2833 9 12.5208 8.90417 12.7125 8.7125C12.9042 8.52083 13 8.28333 13 8C13 7.71667 12.9042 7.47917 12.7125 7.2875C12.5208 7.09583 12.2833 7 12 7C11.7167 7 11.4792 7.09583 11.2875 7.2875C11.0958 7.47917 11 7.71667 11 8C11 8.28333 11.0958 8.52083 11.2875 8.7125C11.4792 8.90417 11.7167 9 12 9ZM16 9C16.2833 9 16.5208 8.90417 16.7125 8.7125C16.9042 8.52083 17 8.28333 17 8C17 7.71667 16.9042 7.47917 16.7125 7.2875C16.5208 7.09583 16.2833 7 16 7C15.7167 7 15.4792 7.09583 15.2875 7.2875C15.0958 7.47917 15 7.71667 15 8C15 8.28333 15.0958 8.52083 15.2875 8.7125C15.4792 8.90417 15.7167 9 16 9ZM16 13C16.2833 13 16.5208 12.9042 16.7125 12.7125C16.9042 12.5208 17 12.2833 17 12C17 11.7167 16.9042 11.4792 16.7125 11.2875C16.5208 11.0958 16.2833 11 16 11C15.7167 11 15.4792 11.0958 15.2875 11.2875C15.0958 11.4792 15 11.7167 15 12C15 12.2833 15.0958 12.5208 15.2875 12.7125C15.4792 12.9042 15.7167 13 16 13ZM12 13C12.2833 13 12.5208 12.9042 12.7125 12.7125C12.9042 12.5208 13 12.2833 13 12C13 11.7167 12.9042 11.4792 12.7125 11.2875C12.5208 11.0958 12.2833 11 12 11C11.7167 11 11.4792 11.0958 11.2875 11.2875C11.0958 11.4792 11 11.7167 11 12C11 12.2833 11.0958 12.5208 11.2875 12.7125C11.4792 12.9042 11.7167 13 12 13ZM8 13C8.28333 13 8.52083 12.9042 8.7125 12.7125C8.90417 12.5208 9 12.2833 9 12C9 11.7167 8.90417 11.4792 8.7125 11.2875C8.52083 11.0958 8.28333 11 8 11C7.71667 11 7.47917 11.0958 7.2875 11.2875C7.09583 11.4792 7 11.7167 7 12C7 12.2833 7.09583 12.5208 7.2875 12.7125C7.47917 12.9042 7.71667 13 8 13Z" fill="black" />
                        </svg>{" "}
                        Text Margins
                    </span>
                </div>

            </div>
            <div style={{ height: '25px' }} />
            <div style={{ display: "flex", flexDirection: "row", gap: "10px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div className="themeText">Right Margin</div>
                    <input
                        style={{ height: '10px', width: '100px' }}
                        type="number"
                        id="input"
                        placeholder="500px"
                        className="input-field number selectInput"
                    />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: `10px` }}>
                    <div className="themeText">Left Margin</div>
                    <input
                        style={{ height: '10px', width: '100px' }}
                        type="number"
                        id="input"
                        placeholder="500px"
                        className="input-field number selectInput"
                    />
                </div>
            </div>*/}
            <button onClick={() => {
                os.toast('changes saved')
                setChagesSaved(true)
            }} className="themeButton">Save changes</button>
            <style>{getStyleOf('themeSettings.css')}</style>
        </div>
    );
};




const ColorRow = ({ label, iconPath, color, onChange }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{
            color: colors.text1,
            fontFamily: "Open Sans",
            fontSize: "16px",
            fontStyle: "normal",
            fontWeight: "600",
            lineHeight: "normal",
        }}>
            <span style={{
                display: "flex",
                justifyContent: "start",
                alignItems: "center",
                gap: "5px",
            }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d={iconPath} fill="black" />
                </svg>{" "}
                {label}
            </span>
        </div>
        <ColorSelect color={color} onChange={onChange} />
    </div>
);

const ColorSelect = ({ color, onChange }) => {
    const inputRef = useRef();
    return (
        <div
            onClick={() => inputRef.current.click()}
            style={{
                width: "24px",
                height: "24px",
                flexShrink: "0",
                aspectRatio: "1 / 1",
            }}
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="11.5" fill={color || '#868686'} stroke="black" />
            </svg>
            <input
                ref={inputRef}
                style={{ opacity: '0' }}
                type="color"
                value={color}
                onChange={onChange}
            />
        </div>
    );
};

export { ThemeSettings };
