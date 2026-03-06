import { BibleReader } from "seed-bible.components.BibleReader";
import { BibleReadingManager } from "seed-bible.managers.BibleReadingManager";

const { useState } = os.appHooks;

interface ReaderTab {
  id: string;
  title: string;
}

function TabReaderPane({ isVisible }: { isVisible: boolean }) {
  const readingState = BibleReadingManager();

  return (
    <div style={{ display: isVisible ? "block" : "none", width: "100%" }}>
      <BibleReader {...readingState} />
    </div>
  );
}

export function Main() {
  const [tabs, setTabs] = useState<ReaderTab[]>([
    { id: "tab-1", title: "Tab 1" },
    { id: "tab-2", title: "Tab 2" },
  ]);
  const [selectedTabId, setSelectedTabId] = useState<string>(tabs[0].id);

  const addTab = () => {
    const nextNumber = tabs.length + 1;
    const nextTab: ReaderTab = {
      id: `tab-${nextNumber}`,
      title: `Tab ${nextNumber}`,
    };

    setTabs((currentTabs) => [...currentTabs, nextTab]);
    setSelectedTabId(nextTab.id);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: "180px",
          borderRight: "1px solid #ddd",
          padding: "12px 8px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          background: "#f8f8f8",
        }}
      >
        {tabs.map((tab) => {
          const isSelected = tab.id === selectedTabId;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedTabId(tab.id)}
              style={{
                textAlign: "left",
                border: "1px solid #d0d0d0",
                borderRadius: "8px",
                padding: "8px 10px",
                background: isSelected ? "#e7e7e7" : "#fff",
                fontWeight: isSelected ? 700 : 400,
                cursor: "pointer",
              }}
            >
              {tab.title}
            </button>
          );
        })}

        <button
          onClick={addTab}
          style={{
            textAlign: "left",
            border: "1px dashed #c0c0c0",
            borderRadius: "8px",
            padding: "8px 10px",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          + New Tab
        </button>
      </aside>

      <main style={{ flex: 1 }}>
        {tabs.map((tab) => (
          <TabReaderPane key={tab.id} isVisible={tab.id === selectedTabId} />
        ))}
      </main>
    </div>
  );
}
