import { signal } from "@preact/signals";
import type { ReaderTab } from "seed-bible.managers.TabsManager";

function createEqualPaneSizes(count: number): number[] {
  if (count <= 0) {
    return [];
  }

  const size = 1 / count;
  return Array.from({ length: count }, () => size);
}

const paneTabIds = signal<string[]>([]);
const paneSizes = signal<number[]>([]);
let isInitialized = false;

function syncPaneState(nextPaneTabIds: string[]) {
  paneTabIds.value = nextPaneTabIds;
  paneSizes.value = createEqualPaneSizes(nextPaneTabIds.length);
}

export function usePanes(tabs: ReaderTab[], selectedTabId: string) {
  if (!isInitialized) {
    paneTabIds.value = selectedTabId ? [selectedTabId] : [];
    paneSizes.value = createEqualPaneSizes(paneTabIds.value.length);
    isInitialized = true;
  }

  const validTabIds = new Set(tabs.map((tab) => tab.id));
  const nextPaneTabIds = paneTabIds.value.filter((tabId) =>
    validTabIds.has(tabId)
  );

  if (nextPaneTabIds.length !== paneTabIds.value.length) {
    syncPaneState(nextPaneTabIds);
  }

  const ensurePaneVisible = (tabId: string) => {
    if (!tabId || paneTabIds.value.includes(tabId)) {
      return;
    }

    syncPaneState([...paneTabIds.value, tabId]);
  };

  const togglePane = (tabId: string) => {
    if (paneTabIds.value.includes(tabId)) {
      if (paneTabIds.value.length === 1) {
        return;
      }

      syncPaneState(paneTabIds.value.filter((id) => id !== tabId));
      return;
    }

    syncPaneState([...paneTabIds.value, tabId]);
  };

  const resizePane = (
    index: number,
    deltaRatio: number,
    baseSizes: number[] = paneSizes.value
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
    paneSizes.value = nextSizes;
  };

  return {
    paneTabIds,
    paneSizes,
    ensurePaneVisible,
    togglePane,
    resizePane,
  };
}
