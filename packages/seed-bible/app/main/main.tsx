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
        // console.log('testing update now working', tabs[0])
        globalThis.UpdateTab(tabs[0]);
      }
      globalThis.AppStartedSuccessfully = true;
    }, 10);
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
    // Background colors (Background #F8FAFC, Surface #FFFFFF)
    menuBackground: "#F8FAFC",
    themeSideMenu: "#F8FAFC",
    panelBackground: "#FFFFFF",
    pageBackground: "#FFFFFF",
    toolbarBackground: "#FFFFFF",
    toolbarBorder: "#E2E8F0",
    // Primary colors (Primary #3B82F6, Primary Dark #2563EB, Secondary #8B5CF6)
    primaryButton: "#3B82F6",
    primaryButtonColor: "#FFFFFF",
    secondaryButton: "#8B5CF6",
    secondaryButtonColor: "#FFFFFF",
    buttonBorder: "#E2E8F0",
    // Tab & Selection
    tabSelection: "#3B82F6",
    activeTabBackground: "#FFFFFF",
    activeTabText: "#0F172A",
    simpleTabText: "#64748B",
    spaceSelection: "#3B82F6",
    // Text colors (Text Primary #0F172A, Text Secondary #64748B)
    pageTextColor: "#0F172A",
    text1: "#0F172A",
    text2: "#64748B",
    iconColor: "#0F172A",
    "filter-mode": " none",
    showTabIcons: true,
    // Side menu specific
    spaceNameText: "#0F172A",
    addButtonBackground: "#3B82F6",
    addButtonIcon: "#FFFFFF",
    selectPanelIcon: "#0F172A",
    openCloseMenuIcon: "#0F172A",
    moreIcon: "#64748B",
    settingsIcon: "#64748B",
    inactiveSpaceIndicator: "#E2E8F0",
    activeSpaceIndicator: "#3B82F6",
    profileAvatar: "#8B5CF6",
    // Scripture text (Accent/Tertiary #06B6D4 for verse numbers)
    bookHeadingColor: "#0F172A",
    chapterHeadingColor: "#0F172A",
    verseNumberColor: "#06B6D4",
    verseTextColor: "#0F172A",

    primaryLight: "#dbeafe",
    onPrimaryLight: "#233C85",
    primaryBase: "#2563EB",
    onPrimaryBase: "#FFFFFF",
    primaryDark: "#1E40AF",
    onPrimaryDark: "#FFFFFF",
    secondaryLight: "#EDE9FE",
    onSecondaryLight: "#6D28D9",
    secondaryBase: "#7C3AED",
    onSecondaryBase: "#FFFFFF",
    secondaryDark: "#6D28D9",
    onSecondaryDark: "#FFFFFF",
    tertiaryLight: "#D1FAE5",
    onTertiaryLight: "#233C85",
    tertiaryBase: "#059669",
    onTertiaryBase: "#FFFFFF",
    tertiaryDark: "#047857",
    onTertiaryDark: "#FFFFFF",
    background: "#FFFFFF",
    onBackground: "#233C85",
    surface: "#F9FAFB",
    onSurface: "#000000",
    text3: "#111827",
  };
  const darkTheme = {
    menuBackground: "#2D2D2D",
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

    // Scripture text font CSS variables
    const fontVars = [];
    if (scriptureSettings.bookHeadingFont) {
      fontVars.push(
        `--scripture-bookHeading-font: '${scriptureSettings.bookHeadingFont}', sans-serif`
      );
    }
    if (scriptureSettings.bookHeadingSize) {
      fontVars.push(
        `--scripture-bookHeading-size: ${scriptureSettings.bookHeadingSize}px`
      );
    }
    if (scriptureSettings.chapterHeadingFont) {
      fontVars.push(
        `--scripture-chapterHeading-font: '${scriptureSettings.chapterHeadingFont}', sans-serif`
      );
    }
    if (scriptureSettings.chapterHeadingSize) {
      fontVars.push(
        `--scripture-chapterHeading-size: ${scriptureSettings.chapterHeadingSize}px`
      );
    }
    if (scriptureSettings.verseTextFont) {
      fontVars.push(
        `--scripture-verseText-font: '${scriptureSettings.verseTextFont}', sans-serif`
      );
    }
    if (scriptureSettings.verseTextSize) {
      fontVars.push(
        `--scripture-verseText-size: ${scriptureSettings.verseTextSize}px`
      );
    }
    if (scriptureSettings.verseNumberFont) {
      fontVars.push(
        `--scripture-verseNumber-font: '${scriptureSettings.verseNumberFont}', sans-serif`
      );
    }
    if (scriptureSettings.verseNumberSize) {
      fontVars.push(
        `--scripture-verseNumber-size: ${scriptureSettings.verseNumberSize}px`
      );
    }

    // Side menu font CSS variables
    if (sideMenuSettings.spaceNameFont) {
      fontVars.push(
        `--sideMenu-spaceName-font: '${sideMenuSettings.spaceNameFont}', sans-serif`
      );
    }
    if (sideMenuSettings.spaceNameSize) {
      fontVars.push(
        `--sideMenu-spaceName-size: ${sideMenuSettings.spaceNameSize}px`
      );
    }
    if (sideMenuSettings.menuTextFont) {
      fontVars.push(
        `--sideMenu-menuText-font: '${sideMenuSettings.menuTextFont}', sans-serif`
      );
    }
    if (sideMenuSettings.menuTextSize) {
      fontVars.push(
        `--sideMenu-menuText-size: ${sideMenuSettings.menuTextSize}px`
      );
    }
    if (sideMenuSettings.heading1Font) {
      fontVars.push(
        `--sideMenu-heading1-font: '${sideMenuSettings.heading1Font}', sans-serif`
      );
    }
    if (sideMenuSettings.heading1Size) {
      fontVars.push(
        `--sideMenu-heading1-size: ${sideMenuSettings.heading1Size}px`
      );
    }
    if (sideMenuSettings.heading2Font) {
      fontVars.push(
        `--sideMenu-heading2-font: '${sideMenuSettings.heading2Font}', sans-serif`
      );
    }
    if (sideMenuSettings.heading2Size) {
      fontVars.push(
        `--sideMenu-heading2-size: ${sideMenuSettings.heading2Size}px`
      );
    }
    if (sideMenuSettings.heading3Font) {
      fontVars.push(
        `--sideMenu-heading3-font: '${sideMenuSettings.heading3Font}', sans-serif`
      );
    }
    if (sideMenuSettings.heading3Size) {
      fontVars.push(
        `--sideMenu-heading3-size: ${sideMenuSettings.heading3Size}px`
      );
    }
    if (sideMenuSettings.descriptionTextFont) {
      fontVars.push(
        `--sideMenu-description-font: '${sideMenuSettings.descriptionTextFont}', sans-serif`
      );
    }
    if (sideMenuSettings.descriptionTextSize) {
      fontVars.push(
        `--sideMenu-description-size: ${sideMenuSettings.descriptionTextSize}px`
      );
    }
    if (sideMenuSettings.breadcrumbsFont) {
      fontVars.push(
        `--sideMenu-breadcrumbs-font: '${sideMenuSettings.breadcrumbsFont}', sans-serif`
      );
    }
    if (sideMenuSettings.breadcrumbsSize) {
      fontVars.push(
        `--sideMenu-breadcrumbs-size: ${sideMenuSettings.breadcrumbsSize}px`
      );
    }
    if (sideMenuSettings.iconsSize) {
      fontVars.push(`--sideMenu-icons-size: ${sideMenuSettings.iconsSize}px`);
    }

    // Input fields font CSS variables
    if (inputFieldsSettings.titleFont) {
      fontVars.push(
        `--input-title-font: '${inputFieldsSettings.titleFont}', sans-serif`
      );
    }
    if (inputFieldsSettings.titleSize) {
      fontVars.push(`--input-title-size: ${inputFieldsSettings.titleSize}px`);
    }
    if (inputFieldsSettings.placeholderFont) {
      fontVars.push(
        `--input-placeholder-font: '${inputFieldsSettings.placeholderFont}', sans-serif`
      );
    }
    if (inputFieldsSettings.placeholderSize) {
      fontVars.push(
        `--input-placeholder-size: ${inputFieldsSettings.placeholderSize}px`
      );
    }

    const allVars = [...vars, ...fontVars.map((v) => v + ";")];
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
      <Layout>
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
        href="https://api.fontshare.com/v2/css?f[]=satoshi@400&display=swap"
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
