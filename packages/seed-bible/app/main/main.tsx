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
import { defaultTheme, darkTheme } from "app.main.themeObjects";

globalThis.AppStartedSuccessfully = false;

//this for defining nav functions globaly
globalThis.Open = () => {};
globalThis.OpenNextChapter = () => {};
globalThis.OpenPrevChapter = () => {};
globalThis.SpaceLayouts = {}; // To store layout per space
globalThis.SpaceScreens = {}; // Already used for screen count
globalThis.CheckToolbarOverflow = () => {};

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

  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

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

/**
 * This a temporary intermediary component to ease the refactor.
 * It is just the main (non-link/script) content which used to be included in the root component.
 */
export const AppContent = () => {
  return (
    <BibleVariablesProvider>
      <TabsProvider>
        <SideBarProvider>
          <Main />
        </SideBarProvider>
      </TabsProvider>
    </BibleVariablesProvider>
  );
};
