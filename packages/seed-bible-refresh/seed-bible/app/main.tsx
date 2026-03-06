import { BibleReader } from "seed-bible.components.BibleReader";
import { BibleReadingManager } from "seed-bible.managers.BibleReadingManager";
import { Tabs } from "seed-bible.components.Tabs";
import { useTabs } from "seed-bible.managers.TabsManager";

function TabReaderPane({ isVisible }: { isVisible: boolean }) {
  const readingState = BibleReadingManager();

  return (
    <div style={{ display: isVisible ? "block" : "none", width: "100%" }}>
      <BibleReader {...readingState} />
    </div>
  );
}

export function Main() {
  const { tabs, selectedTabId, addTab, selectTab } = useTabs();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Tabs
        tabs={tabs}
        selectedTabId={selectedTabId}
        onSelectTab={selectTab}
        onAddTab={addTab}
      />

      <main style={{ flex: 1 }}>
        {tabs.map((tab) => (
          <TabReaderPane key={tab.id} isVisible={tab.id === selectedTabId} />
        ))}
      </main>
    </div>
  );
}
