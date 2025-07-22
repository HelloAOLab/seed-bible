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
    const [popupComponent, setPopupComponent] = useState(null)
    const [sidebarWidth, setSidebarWidth] = useState(280);
    const [themeColors, setThemeColors] = useState()
    useEffect(() => {
        const handleMouseMove = (event) => {
            setMousePosition({ x: event.clientX, y: event.clientY });
        };

        document.addEventListener('mousemove', handleMouseMove);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    function openPopupSettings(props, wait, popupComponent) {
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
            if (popupComponent) {
                setPopupComponent(props)
            } else {
                setPopupSettings(props)
            }
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
        setPopupComponent(false)
        os.unregisterApp("PopupSettings");
    }
    globalThis.closePopupSettings = closePopupSettings
    useEffect(() => {
        if (popupSettings) {
            const adjustedPosition = adjustPositionWithinScreen(position.x, position.y);
            setPosition(adjustedPosition);
        }
    }, [popupSettings]);

    useEffect(() => {
        if (popupSettings || popupComponent) {
            runPopUpSettings({ ...popupSettings, sidebarContext: { closePopupSettings, position, popupComponent } })
        } else {
            os.unregisterApp("PopupSettings");
        }
    }, [popupSettings, popupComponent])

    return (
        <MyContext.Provider value={{ themeColors, setThemeColors, vars, setVars, wait, setWait, sidebarMode, setSideBarMode, collapsed, setCollapsed, openPopupSettings, sidebarWidth, setSidebarWidth, closePopupSettings }}>
            {children}
        </MyContext.Provider>
    );
}

export function PopupSettings({ items, type, disabled, sidebarContext }) {
    const [external, setextrnal] = useState(false)
    return (
        <div
            onClick={sidebarContext.closePopupSettings}
            style={{
                position: 'fixed',
                left: `${sidebarContext.position.x}px`,
                top: `${sidebarContext.position.y}px`,
                zIndex: '10000',
                pointerEvents: 'auto'
            }}
        >
            {sidebarContext.popupComponent || <div className={`popupSettings ${disabled ? 'disabled' : null}`}>
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
                                    className={`itemSettings ${item?.disabled && 'disabled'}`}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div>{item.icon}</div>
                                    <div>{item.title}</div>
                                </div>
                            )
                    })
                }
                <style>{getStyleOf('sidebar.css')}</style>
            </div>}
        </div>
    );
}

async function runPopUpSettings({ ...props }) {
    await os.unregisterApp("PopupSettings");
    await os.registerApp("PopupSettings");
    os.compileApp('PopupSettings', <PopupSettings {...props} />);
}

export function useSideBarContext() {
    return useContext(MyContext);
}