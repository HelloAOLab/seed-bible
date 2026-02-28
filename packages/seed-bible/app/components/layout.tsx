import useBibleData from "app.hooks.bibleData";
import { getStyleOf } from "app.styles.styler";
import { SideBar } from "app.components.sideBar";
const { useEffect, useState, useRef } = os.appHooks;
import { useMouseMove } from "app.hooks.mouseMove";
import { Toolbar } from "app.components.toolbar";
import { ToolbarReal } from "app.components.renderToolbar";
import SettingsSidebar from "app.components.settings";
import {
  TextSettings,
  defaultTextConfig,
  exportTextConfigToCSS,
} from "app.components.textSettings";
// const SearchBar = getBot('system', "introduction.searchBar").SearchBar();
import { useSideBarContext } from "app.hooks.sideBar";
import { useTabsContext } from "app.hooks.tabs";
import { ToolbarSettings } from "app.components.toolbarSettings";
import { SpaceUI } from "app.components.sideBar";
import { ThemeSettings, SettingsUI } from "app.components.themeSettings";
import { AiSettings } from "app.components.aiSettings";
import { TabSettings } from "app.components.tabSettings";
import { CanvasAiSettings } from "app.components.canvasAiSettings";
import { PromtBarSettings } from "app.components.PromtBarSettings";
import { CreateAccountSettings } from "app.components.createAccountSettings";
import { MenuTextSettings } from "app.components.menuTextSettings";
import { Extensions } from "app.components.extensions";
import { useBibleContext } from "app.hooks.bibleVariables";
import { PanelSettingsDialog } from "app.components.screenSettingsOptions";
import { EditorToolbarSettings } from "app.components.editorSettings";
import { NowBar } from "app.components.nowBar";
import { SelectionUISettings } from "app.components.selectionUISettings";

shout("initialize");
globalThis.PanelTabsMap = {}; // { panelId: tabObject }

