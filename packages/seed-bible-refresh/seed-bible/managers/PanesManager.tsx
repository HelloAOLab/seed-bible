import { signal } from "@preact/signals";
import type { ComponentChild } from "preact";
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
  component: ComponentChild | null;
  detached: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PaneContent {
  tab: ReaderTab | null;
  component: ComponentChild | null;
}

let nextPaneId = 1;

function createPane(
  tab: ReaderTab | null,
  component: ComponentChild | null = null,
  detached = false
): Pane {
  const paneId = nextPaneId;
  nextPaneId += 1;
  const offset = (paneId - 1) * 24;

  return {
    id: `pane-${paneId}`,
    tab,
    component,
    detached,
    x: 48 + offset,
    y: 48 + offset,
    width: 480,
    height: 320,
  };
}

function getEmptyPaneContent(): PaneContent {
  return {
    tab: null,
    component: null,
  };
}

function isPaneEmpty(pane: Pane) {
  return pane.tab === null && pane.component === null;
}

function getAttachedPanes(nextPanes: Pane[]) {
  return nextPanes.filter((pane) => !pane.detached);
}

function getDetachedPanes(nextPanes: Pane[]) {
  return nextPanes.filter((pane) => pane.detached);
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

function getPaneContentsInDisplayOrder(
  nextPanes: Pane[],
  selectedId: string | null
) {
  const attachedPanes = getAttachedPanes(nextPanes);
  const selectedPane =
    attachedPanes.find((pane) => pane.id === selectedId) ?? null;
  const orderedPanes = selectedPane
    ? [
        selectedPane,
        ...attachedPanes.filter((pane) => pane.id !== selectedPane.id),
      ]
    : attachedPanes;

  const seenTabs = new Set<string>();
  return orderedPanes.reduce<PaneContent[]>((result, pane) => {
    if (pane.component !== null) {
      result.push({
        tab: null,
        component: pane.component,
      });
      return result;
    }

    if (!pane.tab || seenTabs.has(pane.tab.id)) {
      return result;
    }

    seenTabs.add(pane.tab.id);
    result.push({
      tab: pane.tab,
      component: null,
    });
    return result;
  }, []);
}

function applyLayoutToPanes(
  existingPanes: Pane[],
  layoutId: PaneLayoutId,
  selectedId: string | null
) {
  const slotCount = getLayoutSlotCount(layoutId);
  const attachedPanes = getAttachedPanes(existingPanes);
  const detachedPanes = getDetachedPanes(existingPanes);
  const orderedContents = getPaneContentsInDisplayOrder(
    attachedPanes,
    selectedId
  );

  const nextAttachedPanes = Array.from({ length: slotCount }, (_, index) => {
    const existingPane = attachedPanes[index] ?? null;
    const nextContent = orderedContents[index] ?? getEmptyPaneContent();

    return existingPane
      ? {
          ...existingPane,
          tab: nextContent.tab,
          component: nextContent.component,
        }
      : createPane(nextContent.tab, nextContent.component);
  });

  return [...nextAttachedPanes, ...detachedPanes];
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
    panes.value = [
      createPane(initialTab),
      createPane(null, <div>My custom pane</div>, true),
    ];
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

  if (
    nextPanes.some(
      (pane, index) =>
        panes.value[index]?.tab !== pane.tab ||
        panes.value[index]?.component !== pane.component
    )
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
      const nextPane = createPane(nextTab);
      syncPaneState([nextPane]);
      selectedPaneId.value = nextPane.id;
      return;
    }

    // Do not auto-replace a component-backed pane with a tab.
    if (selectedPane.component !== null) {
      return;
    }

    if (selectedPane.tab?.id === nextTab.id) {
      return;
    }

    panes.value = panes.value.map((pane) =>
      pane.id === selectedPane.id
        ? { ...pane, tab: nextTab, component: null }
        : pane
    );
  };

  const setSelectedPaneComponent = (component: ComponentChild) => {
    const selectedPane = getSelectedPane();
    if (!selectedPane) {
      const nextPane = createPane(null, component);
      syncPaneState([nextPane]);
      selectedPaneId.value = nextPane.id;
      return;
    }

    panes.value = panes.value.map((pane) =>
      pane.id === selectedPane.id ? { ...pane, tab: null, component } : pane
    );
  };

  const setSelectedPaneDetached = (detached: boolean) => {
    const selectedPane = getSelectedPane();
    if (!selectedPane || selectedPane.detached === detached) {
      return;
    }

    const nextPanes = panes.value.map((pane) =>
      pane.id === selectedPane.id ? { ...pane, detached } : pane
    );

    if (detached) {
      syncPaneState(nextPanes, selectedPane.id);
      return;
    }

    syncPaneState(
      applyLayoutToPanes(nextPanes, layout.value, selectedPane.id),
      selectedPane.id
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

    const emptyPane =
      panes.value.find((pane) => !pane.detached && isPaneEmpty(pane)) ?? null;
    if (emptyPane) {
      panes.value = panes.value.map((pane) =>
        pane.id === emptyPane.id
          ? { ...pane, tab: nextTab, component: null }
          : pane
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

  const openInDetachedPane = (tabId: string) => {
    const nextTab = tabMap.get(tabId);
    if (!nextTab) {
      return;
    }

    const existingPane =
      panes.value.find((pane) => pane.tab?.id === tabId) ?? null;
    if (existingPane) {
      panes.value = panes.value.map((pane) =>
        pane.id === existingPane.id ? { ...pane, detached: true } : pane
      );
      selectedPaneId.value = existingPane.id;
      return;
    }

    const nextPane = createPane(nextTab, null, true);
    syncPaneState([...panes.value, nextPane], nextPane.id);
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
      nextPanes.find((pane) => pane.component !== null) ??
      nextPanes[0] ??
      null;
    syncPaneState(nextPanes, nextSelectedPane?.id ?? null);
  };

  const closeDetachedPane = (paneId: string) => {
    const paneToClose = panes.value.find((pane) => pane.id === paneId) ?? null;
    if (!paneToClose || !paneToClose.detached) {
      return;
    }

    const nextPanes = panes.value.filter((pane) => pane.id !== paneId);
    syncPaneState(nextPanes);
  };

  const movePane = (paneId: string, deltaX: number, deltaY: number) => {
    panes.value = panes.value.map((pane) =>
      pane.id === paneId
        ? {
            ...pane,
            x: Math.max(0, pane.x + deltaX),
            y: Math.max(0, pane.y + deltaY),
          }
        : pane
    );
  };

  const resizePane = (
    paneId: string,
    deltaWidth: number,
    deltaHeight: number
  ) => {
    panes.value = panes.value.map((pane) =>
      pane.id === paneId
        ? {
            ...pane,
            width: Math.max(280, pane.width + deltaWidth),
            height: Math.max(180, pane.height + deltaHeight),
          }
        : pane
    );
  };

  return {
    panes,
    layout,
    selectedPaneId,
    selectPane,
    setLayout,
    setSelectedPaneTab,
    setSelectedPaneComponent,
    setSelectedPaneDetached,
    openInNewPane,
    openInDetachedPane,
    closeDetachedPane,
    movePane,
    resizePane,
  };
}
