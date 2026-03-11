import { BibleReader } from "seed-bible.components.BibleReader";
import { SettingsPage } from "seed-bible.components.SettingsPage";
import { type BibleReadingState } from "seed-bible.managers.BibleReadingManager";
import { Tabs } from "seed-bible.components.Tabs";
import { I18nProvider } from "seed-bible.i18n.I18nManager";
import { useTabs } from "seed-bible.managers.TabsManager";
import {
  generateThemeCssVariables,
  useTheme,
} from "seed-bible.managers.ThemeManager";
import { computed, useSignal } from "@preact/signals";
import { CasualOSApp } from "seed-bible.components.CasualOSApp";
import { BibleSelector } from "seed-bible.components.BibleSelector";
import {
  useBibleSelector,
  type BibleSelectorState,
} from "seed-bible.managers.BibleSelectorManager";
import { FreeUseBibleAPI } from "seed-bible.managers.FreeUseBibleAPI";

// import { setDebugOptions } from "https://esm.sh/*@preact/signals-debug?external=preact,@preact/signals";

// setDebugOptions({
//   grouped: true,
//   enabled: true,
//   spacing: 2,
// });

const { useMemo } = os.appHooks;

/**
 * A collection of link/script's providing expected resources from external sources.
 * @returns
 */
export function ExternalResourceDependencies() {
  const { currentTheme } = useTheme();
  const theme = currentTheme.variables;
  const themeCssVariables = generateThemeCssVariables(theme);

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

function TabReaderPane({
  isVisible,
  readingState,
  selectorState,
}: {
  isVisible: boolean;
  readingState: BibleReadingState;
  selectorState: BibleSelectorState;
}) {
  return (
    <div style={{ display: isVisible ? "block" : "none", width: "100%" }}>
      <BibleReader {...readingState} selectorState={selectorState} />
    </div>
  );
}

export function Main() {
  const api = useMemo(() => new FreeUseBibleAPI(), []);
  const { tabs, selectedTabId, addTab, selectTab } = useTabs({ api });
  const { currentTheme } = useTheme();
  const theme = currentTheme.variables;
  const isSettingsOpen = useSignal(false);
  const isSidebarCollapsed = useSignal(false);

  const selectorState = useBibleSelector(api);

  const handleSelectTab = (tabId: string) => {
    isSettingsOpen.value = false;
    selectTab(tabId);
  };

  const handleAddTab = () => {
    isSettingsOpen.value = false;
    addTab();
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
        <ExternalResourceDependencies />
        <Tabs
          tabs={tabs.value}
          selectedTabId={selectedTabId.value}
          isSettingsOpen={isSettingsOpen.value}
          isCollapsed={isSidebarCollapsed.value}
          onSelectTab={handleSelectTab}
          onAddTab={handleAddTab}
          onToggleCollapse={() => {
            isSidebarCollapsed.value = !isSidebarCollapsed.value;
          }}
          onOpenSettings={() => {
            isSettingsOpen.value = true;
          }}
        />

        <main style={{ flex: 1, overflow: "auto", scrollbarWidth: "none" }}>
          {isSettingsOpen.value ? (
            <SettingsPage />
          ) : (
            tabs.value.map((tab) => (
              <TabReaderPane
                key={tab.id}
                readingState={tab.readingState}
                selectorState={selectorState}
                isVisible={tab.id === selectedTabId.value}
              />
            ))
          )}
        </main>
      </div>
      <CasualOSApp id="seed-bible-css">
        <ExternalResourceDependencies />
      </CasualOSApp>
      <CasualOSApp id="bible-selector">
        <BibleSelector selectorState={selectorState} />
      </CasualOSApp>
    </I18nProvider>
  );
}
