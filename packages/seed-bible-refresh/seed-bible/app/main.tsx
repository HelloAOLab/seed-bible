import { BibleReader } from "seed-bible.components.BibleReader";
import { type BibleReadingState } from "seed-bible.managers.BibleReadingManager";
import { Tabs } from "seed-bible.components.Tabs";
import { useTabs } from "seed-bible.managers.TabsManager";
import { useTheme } from "seed-bible.managers.ThemeManager";

/**
 * A collection of link/script's providing expected resources from external sources.
 * @returns
 */
export function ExternalResourceDependencies() {
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
    </>
  );
}

function TabReaderPane({
  isVisible,
  readingState,
}: {
  isVisible: boolean;
  readingState: BibleReadingState;
}) {
  return (
    <div style={{ display: isVisible ? "block" : "none", width: "100%" }}>
      <BibleReader {...readingState} />
    </div>
  );
}

export function Main() {
  const { tabs, selectedTabId, addTab, selectTab } = useTabs();
  const { currentTheme } = useTheme();
  const theme = currentTheme.variables;

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: theme.readerBackground,
        color: theme.fontColor,
      }}
    >
      <ExternalResourceDependencies />
      <style>{tags["main.css"]}</style>
      <Tabs
        tabs={tabs.value}
        selectedTabId={selectedTabId.value}
        onSelectTab={selectTab}
        onAddTab={addTab}
      />

      <main style={{ flex: 1 }}>
        {tabs.value.map((tab) => (
          <TabReaderPane
            key={tab.id}
            readingState={tab.readingState}
            isVisible={tab.id === selectedTabId.value}
          />
        ))}
      </main>
    </div>
  );
}
