await os.unregisterApp("main");
os.registerApp("main", thisBot);
const { useEffect, useState, useRef, render, useMemo } = os.appHooks;

import { BibleVariablesProvider } from "app.hooks.bibleVariables";
import { TabsProvider } from "app.hooks.tabs";
import { SideBarProvider } from "app.hooks.sideBar";
import { MouseMoveProvider } from "app.hooks.mouseMove";
import Layout from "app.components.layout";
import { SplitApp, useDivSpliter } from "app.hooks.divSpliter";
import {
  ThePage,
  ThePageWithPanel,
  ThePageWithEditor,
} from "app.components.thePage";
import { useBibleContext } from "app.hooks.bibleVariables";
import { useTabsContext } from "app.hooks.tabs";
import { useSideBarContext } from "app.hooks.sideBar";
import { PackageManager } from "app.packager.main";
import { DragDropOverlay } from "app.main.dragOverlay";
import { READY_THEMES } from "app.components.themeSettings";
globalThis.AppStartedSuccessfully = false;

//this for defining nav functions globaly
globalThis.Open = () => {};
globalThis.OpenNextChapter = () => {};
globalThis.OpenPrevChapter = () => {};
globalThis.SpaceLayouts = {}; // To store layout per space
globalThis.SpaceScreens = {}; // Already used for screen count
globalThis.CheckToolbarOverflow = () => {};

