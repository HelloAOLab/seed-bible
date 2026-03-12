import { signal } from "@preact/signals";
import type { ReaderTab } from "seed-bible.managers.TabsManager";

export type PaneLayoutId =
  | "single"
  | "split-2v"
  | "split-left-two-right"
  | "split-3v"
  | "grid-2x2"
  | "split-4v";

export interface PaneLayoutOption {
  id: PaneLayoutId;
  label: string;
  slotCount: number;
}

export const PANE_LAYOUT_OPTIONS: PaneLayoutOption[] = [
  { id: "single", label: "Single pane", slotCount: 1 },
  { id: "split-2v", label: "Two vertical panes", slotCount: 2 },
  {
    id: "split-left-two-right",
    label: "Left pane with two stacked right panes",
    slotCount: 3,
  },
  { id: "split-3v", label: "Three vertical panes", slotCount: 3 },
  { id: "grid-2x2", label: "Four corner panes", slotCount: 4 },
  { id: "split-4v", label: "Four vertical panes", slotCount: 4 },
];

export interface Pane {
  id: string;
  tab: ReaderTab | null;
}

let nextPaneId = 1;

function createPane(tab: ReaderTab | null): Pane {
  const paneId = nextPaneId;
  nextPaneId += 1;

  return {
    id: `pane-${paneId}`,
    tab,
  };
}

function getLayoutSlotCount(layoutId: PaneLayoutId) {
  return (
    PANE_LAYOUT_OPTIONS.find((layout) => layout.id === layoutId)?.slotCount ?? 1
  );
}

function getDefaultLayoutForSlotCount(slotCount: number): PaneLayoutId {
  switch (slotCount) {
    case 2:
      return "split-2v";
    case 3:
      return "split-left-two-right";
    case 4:
      return "grid-2x2";
    default:
      return "single";
  }
}

function getPaneTabsInDisplayOrder(
  nextPanes: Pane[],
  selectedId: string | null
) {
  const selectedPane = nextPanes.find((pane) => pane.id === selectedId) ?? null;
  const orderedPanes = selectedPane
    ? [selectedPane, ...nextPanes.filter((pane) => pane.id !== selectedPane.id)]
    : nextPanes;

  const seenTabs = new Set<string>();
  return orderedPanes.reduce<ReaderTab[]>((result, pane) => {
    if (!pane.tab || seenTabs.has(pane.tab.id)) {
      return result;
    }

    seenTabs.add(pane.tab.id);
    result.push(pane.tab);
    return result;
  }, []);
}

function applyLayoutToPanes(
  existingPanes: Pane[],
  layoutId: PaneLayoutId,
  selectedId: string | null
) {
  const slotCount = getLayoutSlotCount(layoutId);
  const orderedTabs = getPaneTabsInDisplayOrder(existingPanes, selectedId);

  return Array.from({ length: slotCount }, (_, index) => {
    const existingPane = existingPanes[index] ?? null;
    const nextTab = orderedTabs[index] ?? null;

    return existingPane
      ? { ...existingPane, tab: nextTab }
      : createPane(nextTab);
  });
}

const panes = signal<Pane[]>([]);
const selectedPaneId = signal<string | null>(null);
const layout = signal<PaneLayoutId>("single");
let isInitialized = false;

function syncPaneState(nextPanes: Pane[], nextSelectedPaneId?: string | null) {
  panes.value = nextPanes;

  const desiredPaneId =
    nextSelectedPaneId !== undefined
      ? nextSelectedPaneId
      : selectedPaneId.value;
  if (desiredPaneId && nextPanes.some((pane) => pane.id === desiredPaneId)) {
    selectedPaneId.value = desiredPaneId;
    return;
  }

  selectedPaneId.value = nextPanes[0]?.id ?? null;
}

export function usePanes(tabs: ReaderTab[], selectedTabId: string) {
  if (!isInitialized) {
    const initialTab = tabs.find((tab) => tab.id === selectedTabId) ?? null;
    panes.value = [createPane(initialTab)];
    selectedPaneId.value = panes.value[0]?.id ?? null;
    isInitialized = true;
  }

  const tabMap = new Map(tabs.map((tab) => [tab.id, tab]));
  const nextPanes = panes.value.map((pane) => {
    if (!pane.tab) {
      return pane;
    }

    const nextTab = tabMap.get(pane.tab.id) ?? null;
    return { ...pane, tab: nextTab };
  });

  if (nextPanes.some((pane, index) => panes.value[index]?.tab !== pane.tab)) {
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
      const nextPane = createPane(nextTab);
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

    const existingPane =
      panes.value.find((pane) => pane.tab?.id === tabId) ?? null;
    if (existingPane) {
      selectedPaneId.value = existingPane.id;
      return;
    }

    const emptyPane = panes.value.find((pane) => pane.tab === null) ?? null;
    if (emptyPane) {
      panes.value = panes.value.map((pane) =>
        pane.id === emptyPane.id ? { ...pane, tab: nextTab } : pane
      );
      selectedPaneId.value = emptyPane.id;
      return;
    }

    const nextSlotCount = Math.min(4, panes.value.length + 1);
    if (nextSlotCount <= panes.value.length) {
      return;
    }

    layout.value = getDefaultLayoutForSlotCount(nextSlotCount);
    const nextPanes = applyLayoutToPanes(
      [...panes.value, createPane(nextTab)],
      layout.value,
      selectedPaneId.value
    );
    const nextSelectedPane =
      nextPanes.find((pane) => pane.tab?.id === tabId) ?? null;
    syncPaneState(nextPanes, nextSelectedPane?.id ?? null);
  };

  const setLayout = (layoutId: PaneLayoutId) => {
    layout.value = layoutId;
    const nextPanes = applyLayoutToPanes(
      panes.value,
      layoutId,
      selectedPaneId.value
    );
    const currentSelectedTabId = getSelectedPane()?.tab?.id ?? null;
    const nextSelectedPane =
      nextPanes.find((pane) => pane.tab?.id === currentSelectedTabId) ??
      nextPanes[0] ??
      null;
    syncPaneState(nextPanes, nextSelectedPane?.id ?? null);
  };

  return {
    panes,
    layout,
    selectedPaneId,
    selectPane,
    setLayout,
    setSelectedPaneTab,
    openInNewPane,
  };
}
