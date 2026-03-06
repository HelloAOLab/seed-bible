import type { ReaderTab } from "seed-bible.managers.TabsManager";

interface TabsProps {
  tabs: ReaderTab[];
  selectedTabId: string;
  onSelectTab: (tabId: string) => void;
  onAddTab: () => void;
}

export function Tabs(props: TabsProps) {
  const { tabs, selectedTabId, onSelectTab, onAddTab } = props;

  return (
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
            onClick={() => onSelectTab(tab.id)}
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
        onClick={onAddTab}
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
  );
}
