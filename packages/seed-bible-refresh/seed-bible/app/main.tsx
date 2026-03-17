import { PaneLayout } from "seed-bible.components.PaneLayout";
import { BibleSelector } from "seed-bible.components.BibleSelector";
import { BibleReaderToolbar } from "seed-bible.components.BibleReaderToolbar";
import { SettingsPage } from "seed-bible.components.SettingsPage";
import { Tabs } from "seed-bible.components.Tabs";
import {
  I18nProvider,
  useMainAppState,
} from "seed-bible.managers.MainAppStateManager";

/**
 * A collection of link/script's providing expected resources from external sources.
 * @returns
 */
export function ExternalResourceDependencies({
  themeCssVariables,
}: {
  themeCssVariables: string;
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
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
      />
      <style>{`:root {\n${themeCssVariables}\n}`}</style>
      <style>{tags["main.css"]}</style>
    </>
  );
}

export function Main() {
  const state = useMainAppState();
  const { theme, sidebar, tabs, panes, selector, derived, handlers } = state;

  return (
    <I18nProvider>
      <div
        style={{
          display: "flex",
          height: "100vh",
          background: theme.theme.readerBackground,
          color: theme.theme.fontColor,
          overflow: "hidden",
        }}
      >
        <ExternalResourceDependencies
          themeCssVariables={theme.themeCssVariables}
        />
        <Tabs
          tabs={tabs.tabs.value}
          selectedTabId={tabs.selectedTabId.value}
          paneLayout={derived.panelsEnabled ? panes.layout.value : "single"}
          panelsEnabled={derived.panelsEnabled}
          isSettingsOpen={sidebar.isSettingsOpen.value}
          isCollapsed={sidebar.isSidebarCollapsed.value}
          isMobileOpen={sidebar.isMobileOpen.value}
          onSelectTab={handlers.selectTab}
          onSelectPaneLayout={panes.setLayout}
          onOpenInNewPane={handlers.openInNewPane}
          onOpenInDetachedPane={handlers.openInDetachedPane}
          onAddTab={handlers.addTab}
          onToggleCollapse={sidebar.toggleSidebarCollapsed}
          onOpenSettings={sidebar.openSettings}
          onClose={sidebar.closeSidebar}
        />

        <main className="sb-main-content">
          {sidebar.isSettingsOpen.value ? (
            <SettingsPage />
          ) : (
            <PaneLayout
              panes={derived.effectivePanes}
              layout={derived.panelsEnabled ? panes.layout.value : "single"}
              selectedPaneId={
                derived.panelsEnabled
                  ? panes.selectedPaneId.value
                  : (derived.effectivePanes[0]?.id ?? null)
              }
              selectorState={selector}
              tabsManager={tabs}
              panesManager={panes}
              openSidebar={sidebar.openSidebar}
              onSelectPane={handlers.selectPane}
              onMovePane={panes.movePane}
              onResizePane={panes.resizePane}
              onCloseDetachedPane={panes.closeDetachedPane}
            />
          )}
        </main>

        <BibleSelector
          isOpen={selector.isOpen.value}
          onClose={() => selector.setOpen(false)}
          selectorState={selector}
        />

        {!sidebar.isSettingsOpen.value && (
          <BibleReaderToolbar
            tabs={tabs.tabs.value}
            selectedTabId={tabs.selectedTabId.value}
            selectorState={selector}
            tabsManager={tabs}
            panesManager={panes}
            onOpenSidebar={sidebar.openSidebar}
          />
        )}
      </div>
    </I18nProvider>
  );
}
