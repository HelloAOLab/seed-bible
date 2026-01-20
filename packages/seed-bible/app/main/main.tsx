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

  const defaultTheme = {
    firstToolbarbutton:'#dfdede',
    // Main colors
    primaryColor: "#E07B4C",
    secondaryColor: "#D2691E",
    tertiaryColor: "#CD853F",
    // Container backgrounds
    themeSideMenu: "#FFFFFF",
    panelBackground: "#F8FAFC",
    // Tab
    tabSelection: "#E07B4C",
    activeTabBackground: "#FADDD1",
    activeTabText: "#E07B4C",
    activeTabBorder: "#E07B4C",
    activeTabFill: "#FADDD1",
    simpleTabText: "#333333",
    inactiveTabText: "#333333",
    // Buttons
    primaryButton: "#E07B4C",
    primaryButtonColor: "#FFFFFF",
    primaryButtonBorder: "#E07B4C",
    primaryButtonFill: "#E07B4C",
    secondaryButton: "#D2691E",
    secondaryButtonColor: "#FFFFFF",
    secondaryButtonBorder: "#D2691E",
    secondaryButtonFill: "#D2691E",
    tertiaryButtonColor: "#333333",
    buttonBorder: "#E1E3EA",
    // Scripture text
    bookHeadingColor: "#333333",
    chapterHeadingColor: "#333333",
    verseNumberColor: "#E07B4C",
    verseTextColor: "#333333",
    pageBackground: "#FFFFFF",
    pageTextColor: "#333333",
    // Side menu
    heading1Color: "#333333",
    heading2Color: "#333333",
    heading3Color: "#333333",
    descriptionTextColor: "#666666",
    menuTextColor: "#333333",
    breadcrumbsColor: "#666666",
    sectionBackground: "#E07B4C",
    spaceNameColor: "#333333",
    sideMenuIconsColor: "#333333",
    selectedSpaceColor: "#E07B4C",
    unselectedSpaceColor: "#E1E3EA",
    spaceNameText: "#333333",
    addButtonBackground: "#E07B4C",
    addButtonIcon: "#FFFFFF",
    selectPanelIcon: "#333333",
    openCloseMenuIcon: "#333333",
    moreIcon: "#666666",
    settingsIcon: "#666666",
    inactiveSpaceIndicator: "#E1E3EA",
    activeSpaceIndicator: "#E07B4C",
    profileAvatar: "#E07B4C",
    // Selection UI & toolbar
    toolbarBorder: "#E1E3EA",
    toolbarFill: "#FFFFFF",
    toolbarIconsColor: "#333333",
    selectionUIBorder: "#E1E3EA",
    selectionUIFill: "#FFFFFF",
    selectionIconsColor: "#333333",
    toolbarBackground: "#FFFFFF",
    iconColor: "#333333",
    // Input fields
    inputTitleColor: "#333333",
    inputPlaceholderColor: "#999999",
    inputActiveBorder: "#E07B4C",
    inputActiveFill: "#FFFFFF",
    inputInactiveBorder: "#E1E3EA",
    inputInactiveFill: "#FFFFFF",
    inputBackground: "#FFFFFF",
    inputBorder: "#E1E3EA",
    inputText: "#333333",
    inputPlaceholder: "#999999",
    // Branding
    logoColor: "#333333",
    accentColor: "#E07B4C",
    // Space selection
    spaceSelection: "#E07B4C",
    // Text colors
    text1: "#333333",
    text2: "#666666",
    showTabIcons: true,

    primaryLight: "#FADDD1",
    onPrimaryLight: "#8B4513",
    primaryBase: "#E07B4C",
    onPrimaryBase: "#FFFFFF",
    primaryDark: "#C65D2D",
    onPrimaryDark: "#FFFFFF",
    secondaryLight: "#FFE4C4",
    onSecondaryLight: "#8B4513",
    secondaryBase: "#D2691E",
    onSecondaryBase: "#FFFFFF",
    secondaryDark: "#A0522D",
    onSecondaryDark: "#FFFFFF",
    tertiaryLight: "#FFEFD5",
    onTertiaryLight: "#8B4513",
    tertiaryBase: "#CD853F",
    onTertiaryBase: "#FFFFFF",
    tertiaryDark: "#A0522D",
    onTertiaryDark: "#FFFFFF",
    background: "#FFFFFF",
    onBackground: "#333333",
    surface: "#FAFAFA",
    onSurface: "#333333",
    text3: "#333333",
  };
  const darkTheme = {
    firstToolbarbutton:'#5C5C5C',
    panelBackground: "#2D2D2D",
    themeSideMenu: "#2D2D2D",
    panelBackground: "#1A1A1A",
    primaryButton: "#404040",
    primaryButtonColor: "#FFFFFF",
    secondaryButton: "#5A67D8",
    secondaryButtonColor: "#FFFFFF",
    buttonBorder: "#5A67D8",
    tabSelection: "#5A67D8",
    activeTabBackground: "#404040",
    activeTabText: "#FFFFFF",
    simpleTabText: "#AAAAAA",
    spaceSelection: "#5A67D8",
    toolbarBackground: "#1A1A1A",
    toolbarBorder: "#FFFFFF24",
    text1: "#FFFFFF",
    text2: "#AAAAAA",
    iconColor: "#FFFFFF",
    "filter-mode": "invert(100%)",
    pageBackground: "#121212",
    pageTextColor: "white",
    showTabIcons: true,
    // Side menu specific
    spaceNameText: "#FFFFFF",
    addButtonBackground: "#404040",
    addButtonIcon: "#5A67D8",
    selectPanelIcon: "#FFFFFF",
    openCloseMenuIcon: "#FFFFFF",
    moreIcon: "#FFFFFF",
    settingsIcon: "#AAAAAA",
    inactiveSpaceIndicator: "#666666",
    activeSpaceIndicator: "#5A67D8",
    profileAvatar: "#5A67D8",
    // Scripture text
    bookHeadingColor: "#FFFFFF",
    chapterHeadingColor: "#FFFFFF",
    verseNumberColor: "#5A67D8",
    verseTextColor: "#FFFFFF",

    primaryLight: "#93C5FD",
    onPrimaryLight: "#3B82F6",
    primaryBase: "#60A5FA",
    onPrimaryBase: "#111827",
    primaryDark: "#3B82F6",
    onPrimaryDark: "#FFFFFF",
    secondaryLight: "#C4B5FD",
    onSecondaryLight: "#8B5CF6",
    secondaryBase: "#A78BFA",
    onSecondaryBase: "#111827",
    secondaryDark: "#8B5CF6",
    onSecondaryDark: "#FFFFFF",
    tertiaryLight: "#6EE7B7",
    onTertiaryLight: "#10B981",
    tertiaryBase: "#34D399",
    onTertiaryBase: "#111827",
    tertiaryDark: "#FFFFFF",
    onTertiaryDark: "#10B981",
    background: "#0F172A",
    onBackground: "#FFFFFF",
    surface: "#1E293B",
    onSurface: "#FFFFFF",
    text3: "#F1F5F9",
  };
  const isDark = false;
  // window.matchMedia("(prefers-color-scheme: dark)").matches;

  let theme = isDark ? darkTheme : defaultTheme;

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
