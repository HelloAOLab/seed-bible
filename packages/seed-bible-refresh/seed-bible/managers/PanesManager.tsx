import { signal } from "@preact/signals";
import type { ReaderTab } from "seed-bible.managers.TabsManager";

export interface Pane {
  id: string;
  tab: ReaderTab;
  size: number;
}

function createPanes(nextTabs: ReaderTab[]): Pane[] {
  if (nextTabs.length <= 0) {
    return [];
  }

  const size = 1 / nextTabs.length;
  return nextTabs.map((tab) => ({
    id: `pane-${tab.id}`,
    tab,
    size,
  }));
}

const panes = signal<Pane[]>([]);
let isInitialized = false;

function syncPaneState(nextTabs: ReaderTab[]) {
  panes.value = createPanes(nextTabs);
}

export function usePanes(tabs: ReaderTab[], selectedTabId: string) {
  if (!isInitialized) {
    const initialTab = tabs.find((tab) => tab.id === selectedTabId) ?? null;
    panes.value = initialTab ? createPanes([initialTab]) : [];
    isInitialized = true;
  }

  const tabMap = new Map(tabs.map((tab) => [tab.id, tab]));
  const nextPaneTabs = panes.value
    .map((pane) => tabMap.get(pane.tab.id) ?? null)
    .filter((tab) => tab !== null);

  if (
    nextPaneTabs.length !== panes.value.length ||
    nextPaneTabs.some((tab, index) => panes.value[index]?.tab !== tab)
  ) {
    syncPaneState(nextPaneTabs);
  }

  const ensurePaneVisible = (tabId: string) => {
    if (!tabId || panes.value.some((pane) => pane.tab.id === tabId)) {
      return;
    }

    const nextTab = tabMap.get(tabId);
    if (!nextTab) {
      return;
    }

    syncPaneState([...panes.value.map((pane) => pane.tab), nextTab]);
  };

  const togglePane = (tabId: string) => {
    if (panes.value.some((pane) => pane.tab.id === tabId)) {
      if (panes.value.length === 1) {
        return;
      }

      syncPaneState(
        panes.value
          .filter((pane) => pane.tab.id !== tabId)
          .map((pane) => pane.tab)
      );
      return;
    }

    const nextTab = tabMap.get(tabId);
    if (!nextTab) {
      return;
    }

    syncPaneState([...panes.value.map((pane) => pane.tab), nextTab]);
  };

  const resizePane = (
    index: number,
    deltaRatio: number,
    baseSizes: number[] = panes.value.map((pane) => pane.size)
  ) => {
    if (index < 0 || index >= baseSizes.length - 1) {
      return;
    }

    const minSize = 0.15;
    const nextSizes = [...baseSizes];
    const currentSize = nextSizes[index] ?? 0;
    const adjacentSize = nextSizes[index + 1] ?? 0;
    const combinedSize = currentSize + adjacentSize;
    const resizedCurrent = Math.min(
      combinedSize - minSize,
      Math.max(minSize, currentSize + deltaRatio)
    );

    nextSizes[index] = resizedCurrent;
    nextSizes[index + 1] = combinedSize - resizedCurrent;
    panes.value = panes.value.map((pane, paneIndex) => {
      if (paneIndex === index) {
        return { ...pane, size: resizedCurrent };
      }

      if (paneIndex === index + 1) {
        return { ...pane, size: combinedSize - resizedCurrent };
      }

      return { ...pane, size: nextSizes[paneIndex] ?? pane.size };
    });
  };

  return {
    panes,
    ensurePaneVisible,
    togglePane,
    resizePane,
  };
}
