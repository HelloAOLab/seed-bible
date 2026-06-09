import { I18nProvider, useI18n } from "../i18n/I18nManager";
import {} from "../i18n/I18nManager";
import { PaneLayout } from "../components/PaneLayout";
import { BibleSelector } from "../components/BibleSelector";
import { BibleReaderToolbar } from "../components/BibleReaderToolbar";
import { FloatingReaderPanels } from "seed-bible.components.FloatingReaderPanels";
import { Sidebar, SharedSessionsToasts } from "../components/Tabs";
import { createSeedBibleState } from "../managers/SeedBibleStateManager";
import { CasualOSApp } from "../components/CasualOSApp";
import { useEffect } from "preact/hooks";
import type { ReadonlySignal } from "@preact/signals";
import { closeContextMenus } from "../components/ContextMenu";
import { ModalHost } from "../components/ModalHost";
import { useMemo } from "preact/hooks";
import "./main.css";

/**
 * A collection of link/script's providing expected resources from external sources.
 * @returns
 */
export function ExternalResourceDependencies({
  themeCssVariables,
  themeCssClasses,
}: {
  themeCssVariables: ReadonlySignal<string>;
  themeCssClasses: ReadonlySignal<string>;
}) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://api.fontshare.com/v2/css?f[]=satoshi@100,200,300,400,500,600,700,800,900&display=swap"
        rel="stylesheet"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
      />
      <style>{`body {\n${themeCssVariables}\n}`}</style>
      <style>{themeCssClasses}</style>
    </>
  );
}

export function Main() {
  const state = useMemo(() => createSeedBibleState(), []);

  useEffect(() => {
    state.extensions.loadDefaultExtensions();
  });

  const { config } = state;
  const fontSizeClass = `sb-font-size-${config.config.value.fontSize.toLowerCase()}`;

  return (
    <I18nProvider>
      <MainContent state={state} fontSizeClass={fontSizeClass} />
    </I18nProvider>
  );
}

// From https://rnwest.engineer/detect-webkit/
function isWebKit() {
  const ua = navigator.userAgent;
  // As far as I can tell, Chromium-based desktop browsers are the only browsers
  // that pretend to be WebKit-based but aren't.
  return (
    (/AppleWebKit/.test(ua) && !/Chrome/.test(ua)) ||
    /\b(iPad|iPhone|iPod)\b/.test(ua)
  );
}

const isWebKitBrowser = isWebKit();
const webkitClass = isWebKitBrowser ? "is-webkit" : "";

function MainContent(props: {
  state: ReturnType<typeof createSeedBibleState>;
  fontSizeClass: string;
}) {
  const { state, fontSizeClass } = props;
  const { isRtl } = useI18n();
  const appDirection = isRtl ? "rtl" : "ltr";
  const { theme, selector } = state;

  return (
    <>
      <div
        className={`sb-app-root ${fontSizeClass} ${webkitClass}`}
        dir={appDirection}
        onClick={(e) => {
          if (!e.defaultPrevented) {
            closeContextMenus();
          }
        }}
        style={{
          display: "flex",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <ExternalResourceDependencies
          themeCssVariables={theme.themeCssVariables}
          themeCssClasses={theme.themeCssClasses}
        />
        <Sidebar state={state} />

        <main className="sb-main-content">
          <PaneLayout state={state} />
        </main>

        <CasualOSApp id="bible-selector">
          <>
            <ExternalResourceDependencies
              themeCssVariables={theme.themeCssVariables}
              themeCssClasses={theme.themeCssClasses}
            />
            <BibleSelector
              className={`${fontSizeClass} ${webkitClass}`}
              isOpen={selector.isOpen.value}
              onClose={() => selector.setOpen(false)}
              selectorState={selector}
              bibleDataManager={state.bibleData}
            />
          </>
        </CasualOSApp>

        <FloatingReaderPanels state={state} />

        <BibleReaderToolbar state={state} />

        <SharedSessionsToasts state={state} />

        <ModalHost manager={state.modals} />
      </div>
    </>
  );
}
