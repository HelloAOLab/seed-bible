import { signal } from "@preact/signals";
import type { ReaderTab } from "seed-bible.managers.TabsManager";

export interface Pane {
  id: string;
  tab: ReaderTab;
  size: number;
}

let nextPaneId = 1;

function createPane(tab: ReaderTab, size: number): Pane {
  const paneId = nextPaneId;
  nextPaneId += 1;

  return {
    id: `pane-${paneId}`,
    tab,
    size,
  };
}

function rebalancePanes(nextTabs: ReaderTab[]): Pane[] {
  if (nextTabs.length <= 0) {
    return [];
  }

  const size = 1 / nextTabs.length;
  return nextTabs.map((tab) => createPane(tab, size));
}

const panes = signal<Pane[]>([]);
const selectedPaneId = signal<string | null>(null);
let isInitialized = false;

function syncPaneState(nextPanes: Pane[]) {
  panes.value = nextPanes;

  if (
    !selectedPaneId.value ||
    !nextPanes.some((pane) => pane.id === selectedPaneId.value)
  ) {
    selectedPaneId.value = nextPanes[0]?.id ?? null;
  }
}

export function usePanes(tabs: ReaderTab[], selectedTabId: string) {
  if (!isInitialized) {
    const initialTab = tabs.find((tab) => tab.id === selectedTabId) ?? null;
    panes.value = initialTab ? [createPane(initialTab, 1)] : [];
    selectedPaneId.value = panes.value[0]?.id ?? null;
    isInitialized = true;
  }

  const tabMap = new Map(tabs.map((tab) => [tab.id, tab]));
  const nextPanes = panes.value
    .map((pane) => {
      const nextTab = tabMap.get(pane.tab.id);
      return nextTab ? ({ ...pane, tab: nextTab } as Pane) : null;
    })
    .filter((pane) => pane !== null);

  if (
    nextPanes.length !== panes.value.length ||
    nextPanes.some((pane, index) => panes.value[index]?.tab !== pane.tab)
  ) {
    syncPaneState(nextPanes);
  }

  const getSelectedPane = () => {
    return (
      panes.value.find((pane) => pane.id === selectedPaneId.value) ??
      panes.value[0] ??
      null
    );
  };

  const selectPane = (paneId: string) => {
    if (panes.value.some((pane) => pane.id === paneId)) {
      selectedPaneId.value = paneId;
    }
  };

  const setSelectedPaneTab = (tabId: string) => {
    if (!tabId) {
      return;
    }

    const nextTab = tabMap.get(tabId);
    if (!nextTab) {
      return;
    }

    const selectedPane = getSelectedPane();
    if (!selectedPane) {
      const nextPane = createPane(nextTab, 1);
      syncPaneState([nextPane]);
      selectedPaneId.value = nextPane.id;
      return;
    }

    panes.value = panes.value.map((pane) =>
      pane.id === selectedPane.id ? { ...pane, tab: nextTab } : pane
    );
  };

  const openInNewPane = (tabId: string) => {
    const nextTab = tabMap.get(tabId);
    if (!nextTab) {
      return;
    }

    const nextBalancedPanes = rebalancePanes([
      ...panes.value.map((pane) => pane.tab),
      nextTab,
    ]);
    const nextPane = nextBalancedPanes[nextBalancedPanes.length - 1] ?? null;
    syncPaneState(nextBalancedPanes);
    selectedPaneId.value = nextPane?.id ?? selectedPaneId.value;
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
    selectedPaneId,
    selectPane,
    setSelectedPaneTab,
    openInNewPane,
    resizePane,
  };
}
