const {
  createContext,
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
} = os.appHooks;
import { getStyleOf } from "app.styles.styler";
import {
  DualScreenIcon,
  ThreeScreenIcon,
  QuadScreenIcon,
} from "app.components.icons";
import {
  initI18n,
  t as translate,
  changeLanguage as changeLang,
  getCurrentLanguage,
  isRTL,
  availableLanguages,
} from "app.hooks.i18n";
interface SideBarContextType {
  userURL: string;
  packageAddingOptions: any[];
  setPackageAddingOptions: any[];
  customIcon: string;
  setCustomIcon: (icon: string) => void;
  setUserURL: (url: string) => void;
  themeColors: any;
  setThemeColors: (colors: any) => void;
  vars: any;
  setVars: (vars: any) => void;
  wait: boolean;
  setWait: (wait: boolean) => void;
  sidebarMode: string;
  setSideBarMode: (mode: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  openPopupSettings: (
    component: any,
    options?: any,
    modal?: boolean,
    position?: { x: number; y: number }
  ) => void;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  openOnMobile: boolean;
  setOpenOnMobile: (open: boolean) => void;
  closePopupSettings: () => void;
  isMobile: boolean;
  // i18n
  t: (key: string, options?: any) => string;
  language: string;
  langVersion: number;
  changeLanguage: (lng: string) => void;
  i18nReady: boolean;
  availableLanguages: any;
  isRTL: boolean;
}
const MyContext = createContext<SideBarContextType | undefined>(undefined);

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

  // i18n state
  const [language, setLanguage] = useState(getCurrentLanguage());
  const [i18nReady, setI18nReady] = useState(false);
  const [langVersion, setLangVersion] = useState(0);

  // Initialize i18n on mount
  useEffect(() => {
    initI18n().then(() => {
      setLanguage(getCurrentLanguage());
      setI18nReady(true);
    });
  }, []);

  // Change language function
  const changeLanguage = async (lng: string) => {
    await changeLang(lng);
    // Force re-render by updating state AFTER i18next has changed
    setLanguage(lng);
    setLangVersion((v) => v + 1);
  };

  // Translation function - wrapped in useCallback with language dependency for reactivity
  const t = useCallback(
    (key: string, options?: any) => translate(key, options),
    [language]
  );

  // Expose globally
  globalThis.t = t;
  globalThis.changeLanguage = changeLanguage;
  globalThis.availableLanguages = availableLanguages;

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
    const handleMouseMove = (event: any) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  function openPopupSettings(props: any, wait, popupComponent: any, position) {
    setWait(wait);
    if (popupSettings) {
      closePopupSettings();
      return;
    }
    const pointerX = position ? position.x : mousePosition.x;
    const pointerY = position ? position.y : mousePosition.y;

    // Get item count from props to determine if we should adjust position
    const itemCount = props?.items?.length ?? 0;
    const adjustedPosition = adjustPositionWithinScreen(
      pointerX,
      pointerY,
      itemCount
    );
    setPosition(adjustedPosition);

    setTimeout(() => {
      if (popupComponent) {
        setPopupComponent(props);
      } else {
        setPopupSettings(props);
      }
    }, 100);
  }

  function adjustPositionWithinScreen(x: any, y: any, itemCount = 0) {
    const offset = 10;

    // If only 1 item, skip adjustment and just apply offset
    if (itemCount === 1) {
      return { x: x + offset, y: y + offset };
    }

    const popupWidth = 250;
    // Calculate height based on item count (approx 40px per item + padding)
    const popupHeight =
      itemCount > 0 ? Math.min(itemCount * 40 + 20, 230) : 230;
    const margin = 10;

    let adjustedX = x + offset;
    let adjustedY = y + offset;

    // ---- Horizontal Bounds ----
    if (adjustedX + popupWidth > window.innerWidth - margin) {
      adjustedX = window.innerWidth - popupWidth - margin;
    }
    if (adjustedX < margin) adjustedX = margin;

    // ---- Vertical Bounds ----
    // If the popup extends off the bottom, move it upward
    if (adjustedY + popupHeight > window.innerHeight - margin) {
      adjustedY = window.innerHeight - popupHeight - margin;
    }

    // If popup still goes above top, clamp it
    if (adjustedY < margin) adjustedY = margin;

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
      const itemCount = (popupSettings as any)?.items?.length ?? 0;
      const adjustedPosition = adjustPositionWithinScreen(
        position.x,
        position.y,
        itemCount
      );
      setPosition(adjustedPosition);
    }
  }, [popupSettings]);

  useLayoutEffect(() => {
    if (popupSettings || popupComponent) {
      console.log("running pop up setting");
      os.log(themeColors);
      runPopUpSettings({
        ...popupSettings,
        sidebarContext: {
          closePopupSettings,
          position,
          popupComponent,
          themeColors,
        },
      });
    } else {
      os.unregisterApp("PopupSettings");
    }
  }, [popupSettings, popupComponent, globalThis.CurrentColors]);

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
        // i18n
        t,
        language,
        langVersion,
        changeLanguage,
        i18nReady,
        availableLanguages,
        isRTL,
      }}
    >
      {children}
    </MyContext.Provider>
  );
}

export function PopupSettings({ items, type, disabled, sidebarContext }: any) {
  const [external, setextrnal] = useState(false);
  const colors = sidebarContext.themeColors;
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
        <div
          className={`popupSettings  ${disabled ? "disabled" : null}`}
          style={{
            background: colors ? colors[1].primaryColor : "#ffffff",
            border: `1px solid ${colors?.text1 ?? "#1A1A1A"}`,
          }}
        >
          {external && <div className=" externalPopupSettings">{external}</div>}
          {null /*<div className="triangle-up"></div>*/}
          {items.map((item) => {
            if (item.active === false) return;
            const primary = colors ? colors[1]?.pageTextColor : "#1A1A1A";

            if (item?.type === "line")
              return (
                <div
                  style={{
                    width: "90%",
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
                  className={`itemSettings `}
                  style={{
                    cursor: item?.disabled ? "not-allowed" : "pointer",
                    color: item?.disabled ? "#929292" : "",
                    justifyContent:
                      item.toggle !== undefined ? "space-between" : undefined,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = primary + "40")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "")
                  }
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        color: colors ? colors[1].pageTextColor : "#1A1A1A",
                      }}
                    >
                      {item.icon}
                    </div>
                    <div
                      className="font-bold"
                      style={{
                        color: colors ? colors[1].pageTextColor : "#1A1A1A",
                      }}
                    >
                      {typeof item.title === "function"
                        ? item.title()
                        : item.title}
                    </div>
                  </div>
                  {item.toggle !== undefined && (
                    <div
                      style={{
                        width: "36px",
                        height: "20px",
                        borderRadius: "10px",
                        backgroundColor: item.toggle
                          ? "var(--secondaryColor)"
                          : "#555",
                        position: "relative",
                        transition: "background-color 0.2s",
                      }}
                    >
                      <div
                        style={{
                          width: "16px",
                          height: "16px",
                          borderRadius: "50%",
                          backgroundColor: "white",
                          position: "absolute",
                          top: "2px",
                          left: item.toggle ? "18px" : "2px",
                          transition: "left 0.2s",
                        }}
                      />
                    </div>
                  )}
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
  await os.registerApp("PopupSettings", thisBot);
  os.compileApp("PopupSettings", <PopupSettings {...props} />);
}

export function useSideBarContext() {
  return useContext(MyContext);
}
