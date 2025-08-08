const { createContext, useContext, useState, useEffect } = os.appHooks;
import { getStyleOf } from 'app.styles.styler';
import { DualScreenIcon, ThreeScreenIcon, QuadScreenIcon } from 'app.components.icons'
const MyContext = createContext();

export function SideBarProvider({ children }) {
    const [vars, setVars] = useState({})
    const [sidebarMode, setSideBarMode] = useState('default')
    const [collapsed, setCollapsed] = useState(false);
    const [popupSettings, setPopupSettings] = useState(false)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [wait, setWait] = useState(false)
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (event) => {
            setMousePosition({ x: event.clientX, y: event.clientY });
        };

        document.addEventListener('mousemove', handleMouseMove);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    function openPopupSettings(props, wait) {
        setWait(wait)
        if (popupSettings) {
            closePopupSettings()
            return
        }
        const pointerX = mousePosition.x;
        const pointerY = mousePosition.y;


        const adjustedPosition = adjustPositionWithinScreen(pointerX, pointerY);
        setPosition(adjustedPosition);

        setTimeout(() => {
            setPopupSettings(props)
        }, 100)
    }

    function adjustPositionWithinScreen(x, y) {
        const popupWidth = 250; // Adjust to your popup's actual width
        const popupHeight = 230; // Adjust to your popup's actual height
        const margin = 10; // Minimum margin from the screen edges

        let adjustedX = x;
        let adjustedY = y;

        if (x + popupWidth > window.innerWidth - margin) {
            adjustedX = window.innerWidth - popupWidth - margin;
        }

        if (y + popupHeight > window.innerHeight - margin) {
            adjustedY = window.innerHeight - popupHeight - margin - 45;
        }

        if (adjustedX < margin) adjustedX = margin;
        if (adjustedY < margin) adjustedY = margin;

        return { x: adjustedX, y: adjustedY };
    }

    globalThis.openPopupSettings = openPopupSettings

    function closePopupSettings() {
        if (wait) {
            setWait(false)
            return
        }
        setPopupSettings(false)
    }
    globalThis.closePopupSettings = closePopupSettings
    useEffect(() => {
        if (popupSettings) {
            const adjustedPosition = adjustPositionWithinScreen(position.x, position.y);
            setPosition(adjustedPosition);
        }
    }, [popupSettings]);

    return (
        <MyContext.Provider value={{ vars, setVars, wait, setWait, sidebarMode, setSideBarMode, collapsed, setCollapsed, openPopupSettings, closePopupSettings }}>
            {children}
            {
                popupSettings &&
                <div
                    style={{
                        position: 'fixed',
                        left: `${position.x}px`,
                        top: `${position.y}px`,
                        zIndex: '10000',
                        pointerEvents: 'auto'
                    }}
                >
                    <PopupSettings {...popupSettings} />
                </div>
            }
        </MyContext.Provider>
    );
}

export function PopupSettings({ items, type }) {
    const [external, setextrnal] = useState(false)
    return (
        <div className="popupSettings">
            {external && <div className=" externalPopupSettings">{external}</div>}
            {null /*<div className="triangle-up"></div>*/}
            {
                items.map(item => {
                    if (item?.type === 'line')
                        return <div style={{
                            width: "100%",
                            height: "1px",
                            backgroundColor: "#cdcccc3b",
                        }}></div>
                    else
                        return (
                            <div
                                onClick={() => {
                                    item.onClick()
                                    if (item.external)
                                        setextrnal(item.external)
                                }}
                                className="itemSettings"
                                style={{ cursor: 'pointer' }}
                            >
                                <div>{item.icon}</div>
                                <div>{item.title}</div>
                            </div>
                        )
                })
            }
            <style>{getStyleOf('sidebar.css')}</style>
        </div>
    );
}

export function useSideBarContext() {
    return useContext(MyContext);
}