const { useEffect, useState, useRef, render, useMemo } = os.appHooks;

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
import { MainController } from "app.controller.MainController";
import { calcThemeCSS } from "app.main.cssUtil";
import { globalAPI } from "app.controller.controllerBuilder";

const MainThemeCSS = ({
  themeColorOverride,
  currentSpace,
}: {
  themeColorOverride: Record<string, any>;
  currentSpace: Record<string, any>;
}) => {
  const ThemeCSS = useMemo(
    () => calcThemeCSS(themeColorOverride ?? {}, currentSpace),
    [themeColorOverride, currentSpace]
  );

  useEffect(() => {
    globalAPI.mainThemeCSS = ThemeCSS;
    return () => {
      globalAPI.mainThemeCSS = "";
    };
  }, [ThemeCSS]);

  return <style>{ThemeCSS}</style>;
};

export const MainContent = ({ controller }: { controller: MainController }) => {
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

  useEffect(() => {
    controller.linkViewMethod("addApplication", addApplication);
    controller.linkViewMethod("removeApplication", removeApplication);
    controller.linkViewMethod("removeApplicationById", removeApplicationByID);
    controller.linkViewMethod("replaceApplication", replaceApplication);
    controller.linkViewMethod("updateApplication", updateApplication);

    setStarted(true);
    const handleContextMenu = (e) => {
      e.preventDefault(); // Disable right-click
    };

    window.addEventListener("contextmenu", handleContextMenu);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  useEffect(() => {
    if (!started) return;

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

  useEffect(() => {
    globalAPI.updateCanvasStyleAndGridPortal();
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

    setApps(newApps); // ✅ Update all at once

    setTimeout(() => {
      if (tabs.length === 1 && savedScreens === 1) {
        globalThis.UpdateTab(tabs[0]);
      }
      globalThis.AppStartedSuccessfully = true;
    }, 0);
    globalThis.SpaceScreens[activeSpace] = savedScreens;
  }, [activeSpace]);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () =>
      handleResize(setIsMobile, updateContainerSize, fullScreen, sidebarWidth);
    onResize();
    window?.addEventListener("resize", onResize);
    return () => {
      window?.removeEventListener("resize", onResize);
    };
  }, [collapsed, fullScreen, sidebarWidth]);

  useEffect(() => {
    CheckToolbarOverflow();
  }, [containerProps.leftWidth, containerProps.topHeight]);

  const currentSpace = useMemo(
    () => getActiveSpace(spaces, activeSpace),
    [spaces, activeSpace]
  );
  const themeColorOverride = useMemo(
    () => themeColors?.[activeSpace] ?? {},
    [themeColors, activeSpace]
  );

  return (
    <>
      <MainThemeCSS
        themeColorOverride={themeColorOverride}
        currentSpace={currentSpace}
      />
      <MouseMoveProvider>
        <Layout panelsNumber={containerProps.apps.length}>
          <SplitApp {...containerProps} panalMode={false} />
        </Layout>
      </MouseMoveProvider>
    </>
  );
};

/**
 * Calculates whether or not the window width is of a "mobile" size.
 * @param mobileMaxWidth The maximum width to still be considered as mobile.
 * @param w The window object to reference innerWidth from.
 */
function calculateWindowIsMobile(
  mobileMaxWidth: number,
  w: Window = window
): boolean {
  return w.innerWidth <= mobileMaxWidth;
}

/**
 * We need to figure out what "Container" and "sidebar" are.
 * Nominal refactor needed.
 */
function refactorme_calculateContainerSize(
  isFullScreen: boolean,
  isMobile: boolean,
  sidebarWidth: number
) {
  const width: number =
    innerWidth - (!isFullScreen && !isMobile ? sidebarWidth : 0);
  const height: number = innerHeight * 0.98;
  return { width, height };
}

/**
 * This should probably be changed in the future.
 * Currently it serves to call hooks with their parameters.
 * It's used to centralize a resize effect for the main component.
 */
function callMainHooksOnResize(
  setIsMobileHook: (_: boolean) => any,
  isMobile: boolean,
  updateContainerSizeHook: (w: number, h: number) => any,
  width: number,
  height: number
) {
  setIsMobileHook(isMobile);
  setTimeout(() => updateContainerSizeHook(width, height), 0);
}

/**
 * A process designed to handle resize on main component.
 */
function handleResize(
  setIsMobileHook: (_: boolean) => any,
  updateContainerSizeHook: (w: number, height: number) => any,
  isFullScreen: boolean,
  sidebarWidth: number
) {
  const isMobile = calculateWindowIsMobile(767);
  const { width, height } = refactorme_calculateContainerSize(
    isFullScreen,
    isMobile,
    sidebarWidth
  );
  callMainHooksOnResize(
    setIsMobileHook,
    isMobile,
    updateContainerSizeHook,
    width,
    height
  );
}

function getActiveSpace(
  spaces: Array<{ id: string } & Record<string, any>>,
  activeSpaceId: string
) {
  return spaces?.find((s) => s.id === activeSpaceId) ?? {};
}

globalThis.AppStartedSuccessfully = false;

//this for defining nav functions globaly
globalThis.Open = () => {};
globalThis.OpenNextChapter = () => {};
globalThis.OpenPrevChapter = () => {};
globalThis.SpaceLayouts = {}; // To store layout per space
globalThis.SpaceScreens = {}; // Already used for screen count
globalThis.CheckToolbarOverflow = () => {};
