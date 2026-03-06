import { BibleReader } from "seed-bible.components.BibleReader";
import { type BibleReadingState } from "seed-bible.managers.BibleReadingManager";
import { Tabs } from "seed-bible.components.Tabs";
import { useTabs } from "seed-bible.managers.TabsManager";

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

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
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
