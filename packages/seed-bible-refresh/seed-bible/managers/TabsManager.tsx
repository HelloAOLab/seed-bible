const { useMemo, useState } = os.appHooks;

export interface ReaderTab {
  id: string;
  title: string;
}

function createInitialTabs(): ReaderTab[] {
  return [
    { id: "tab-1", title: "Tab 1" },
    { id: "tab-2", title: "Tab 2" },
  ];
}

export function useTabs() {
  const initialTabs = useMemo(() => createInitialTabs(), []);
  const [tabs, setTabs] = useState<ReaderTab[]>(initialTabs);
  const [selectedTabId, setSelectedTabId] = useState<string>(
    initialTabs[0]?.id ?? ""
  );

  const addTab = () => {
    setTabs((currentTabs) => {
      const nextNumber = currentTabs.length + 1;
      const nextTab: ReaderTab = {
        id: `tab-${nextNumber}`,
        title: `Tab ${nextNumber}`,
      };
      setSelectedTabId(nextTab.id);
      return [...currentTabs, nextTab];
    });
  };

  const selectTab = (tabId: string) => {
    setSelectedTabId(tabId);
  };

  return {
    tabs,
    selectedTabId,
    addTab,
    selectTab,
  };
}
