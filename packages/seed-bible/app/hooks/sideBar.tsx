const { createContext, useContext, useState, useEffect, useLayoutEffect } =
  os.appHooks;
import { getStyleOf } from "app.styles.styler";
import {
  DualScreenIcon,
  ThreeScreenIcon,
  QuadScreenIcon,
} from "app.components.icons";
const MyContext = createContext();

export function SideBarProvider({ children }) {
  const [vars, setVars] = useState({});
  const [sidebarMode, setSideBarMode] = useState("default");
  const [collapsed, setCollapsed] = useState(false);
  const [popupSettings, setPopupSettings] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [wait, setWait] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [popupComponent, setPopupComponent] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [themeColors, setThemeColors] = useState();
  const [userURL, setUserURL] = useState();
  const [customIcon, setCustomIcon] = useState(null);
  const [packageAddingOptions, setPackageAddingOptions] = useState([]);
  const [openOnMobile, setOpenOnMobile] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      const check = window.innerWidth < 768;
      setIsMobile(check);
      if (window.innerWidth <= 940 && !check) {
        setCollapsed(true);
        setSidebarWidth(60);
      } else {
        if (check) return;
        setCollapsed(false);
        setSidebarWidth(280);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  globalThis.SetPackageAddingOptions = setPackageAddingOptions;
  useEffect(() => {
    console.log(packageAddingOptions, "addingOptions");
  }, [packageAddingOptions]);
  useEffect(() => {
    // ShowToolbar(!openOnMobile)
  }, [openOnMobile]);
  useEffect(() => {
    const handleMouseMove = (event) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  function openPopupSettings(props, wait, popupComponent) {
    setWait(wait);
    if (popupSettings) {
      closePopupSettings();
      return;
    }
    const pointerX = mousePosition.x;
    const pointerY = mousePosition.y;

    const adjustedPosition = adjustPositionWithinScreen(pointerX, pointerY);
    setPosition(adjustedPosition);

    setTimeout(() => {
      if (popupComponent) {
        setPopupComponent(props);
      } else {
        setPopupSettings(props);
      }
    }, 100);
  }

  function adjustPositionWithinScreen(x, y) {
    const popupWidth = 250;
    const popupHeight = 230;
    const margin = 10;
    const cursorOffset = 10; // Small offset from cursor

    let adjustedX = x + cursorOffset;
    let adjustedY = y + cursorOffset;

    // Check horizontal bounds
    if (adjustedX + popupWidth > window.innerWidth - margin) {
      // Position to the left of cursor instead
      adjustedX = x - popupWidth - cursorOffset;

      // If still off screen, clamp to right edge
      if (adjustedX < margin) {
        adjustedX = window.innerWidth - popupWidth - margin;
      }
    }

    // Check vertical bounds
    if (adjustedY + popupHeight > window.innerHeight - margin) {
      // Position above cursor instead
      adjustedY = y - popupHeight - cursorOffset;

      // If still off screen, clamp to bottom edge
      if (adjustedY < margin) {
        adjustedY = window.innerHeight - popupHeight - margin;
      }
    }

    // Final safety checks
    adjustedX = Math.max(
      margin,
      Math.min(adjustedX, window.innerWidth - popupWidth - margin)
    );
    adjustedY = Math.max(
      margin,
      Math.min(adjustedY, window.innerHeight - popupHeight - margin)
    );

    return { x: adjustedX, y: adjustedY };
  }

  globalThis.openPopupSettings = openPopupSettings;

  function closePopupSettings() {
    if (wait) {
      setWait(false);
      return;
    }
    setPopupSettings(false);
    setPopupComponent(false);
    os.unregisterApp("PopupSettings");
  }
  globalThis.closePopupSettings = closePopupSettings;
  useEffect(() => {
    if (popupSettings) {
      const adjustedPosition = adjustPositionWithinScreen(
        position.x,
        position.y
      );
      setPosition(adjustedPosition);
    }
  }, [popupSettings]);

  useLayoutEffect(() => {
    if (popupSettings || popupComponent) {
      runPopUpSettings({
        ...popupSettings,
        sidebarContext: { closePopupSettings, position, popupComponent },
      });
    } else {
      os.unregisterApp("PopupSettings");
    }
  }, [popupSettings, popupComponent]);

  return (
    <MyContext.Provider
      value={{
        userURL,
        packageAddingOptions,
        setPackageAddingOptions,
        customIcon,
        setCustomIcon,
        setUserURL,
        themeColors,
        setThemeColors,
        vars,
        setVars,
        wait,
        setWait,
        sidebarMode,
        setSideBarMode,
        collapsed,
        setCollapsed,
        openPopupSettings,
        sidebarWidth,
        setSidebarWidth,
        openOnMobile,
        setOpenOnMobile,
        closePopupSettings,
        isMobile,
      }}
    >
      {children}
    </MyContext.Provider>
  );
}

export function PopupSettings({ items, type, disabled, sidebarContext }) {
  const [external, setextrnal] = useState(false);
  return (
    <div
      onClick={sidebarContext.closePopupSettings}
      style={{
        position: "fixed",
        left: `${sidebarContext.position.x}px`,
        top: `${sidebarContext.position.y}px`,
        zIndex: "10000",
        pointerEvents: "auto",
      }}
    >
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://api.fontshare.com/v2/css?f[]=satoshi@400&display=swap"
        rel="stylesheet"
      />
      {sidebarContext.popupComponent || (
        <div className={`popupSettings ${disabled ? "disabled" : null}`}>
          {external && <div className=" externalPopupSettings">{external}</div>}
          {null /*<div className="triangle-up"></div>*/}
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
                    if (item.external) setextrnal(item.external);
                  }}
                  className={`itemSettings`}
                  style={{
                    cursor: item?.disabled ? "not-allowed" : "pointer",
                    color: item?.disabled ? "#929292" : "",
                  }}
                >
                  <div>{item.icon}</div>
                  <div>
                    {typeof item.title === "function"
                      ? item.title()
                      : item.title}
                  </div>
                </div>
              );
          })}
          <style>{getStyleOf("sidebar.css")}</style>
        </div>
      )}
    </div>
  );
}

async function runPopUpSettings({ ...props }) {
  await os.unregisterApp("PopupSettings");
  await os.registerApp("PopupSettings");
  os.compileApp("PopupSettings", <PopupSettings {...props} />);
}

export function useSideBarContext() {
  return useContext(MyContext);
}
