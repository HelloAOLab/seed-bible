import { signal } from "https://esm.sh/*@preact/signals";
import {
  useBibleReadingState,
  type BibleReadingState,
} from "seed-bible.managers.BibleReadingManager";

export interface ReaderTab {
  id: string;
  title: string;
  readingState: BibleReadingState;
}

function createInitialTabs(): ReaderTab[] {
  return [
    { id: "tab-1", title: "Tab 1", readingState: useBibleReadingState() },
    { id: "tab-2", title: "Tab 2", readingState: useBibleReadingState() },
  ];
}

const initialTabs = createInitialTabs();
const tabs = signal<ReaderTab[]>(initialTabs);
const selectedTabId = signal<string>(initialTabs[0]?.id ?? "");

export function useTabs() {
  const addTab = () => {
    const currentTabs = tabs.value;
    const nextNumber = currentTabs.length + 1;
    const nextTab: ReaderTab = {
      id: `tab-${nextNumber}`,
      title: `Tab ${nextNumber}`,
      readingState: useBibleReadingState(),
    };
    tabs.value = [...currentTabs, nextTab];
    selectedTabId.value = nextTab.id;
  };

  const selectTab = (tabId: string) => {
    selectedTabId.value = tabId;
  };

  return {
    tabs,
    selectedTabId,
    addTab,
    selectTab,
  };
}