const Layout = ({ children, panelsNumber }) => {
  // using this to recored the mouse position always
  // u can use the position anywhere if needed (i will need it for tabs dragging)
  // const { spaces, activeSpace } = useTabsContext()
  const { setPosition, showScreenPanelOption, setShowScreenPanelOption } =
    useMouseMove();
  globalThis.SetShowScreenPanelOption = setShowScreenPanelOption;
  const { sidebarMode, setSideBarMode, closePopupSettings, themeColors } =
    useSideBarContext();
  const { canvasMode, setCanvasMode } = useBibleContext();
  const { openOnMobile, setOpenOnMobile } = useSideBarContext();
  globalThis.setOpenOnMobile = setOpenOnMobile;
  const {
    spaces,
    activeSpace,
    setActiveSpace,
    addSpace,
    updateSpace,
    removeSpace,
  } = useTabsContext();
  useEffect(() => {
    const handleContextMenu = (e) => {
      // e.preventDefault();
      // console.log('Global right-click blocked');
    };
    document.addEventListener("contextmenu", handleContextMenu);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);
  return (
    <div
      onMouseMove={(e) => {
        setPosition({ x: e.clientX, y: e.clientY });
      }}
      onContextMenu={(e) => {
        // e.preventDefault()
        // os.log('works')
      }}
      onClick={() => {
        closePopupSettings();
      }}
      onMouseUp={() => {
        try {
          globalThis?.setOpenSidebar(false);
        } catch {}
      }}
      className="layout"
      style={{ background: "white" }}
    >
      <style>{`${
        spaces.find((e) => e.id === activeSpace)?.settings?.text?.root ||
        exportTextConfigToCSS(defaultTextConfig)
      }`}</style>
      {sidebarMode === "default" ? (
        <SideBar panelsNumber={panelsNumber} />
      ) : null}
      <div className={`floatsidebar ${openOnMobile ? "open" : ""}`}>
        {sidebarMode === "settings" ? (
          <SettingsSidebar
            config={
              tags?.settingsConfigs?.presets[
                configBot?.tags?.settingsPreset ||
                  thisBot.tags.settingsPreset ||
                  "full"
              ]
            }
          />
        ) : sidebarMode === "textSettings" ? (
          <TextSettings />
        ) : sidebarMode.includes("toolbarSettings") ? (
          <ToolbarSettings />
        ) : sidebarMode === "promtSettings" ? (
          <PromtBarSettings />
        ) : sidebarMode === "canvasAiSettings" ? (
          <CanvasAiSettings />
        ) : sidebarMode === "themeSettings" ? (
          <SettingsUI />
        ) : sidebarMode === "advancedThemeSettings" ? (
          <ThemeSettings />
        ) : sidebarMode === "aiSettings" ? (
          <AiSettings />
        ) : sidebarMode === "tabSettings" ? (
          <TabSettings />
        ) : sidebarMode === "menuTextSettings" ? (
          <MenuTextSettings />
        ) : sidebarMode === "editorToolbarSettings" ? (
          <EditorToolbarSettings />
        ) : sidebarMode === "extensions" ? (
          <Extensions />
        ) : sidebarMode === "createAccountSettings" ? (
          <CreateAccountSettings />
        ) : sidebarMode === "selectionUISettings" ? (
          <SelectionUISettings />
        ) : null}
      </div>
      {/* handling mobile ui*/ null}
      {(sidebarMode === "default" ||
        sidebarMode === "settings" ||
        sidebarMode === "themeSettings") && <SpaceUI />}

      {globalThis.IsMobileNow() && sidebarMode === "default" && <SpaceUI />}
      {showScreenPanelOption && (
        <PanelSettingsDialog
          openPanelCount={showScreenPanelOption}
          onClose={() => setShowScreenPanelOption(null)}
        />
      )}
      <main
        onClick={() => {
          if (globalThis.IsMobileNow()) setSideBarMode("default");
          setOpenOnMobile(false);
        }}
        className="content"
      >
        {children}
      </main>
      <div>
        <Toolbar />

        <NowBar />
      </div>

      <style>{getStyleOf("main.css")}</style>
    </div>
  );
};

function SwipeOverlay({
  active = true,
  threshold = 20,
  verticalTolerance = 10,
  preventScroll = true,
  edgeStartPx = false,
  onSwipeLeft,
  onSwipeRight,
  showHint = true,
  zIndex = 9999,
  children,
}) {
  const ref = useRef(null);
  const [dragging, setDragging] = useState(false);
  const start = useRef(null);
  const last = useRef(null);
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;

    const onDown = (e) => {
      // On some mobile browsers, stopping default on down helps avoid click-throughs
      if (preventScroll) e.preventDefault();

      // Optional: only start near edges
      if (edgeStartPx && typeof edgeStartPx === "number") {
        const nearLeft = e.clientX <= edgeStartPx;
        const nearRight = e.clientX >= window.innerWidth - edgeStartPx;
        if (!nearLeft && !nearRight) return;
      }

      setDragging(true);

      try {
        el.setPointerCapture?.(e.pointerId);
      } catch {}

      const now = Date.now();
      start.current = { x: e.clientX, y: e.clientY, t: now };
      last.current = { x: e.clientX, y: e.clientY, t: now };
      setDx(0);
      setDy(0);
    };

    const onMove = (e) => {
      if (!dragging || !start.current) return;
      if (preventScroll) e.preventDefault(); // requires touch-action:none on the element
      const s = start.current;
      const ndx = e.clientX - s.x;
      const ndy = e.clientY - s.y;
      setDx(ndx);
      setDy(ndy);
      last.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    };

    const onUp = (e) => {
      if (!dragging || !start.current || !last.current) return;
      setDragging(false);
      try {
        el.releasePointerCapture?.(e.pointerId);
      } catch {}

      const distX = last.current.x - start.current.x;
      const distY = last.current.y - start.current.y;
      const dt = last.current.t - start.current.t;

      if (
        Math.abs(distX) >= threshold &&
        Math.abs(distY) <= verticalTolerance
      ) {
        const ev = {
          direction: distX > 0 ? "right" : "left",
          distanceX: distX,
          distanceY: distY,
          durationMs: dt,
          velocityX: distX / (dt || 1),
          start: start.current,
          end: last.current,
        };
        if (distX > 0 && onSwipeRight) onSwipeRight(ev);
        if (distX < 0 && onSwipeLeft) onSwipeLeft(ev);
      }
      start.current = null;
      last.current = null;
      setDx(0);
      setDy(0);
    };

    // Make pointerdown non-passive so preventDefault can work
    el.addEventListener("pointerdown", onDown, { passive: false });
    el.addEventListener("pointermove", onMove, { passive: false });
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);

    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [
    active,
    threshold,
    verticalTolerance,
    preventScroll,
    edgeStartPx,
    onSwipeLeft,
    onSwipeRight,
  ]);

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        // zIndex: '999999'
      }}
    >
      <div style={{ "pointer-evenets": "none" }}>{children}</div>
    </div>
  );
}

export default Layout;
