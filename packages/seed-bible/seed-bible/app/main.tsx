import { I18nProvider } from "seed-bible.i18n.I18nManager";
import { PaneLayout } from "seed-bible.components.PaneLayout";
import { BibleSelector } from "seed-bible.components.BibleSelector";
import { BibleReaderToolbar } from "seed-bible.components.BibleReaderToolbar";
import { Sidebar, SharedSessionsToasts } from "seed-bible.components.Tabs";
import { createSeedBibleState } from "seed-bible.managers.SeedBibleStateManager";
import { CasualOSApp } from "seed-bible.components.CasualOSApp";
import { useEffect } from "preact/hooks";
import type { ReadonlySignal } from "@preact/signals";
import { closeContextMenus } from "seed-bible.components.ContextMenu";
import { ModalHost } from "seed-bible.components.ModalHost";

const { useMemo } = os.appHooks;

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
      {/* <script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.17/index.global.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/fullcalendar/timegrid@6.1.17/index.global.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/fullcalendar/interaction@6.1.17/index.global.min.js"></script>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.17/main.min.css"
      />
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@6.1.17/main.min.css"
      /> */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
      />
      <style>{`body {\n${themeCssVariables}\n}`}</style>
      <style>{themeCssClasses}</style>
      <style>{tags["main.css"]}</style>
    </>
  );
}

export function Main() {
  const state = useMemo(() => createSeedBibleState(), []);

  useEffect(() => {
    state.extensions.loadDefaultExtensions();
  });

  const { theme, selector, config } = state;
  const fontSizeClass = `sb-font-size-${config.config.value.fontSize.toLowerCase()}`;

  return (
    <I18nProvider>
      <div
        className={`sb-app-root ${fontSizeClass}`}
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
              className={fontSizeClass}
              isOpen={selector.isOpen.value}
              onClose={() => selector.setOpen(false)}
              selectorState={selector}
            />
          </>
        </CasualOSApp>

        <BibleReaderToolbar state={state} />

        <SharedSessionsToasts state={state} />

        <ModalHost manager={state.modals} />
      </div>
    </I18nProvider>
  );
}