const TestingApp = ({ myProp }) => {
  const divRef = useRef(null);
  const [css, setCss] = useState();
  // console.log(myProp, 'myProp')
  function runTest() {
    //     globalThis?.SetCanvasPosition?.(`
    //                  #app-game-container, .main-content {
    //     position:absolute !important;
    //     left:0 !important;
    //     top:0 !important;
    //     width:600px !important;
    //     height:600px !important;
    //     z-index:999999;
    //  }
    //             `)
    if (divRef.current) {
      // const rect = divRef.current.getBoundingClientRect();
      // console.log("Left:", rect.left);
      // console.log("Top:", rect.top);
      // console.log("Width:", rect.width);
      // console.log("Height:", rect.height);
      // console.log(rect, 'rect')
      // configBot.tags.gridPortal = 'test'
      // globalThis.SetCanvasPositions({ left: rect.left, top: rect.top, width: rect.width, height: rect.height, })
      // globalThis.setHW({ width: `${rect.width}px !important`, height: `${rect.height}px !important` })
      // globalThis.setTL({ left: `${rect.left}px !important`, top: `${rect.top}px !important` })
    }
  }

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <style></style>
      <div
        ref={divRef}
        id="#mainCanvas"
        class="mainCanvas"
        onClick={runTest}
        style={{
          width: "100%",
          height: "100%",
          border: "1px solid black",
          overflow: "auto",
        }}
      ></div>
    </div>
  );
};
const Main = () => {
  if (configBot.tags.extensions) return <PackageManager />;
  const { screens, fullScreen, setFullScreen } = useBibleContext();
  const { collapsed, sidebarWidth, setSidebarWidth, themeColors } =
    useSideBarContext();
  const { tabs, activeSpace, getAllTabsInSpace, spaces } = useTabsContext();
  const [started, setStarted] = useState(false);

  const {
    containerProps,
    updateContainerSize,
    updateApplication,
    removeApplicationByID,
    replaceApplication,
    addApplication,
    resetApps,
    removeApplication,
    setApps,
  } = useDivSpliter({
    components: [
      {
        id: `panel-${0}-${activeSpace}`,
        App: (
          <ThePageWithEditor
            panelId={`panel-${0}-${activeSpace}`}
            tab={tabs[0]}
          />
        ),
        to: "panel",
      },
      // { id: `panel-${1}-${activeSpace}`, App: <TestingApp panelId={`panel-${1}-${activeSpace}`} />, to: 'panel' },
    ],
    split: true,
    containerWidth: 1150,
    containerHeight: 920,
    minSize: 100,
  });

  globalThis.AddApplication = addApplication;
  globalThis.RemoveApplication = removeApplication;
  globalThis.RemoveApplicationByID = removeApplicationByID;
  globalThis.ReplaceApplication = replaceApplication;
  globalThis.UpdateApplication = updateApplication;
  useEffect(() => {
    setStarted(true);
  }, []);
  useEffect(() => {
    // Load styles

    // Load scripts sequentially
    const scripts = [
      "https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.17/index.global.min.js",
      "https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@6.1.17/index.global.min.js",
      "https://cdn.jsdelivr.net/npm/@fullcalendar/timegrid@6.1.17/index.global.min.js",
      "https://cdn.jsdelivr.net/npm/@fullcalendar/interaction@6.1.17/index.global.min.js",
      "https://cdn.jsdelivr.net/npm/@fullcalendar/resource-timegrid@6.1.17/index.global.min.js",
      "https://cdn.jsdelivr.net/npm/@fullcalendar/icalendar@6.1.17/index.global.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/ical.js/1.4.0/ical.min.js",
      "https://cdn.jsdelivr.net/npm/fullcalendar-scheduler@6.1.18/index.global.min.js",
      "https://cdn.jsdelivr.net/npm/flatpickr",
    ];

    function loadScriptsSequentially(index = 0, callback) {
      if (index >= scripts.length) return callback();

      const script = document.createElement("script");
      script.src = scripts[index];
      script.onload = () => loadScriptsSequentially(index + 1, callback);
      script.onerror = () => console.error("Failed to load", scripts[index]);
      document.body.appendChild(script);
    }

    loadScriptsSequentially(0, () => {
      console.log("FullCalendar scripts loaded");
    });
  }, []);
  useEffect(() => {
    if (!started) return;

    // setApps(newApps); // ✅ Update all at once

    setApps((prevApps) => {
      const newApps = [];

      for (let i = 0; i < screens.value; i++) {
        const id = `panel-${i}-${activeSpace}`;
        if (prevApps[i]) {
          newApps.push({
            ...prevApps[i],
            id,
          });
        } else {
          newApps.push({
            id,
            App: (
              <ThePageWithEditor
                key={id}
                panelId={id}
                tab={globalThis.PanelTabsMap[id]}
              />
            ),
            to: "window",
            tabData: globalThis.PanelTabsMap[id],
          });
        }
      }

      return [...newApps];
    });

    globalThis.SpaceScreens[activeSpace] = screens.value;
  }, [screens]);
  globalThis.LocateCanvas = () => {
    const nodes = document.querySelectorAll(".mainCanvas");
    const el = nodes[nodes.length - 1]; // last match
    if (!el) {
      configBot.tags.gridPortal = null;
      configBot.tags.mapPortal = null;
      return;
    }

    // Viewport-relative bounds:
    const { left, top, width, height } = el.getBoundingClientRect();

    // Get border radius from computed style
    const style = window.getComputedStyle(el);
    const borderRadius = style.borderRadius;
    // or if you need individual corners:
    const borderTopLeft = style.borderTopLeftRadius;
    const borderTopRight = style.borderTopRightRadius;
    const borderBottomLeft = style.borderBottomLeftRadius;
    const borderBottomRight = style.borderBottomRightRadius;

    configBot.tags.gridPortal = globalThis?.defaultPortalName || "thePortal";
    globalThis.SetCanvasPositions({
      // ...style,
      left,
      top,
      width,
      height,
      borderRadius, // shorthand
    });
  };

  useEffect(() => {
    globalThis.LocateCanvas();
  }, [
    screens,
    containerProps.apps,
    containerProps.leftWidth,
    containerProps.topHeight,
  ]);

  useEffect(() => {
    if (!started) return;

    const savedScreens = globalThis.SpaceScreens[activeSpace] || 1;
    const newApps = [];

    for (let i = 0; i < savedScreens; i++) {
      const id = `panel-${i}-${activeSpace}`;
      newApps.push({
        id,
        App: (
          <ThePageWithEditor
            key={id}
            panelId={id}
            tab={globalThis.PanelTabsMap[id]}
          />
        ),
        to: "window",
        tabData: globalThis.PanelTabsMap[id],
      });
    }
    // console.log(newApps)
    setApps(newApps); // ✅ Update all at once
    setTimeout(() => {
      if (tabs.length === 1 && savedScreens === 1) {
        // globalThis.UpdateTab(tabs[0]);
        globalThis.UpdateTab(tabs[0]);
      }
      globalThis.AppStartedSuccessfully = true;
    }, 0);
    globalThis.SpaceScreens[activeSpace] = savedScreens;
  }, [activeSpace]);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  // const resize = () => {
  // }
  function handleResize() {
    setIsMobile(window.innerWidth < 768);
    const mob = window.innerWidth < 768;
    setTimeout(() => {
      updateContainerSize(
        globalThis.window?.innerWidth - (!fullScreen && !mob && sidebarWidth),
        globalThis.window?.innerHeight * 0.98
      );
    }, 0);
  }
  useEffect(() => {
    handleResize();
    globalThis.window?.addEventListener("resize", handleResize);
    return () => {
      globalThis.window?.removeEventListener("resize", handleResize);
    };
  }, [collapsed, fullScreen, sidebarWidth]);
  // useEffect(() => {
  //     const interval = setInterval(() => {
  //         resize()
  //     }, 100);
  //     return () => clearInterval(interval);
  // }, [collapsed]);
  useEffect(() => {
    // os.log(themeColors, 'theme colors')
  }, [themeColors]);
  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault(); // Disable right-click
    };

    window.addEventListener("contextmenu", handleContextMenu);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);
  const lenght = Object.keys(themeColors || {}).length;
  useEffect(() => {
    CheckToolbarOverflow();
    // os.log('resize', CheckToolbarOverflow)
  }, [containerProps.leftWidth, containerProps.topHeight]);
  // const buildThemeCSS = (themeColors, activeSpace, defaultTheme) => {
  //   const colors = {
  //     ...defaultTheme, // start with defaults
  //     ...(themeColors?.[activeSpace] || {}), // overwrite with current themeColors
  //   };

  //   const vars = Object.entries(colors).map(
  //     ([key, value]) => `--${key}: ${value};`
  //   );

  //   return `:root {\n  ${vars.join("\n  ")}\n}`;
  // };
  const LigonierTheme = {
    firstToolbarbutton: "#dfdede",
    "filter-mode": "invert(0)",
    "secondary-filter-mode": "invert(100%)",
    // Main colors
    primaryColor: "#FFFFFF",
    secondaryColor: "#2563EB",
    tertiaryColor: "#DBEAFE",
    // Container backgrounds
    themeSideMenu: "#F9FAFB",
    panelBackground: "#F3F4F6",
    // Tab
    tabSelection: "#2563EB",
    activeTabBackground: "#DBEAFE",
    activeTabText: "#1E3A8A",
    activeTabBorder: "#2563EB",
    activeTabFill: "#2563EB94",
    simpleTabText: "#6B7280",
    inactiveTabText: "#6B7280",
    // Buttons
    primaryButton: "#2563EB",
    primaryButtonColor: "#FFFFFF",
    primaryButtonBorder: "#2563EB",
    primaryButtonFill: "#2563EB",
    secondaryButton: "#3B82F6",
    secondaryButtonColor: "#FFFFFF",
    secondaryButtonBorder: "#3B82F6",
    secondaryButtonFill: "#3B82F6",
    tertiaryButtonColor: "#1E3A8A",
    buttonBorder: "#BFDBFE",
    // Scripture text
    bookHeadingColor: "#1E3A8A",
    chapterHeadingColor: "#1E3A8A",
    verseNumberColor: "#2563EB",
    verseTextColor: "#1F2937",
    pageBackground: "#FFFFFF",
    pageTextColor: "#1F2937",
    // Side menu
    heading1Color: "#1E3A8A",
    heading2Color: "#1E3A8A",
    heading3Color: "#1E40AF",
    descriptionTextColor: "#6B7280",
    menuTextColor: "#1E3A8A",
    breadcrumbsColor: "#6B7280",
    sectionBackground: "#2563EB",
    spaceNameColor: "#1F2937",
    sideMenuIconsColor: "#374151",
    selectedSpaceColor: "#2563EB",
    unselectedSpaceColor: "#BFDBFE",
    spaceNameText: "#1F2937",
    addButtonBackground: "#2563EB",
    addButtonIcon: "#FFFFFF",
    selectPanelIcon: "#374151",
    openCloseMenuIcon: "#374151",
    moreIcon: "#6B7280",
    settingsIcon: "#6B7280",
    inactiveSpaceIndicator: "#D1D5DB",
    activeSpaceIndicator: "#2563EB",
    profileAvatar: "#F59E0B",
    // Selection UI & toolbar
    toolbarBorder: "#E5E7EB",
    toolbarFill: "#FFFFFF",
    toolbarIconsColor: "#374151",
    selectionUIBorder: "#E5E7EB",
    selectionUIFill: "#FFFFFF",
    selectionIconsColor: "#374151",
    toolbarBackground: "#FFFFFF",
    iconColor: "#374151",
    // Input fields
    inputTitleColor: "#1F2937",
    inputPlaceholderColor: "#9CA3AF",
    inputActiveBorder: "#2563EB",
    inputActiveFill: "#FFFFFF",
    inputInactiveBorder: "#D1D5DB",
    inputInactiveFill: "#FFFFFF",
    inputBackground: "#FFFFFF",
    inputBorder: "#D1D5DB",
    inputText: "#1F2937",
    inputPlaceholder: "#9CA3AF",
    // Branding
    logoColor: "#1E3A8A",
    accentColor: "#2563EB",
    // Space selection
    spaceSelection: "#DBEAFE",
    // Text colors
    text1: "#1F2937",
    text2: "#6B7280",
    showTabIcons: true,
    // Semantic colors
    primaryLight: "#DBEAFE",
    onPrimaryLight: "#1E40AF",
    primaryBase: "#2563EB",
    onPrimaryBase: "#FFFFFF",
    primaryDark: "#1E40AF",
    onPrimaryDark: "#FFFFFF",
    secondaryLight: "#EFF6FF",
    onSecondaryLight: "#1D4ED8",
    secondaryBase: "#3B82F6",
    onSecondaryBase: "#FFFFFF",
    secondaryDark: "#1D4ED8",
    onSecondaryDark: "#FFFFFF",
    tertiaryLight: "#BFDBFE",
    onTertiaryLight: "#1E3A8A",
    tertiaryBase: "#60A5FA",
    onTertiaryBase: "#1E3A8A",
    tertiaryDark: "#3B82F6",
    onTertiaryDark: "#FFFFFF",
    background: "#FFFFFF",
    onBackground: "#1F2937",
    surface: "#F9FAFB",
    onSurface: "#1F2937",
    text3: "#374151",
  };
  const defaultTheme = READY_THEMES[0]?.colors;
  const darkTheme = READY_THEMES[1]?.colors;
  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  let theme =
    configBot.tags?.theme === "ligonier"
      ? LigonierTheme
      : isDark
        ? darkTheme
        : defaultTheme;

  const ThemeCSS = useMemo(() => {
    const colors = {
      ...theme, // start with defaults
      ...(themeColors?.[activeSpace] || {}), // overwrite with current themeColors
    };

    const vars = Object.entries(colors).map(
      ([key, value]) => `--${key}: ${value};`
    );

    // Get current space settings for fonts
    const currentSpace = spaces?.find((s) => s.id === activeSpace);
    const scriptureSettings = currentSpace?.scriptureSettings || {};
    const sideMenuSettings = currentSpace?.sideMenuSettings || {};
    const inputFieldsSettings = currentSpace?.inputFieldsSettings || {};

    // Helper to generate CSS variables from settings
    const generateFontVars = (
      settings: Record<string, unknown>,
      prefix: string,
      keyMap: Record<string, string>
    ) =>
      Object.entries(keyMap)
        .filter(([key]) => settings[key])
        .map(([key, cssName]) => {
          const value = settings[key];
          const isFont = key.toLowerCase().includes("font");
          return isFont
            ? `--${prefix}-${cssName}: '${value}', sans-serif;`
            : `--${prefix}-${cssName}: ${value}px;`;
        });

    const fontVars = [
      ...generateFontVars(scriptureSettings, "scripture", {
        bookHeadingFont: "bookHeading-font",
        bookHeadingSize: "bookHeading-size",
        chapterHeadingFont: "chapterHeading-font",
        chapterHeadingSize: "chapterHeading-size",
        verseTextFont: "verseText-font",
        verseTextSize: "verseText-size",
        verseNumberFont: "verseNumber-font",
        verseNumberSize: "verseNumber-size",
      }),
      ...generateFontVars(sideMenuSettings, "sideMenu", {
        spaceNameFont: "spaceName-font",
        spaceNameSize: "spaceName-size",
        menuTextFont: "menuText-font",
        menuTextSize: "menuText-size",
        heading1Font: "heading1-font",
        heading1Size: "heading1-size",
        heading2Font: "heading2-font",
        heading2Size: "heading2-size",
        heading3Font: "heading3-font",
        heading3Size: "heading3-size",
        descriptionTextFont: "description-font",
        descriptionTextSize: "description-size",
        breadcrumbsFont: "breadcrumbs-font",
        breadcrumbsSize: "breadcrumbs-size",
        iconsSize: "icons-size",
      }),
      ...generateFontVars(inputFieldsSettings, "input", {
        titleFont: "title-font",
        titleSize: "title-size",
        placeholderFont: "placeholder-font",
        placeholderSize: "placeholder-size",
      }),
    ];

    const allVars = [...vars, ...fontVars];
    // os.log(allVars, "all theme vars");
    return `:root {\n  ${allVars.join("\n  ")}\n}`;
  }, [themeColors, activeSpace, spaces]);

  useEffect(() => {
    globalThis.ThemeCSS = ThemeCSS;
    return () => {
      globalThis.ThemeCSS = null;
    };
  }, [ThemeCSS]);

  return (
    <MouseMoveProvider>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
      />
      <style>{ThemeCSS}</style>
      <DragDropOverlay />
      <Layout panelsNumber={containerProps.apps.length}>
        <SplitApp {...containerProps} panalMode={false} />
      </Layout>
    </MouseMoveProvider>
  );
};

const Root = () => {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://api.fontshare.com/v2/css?f[]=satoshi@100,200,300,400,500,600,700,800,900&display=swap"
        rel="stylesheet"
      />
      <script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.17/index.global.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/fullcalendar/timegrid@6.1.17/index.global.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/fullcalendar/interaction@6.1.17/index.global.min.js"></script>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.17/main.min.css"
      />
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@6.1.17/main.min.css"
      />
      <BibleVariablesProvider>
        <TabsProvider>
          <SideBarProvider>
            <Main />
          </SideBarProvider>
        </TabsProvider>
      </BibleVariablesProvider>
    </>
  );
};
if (configBot.tags.systemPortal) return;
configBot.tags.gridPortal = null;
render(<Root />, document.body);
document.body.style.overscrollBehaviorX = "none";

// os.compileApp('main', <Root />)
