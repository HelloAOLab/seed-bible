import { PaneLayout } from "seed-bible.components.PaneLayout";
import { BibleSelector } from "seed-bible.components.BibleSelector";
import { BibleReaderToolbar } from "seed-bible.components.BibleReaderToolbar";
import { SettingsPage } from "seed-bible.components.SettingsPage";
import { FreeUseBibleAPI } from "seed-bible.managers.FreeUseBibleAPI";
import { useBibleSelector } from "seed-bible.managers.BibleSelectorManager";
import { Tabs } from "seed-bible.components.Tabs";
import { I18nProvider } from "seed-bible.i18n.I18nManager";
import { usePanes } from "seed-bible.managers.PanesManager";
import { useTabs } from "seed-bible.managers.TabsManager";
import {
  generateThemeCssVariables,
  useTheme,
} from "seed-bible.managers.ThemeManager";
import { useSignal } from "@preact/signals";

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
  const { tabs, selectedTabId, addTab, selectTab } = useTabs(bibleApi);
  const { currentTheme } = useTheme();
  const theme = currentTheme.variables;
  const themeCssVariables = generateThemeCssVariables(theme);
  const isSettingsOpen = useSignal(false);
  const isSidebarCollapsed = useSignal(false);
  const selectorState = useBibleSelector();
  const {
    panes,
    layout,
    selectedPaneId,
    selectPane,
    setLayout,
    setSelectedPaneTab,
    openInNewPane,
  } = usePanes(tabs.value, selectedTabId.value);

  useEffect(() => {
    setSelectedPaneTab(selectedTabId.value);
  }, [selectedTabId.value, setSelectedPaneTab]);

  const handleSelectTab = (tabId: string) => {
    isSettingsOpen.value = false;
    selectTab(tabId);
  };

  const handleAddTab = () => {
    isSettingsOpen.value = false;
    addTab();
  };

  const handleOpenInNewPane = (tabId: string) => {
    isSettingsOpen.value = false;
    openInNewPane(tabId);
    selectTab(tabId);
  };

  const handleSelectPane = (paneId: string) => {
    selectPane(paneId);
    const selectedPane = panes.value.find((pane) => pane.id === paneId) ?? null;
    if (selectedPane?.tab) {
      selectTab(selectedPane.tab.id);
    }
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
          paneLayout={layout.value}
          isSettingsOpen={isSettingsOpen.value}
          isCollapsed={isSidebarCollapsed.value}
          onSelectTab={handleSelectTab}
          onSelectPaneLayout={setLayout}
          onOpenInNewPane={handleOpenInNewPane}
          onAddTab={handleAddTab}
          onToggleCollapse={() => {
            isSidebarCollapsed.value = !isSidebarCollapsed.value;
          }}
          onOpenSettings={() => {
            isSettingsOpen.value = true;
          }}
        />

        <main className="sb-main-content">
          {isSettingsOpen.value ? (
            <SettingsPage />
          ) : (
            <PaneLayout
              panes={panes.value}
              layout={layout.value}
              selectedPaneId={selectedPaneId.value}
              selectorState={selectorState}
              onSelectPane={handleSelectPane}
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
          />
        )}
      </div>
    </I18nProvider>
  );
}
