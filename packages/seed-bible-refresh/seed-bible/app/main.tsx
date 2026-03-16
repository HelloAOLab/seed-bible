import { PaneLayout } from "seed-bible.components.PaneLayout";
import { BibleSelector } from "seed-bible.components.BibleSelector";
import { BibleReaderToolbar } from "seed-bible.components.BibleReaderToolbar";
import { useConfig } from "seed-bible.managers.ConfigManager";
import { SettingsPage } from "seed-bible.components.SettingsPage";
import { FreeUseBibleAPI } from "seed-bible.managers.FreeUseBibleAPI";
import { useBibleSelector } from "seed-bible.managers.BibleSelectorManager";
import { useBibleToolsManager } from "seed-bible.managers.BibleToolsManager";
import { Tabs } from "seed-bible.components.Tabs";
import { I18nProvider, useI18n } from "seed-bible.i18n.I18nManager";
import { usePanes } from "seed-bible.managers.PanesManager";
import { useSidebar } from "seed-bible.managers.SidebarManager";
import { useTabs } from "seed-bible.managers.TabsManager";
import {
  generateThemeCssVariables,
  useTheme,
} from "seed-bible.managers.ThemeManager";
import { setupExtensionContext } from "seed-bible.app.api";
import type { Pane } from "seed-bible.managers.PanesManager";

const { useEffect, useMemo } = os.appHooks;

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
  const bibleApi = useMemo(() => new FreeUseBibleAPI(), []);
  const tabsManager = useTabs(bibleApi);
  const { tabs, selectedTabId, addTab, selectTab } = tabsManager;
  const configManager = useConfig();
  const { config } = configManager;
  const themeManager = useTheme();
  const { currentTheme } = themeManager;
  const sidebarManager = useSidebar();
  const {
    isSettingsOpen,
    isSidebarCollapsed,
    isMobileOpen,
    openSettings,
    closeSettings,
    closeSidebar,
    toggleSidebarCollapsed,
    openSidebar,
  } = sidebarManager;
  const theme = currentTheme.variables;
  const themeCssVariables = generateThemeCssVariables(theme);
  const panesManager = usePanes(tabsManager, selectedTabId.value);
  const selectorState = useBibleSelector(bibleApi, tabsManager, panesManager);
  const {
    panes,
    layout,
    selectedPaneId,
    selectPane,
    setLayout,
    setSelectedPaneTab,
    openInNewPane,
    openInDetachedPane,
    closeDetachedPane,
    movePane,
    resizePane,
  } = panesManager;
  const toolsManager = useBibleToolsManager();
  const i18nManager = useI18n();
  const panelsEnabled = !config.value.disablePanels;
  const selectedTab =
    tabs.value.find((tab) => tab.id === selectedTabId.value) ?? null;
  const effectivePanes: Pane[] = panelsEnabled
    ? panes.value
    : selectedTab
      ? [
          {
            id: "single-pane",
            tab: selectedTab,
            component: null,
            detached: false,
            x: 0,
            y: 0,
            width: 0,
            height: 0,
          },
        ]
      : [];

  useEffect(() => {
    setSelectedPaneTab(selectedTabId.value);
  }, [selectedTabId.value]);

  useEffect(() => {
    setupExtensionContext({
      api: bibleApi,
      panes: panesManager,
      tabs: tabsManager,
      selector: selectorState,
      config: configManager,
      theme: themeManager,
      i18n: i18nManager,
      tools: toolsManager,
    });
  }, [
    bibleApi,
    panesManager,
    tabsManager,
    selectorState,
    configManager,
    themeManager,
    i18nManager,
    toolsManager,
  ]);

  const handleSelectTab = (tabId: string) => {
    closeSettings();
    closeSidebar();
    selectTab(tabId);
  };

  const handleAddTab = () => {
    closeSettings();
    closeSidebar();
    addTab();
  };

  const handleOpenInNewPane = (tabId: string) => {
    closeSettings();
    closeSidebar();
    openInNewPane(tabId);
    selectTab(tabId);
  };

  const handleOpenInDetachedPane = (tabId: string) => {
    closeSettings();
    closeSidebar();
    openInDetachedPane(tabId);
    selectTab(tabId);
  };

  const handleSelectPane = (paneId: string) => {
    closeSettings();
    closeSidebar();
    selectPane(paneId);
    const selectedPane = panes.value.find((pane) => pane.id === paneId) ?? null;
    if (selectedPane?.tab) {
      selectTab(selectedPane.tab.id);
      return;
    }

    if (selectedPane?.component !== null) {
      return;
    }

    selectorState.setOpen(true, selectedPane);
  };

  return (
    <I18nProvider>
      <div
        style={{
          display: "flex",
          height: "100vh",
          background: theme.readerBackground,
          color: theme.fontColor,
          overflow: "hidden",
        }}
      >
        <ExternalResourceDependencies themeCssVariables={themeCssVariables} />
        <Tabs
          tabs={tabs.value}
          selectedTabId={selectedTabId.value}
          paneLayout={panelsEnabled ? layout.value : "single"}
          panelsEnabled={panelsEnabled}
          isSettingsOpen={isSettingsOpen.value}
          isCollapsed={isSidebarCollapsed.value}
          isMobileOpen={isMobileOpen.value}
          onSelectTab={handleSelectTab}
          onSelectPaneLayout={setLayout}
          onOpenInNewPane={handleOpenInNewPane}
          onOpenInDetachedPane={handleOpenInDetachedPane}
          onAddTab={handleAddTab}
          onToggleCollapse={toggleSidebarCollapsed}
          onOpenSettings={openSettings}
          onClose={closeSidebar}
        />

        <main className="sb-main-content">
          {isSettingsOpen.value ? (
            <SettingsPage />
          ) : (
            <PaneLayout
              panes={effectivePanes}
              layout={panelsEnabled ? layout.value : "single"}
              selectedPaneId={
                panelsEnabled
                  ? selectedPaneId.value
                  : (effectivePanes[0]?.id ?? null)
              }
              selectorState={selectorState}
              tabsManager={tabsManager}
              onSelectPane={handleSelectPane}
              onMovePane={movePane}
              onResizePane={resizePane}
              onCloseDetachedPane={closeDetachedPane}
            />
          )}
        </main>

        <BibleSelector
          isOpen={selectorState.isOpen.value}
          onClose={() => selectorState.setOpen(false)}
          selectorState={selectorState}
        />

        {!isSettingsOpen.value && (
          <BibleReaderToolbar
            tabs={tabs.value}
            selectedTabId={selectedTabId.value}
            selectorState={selectorState}
            tabsManager={tabsManager}
            panesManager={panesManager}
            onOpenSidebar={openSidebar}
          />
        )}
      </div>
    </I18nProvider>
  );
}
