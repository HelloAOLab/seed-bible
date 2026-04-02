import { computed, effect, Signal, signal } from "@preact/signals";
import type { ComponentChild } from "preact";
import type { ReaderTab, TabsManager } from "seed-bible.managers.TabsManager";

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
  component: () => ComponentChild | null;
  gridPortal: string | null;
  mapPortal: string | null;
  detached: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PaneContent {
  tab: ReaderTab | null;
  component: ComponentChild | null;
  gridPortal: string | null;
  mapPortal: string | null;
}

export interface PaneOpenContentOptions {
  tabId?: string;
  component?: ComponentChild;
  gridPortal?: string | null;
  mapPortal?: string | null;
}

export interface PaneOpenOptions extends PaneOpenContentOptions {
  type: "attached" | "detached";
}

function createPaneFactory() {
  let nextPaneId = 1;

  return (
    tab: ReaderTab | null,
    component: ComponentChild | null = null,
    detached = false
  ): Pane => {
    const paneId = nextPaneId;
    nextPaneId += 1;
    const offset = (paneId - 1) * 24;

    return {
      id: `pane-${paneId}`,
      tab,
      component,
      gridPortal: null,
      mapPortal: null,
      detached,
      x: 48 + offset,
      y: 48 + offset,
      width: 480,
      height: 320,
    };
  };
}

function getEmptyPaneContent(): PaneContent {
  return {
    tab: null,
    component: null,
    gridPortal: null,
    mapPortal: null,
  };
}

function isPaneEmpty(pane: Pane) {
  return (
    pane.tab === null &&
    pane.component === null &&
    pane.gridPortal === null &&
    pane.mapPortal === null
  );
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
        gridPortal: null,
        mapPortal: null,
      });
      return result;
    }

    if (pane.gridPortal !== null) {
      result.push({
        tab: null,
        component: null,
        gridPortal: pane.gridPortal,
        mapPortal: null,
      });
      return result;
    }

    if (pane.mapPortal !== null) {
      result.push({
        tab: null,
        component: null,
        gridPortal: null,
        mapPortal: pane.mapPortal,
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
      gridPortal: null,
      mapPortal: null,
    });
    return result;
  }, []);
}

function applyLayoutToPanes(
  existingPanes: Pane[],
  layoutId: PaneLayoutId,
  selectedId: string | null,
  createPane: (
    tab: ReaderTab | null,
    component?: ComponentChild | null,
    detached?: boolean
  ) => Pane
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
          gridPortal: nextContent.gridPortal,
          mapPortal: nextContent.mapPortal,
        }
      : createPane(nextContent.tab, nextContent.component);
  });

  return [...nextAttachedPanes, ...detachedPanes];
}

export type PanesManager = ReturnType<typeof createPanes>;

export function createPanes(
  tabsManager: TabsManager,
  selectedTabId: Signal<string>
) {
  const createPane = createPaneFactory();
  const panes = signal<Pane[]>([]);
  const selectedPaneId = signal<string | null>(null);
  const layout = signal<PaneLayoutId>("single");

  const syncPaneState = (
    nextPanes: Pane[],
    nextSelectedPaneId?: string | null
  ) => {
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
  };

  const initialTab =
    tabsManager.tabs.value.find((tab) => tab.id === selectedTabId.value) ??
    null;
  panes.value = [createPane(initialTab)];
  selectedPaneId.value = panes.value[0]?.id ?? null;

  const tabMap = computed(
    () => new Map(tabsManager.tabs.value.map((tab) => [tab.id, tab]))
  );
  const nextPanes = computed(() =>
    panes.value.map((pane) => {
      if (!pane.tab) {
        return pane;
      }

      const nextTab = tabMap.value.get(pane.tab.id) ?? null;
      return { ...pane, tab: nextTab };
    })
  );

  effect(() => {
    if (
      nextPanes.value.some(
        (pane, index) =>
          panes.value[index]?.tab !== pane.tab ||
          panes.value[index]?.component !== pane.component ||
          panes.value[index]?.gridPortal !== pane.gridPortal ||
          panes.value[index]?.mapPortal !== pane.mapPortal
      )
    ) {
      syncPaneState(nextPanes.value);
    }
  });

  effect(() => {
    const activePortalPane =
      panes.value.find(
        (pane) => pane.gridPortal !== null || pane.mapPortal !== null
      ) ?? null;
    const activeGridPortal = activePortalPane?.gridPortal ?? null;
    const activeMapPortal = activePortalPane?.mapPortal ?? null;

    if (configBot.tags.gridPortal !== activeGridPortal) {
      configBot.tags.gridPortal = activeGridPortal;
    }

    if (configBot.tags.mapPortal !== activeMapPortal) {
      configBot.tags.mapPortal = activeMapPortal;
    }
  });

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

    const nextTab = tabMap.value.get(tabId);
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
        ? {
            ...pane,
            tab: nextTab,
            component: null,
            gridPortal: null,
            mapPortal: null,
          }
        : pane
    );
  };

  const parsePaneOptions = (options: PaneOpenContentOptions) => {
    const hasTabId =
      typeof options.tabId === "string" && options.tabId.length > 0;
    const hasComponent = typeof options.component !== "undefined";
    const hasGridPortal = typeof options.gridPortal !== "undefined";
    const hasMapPortal = typeof options.mapPortal !== "undefined";

    if (!hasTabId && !hasComponent && !hasGridPortal && !hasMapPortal) {
      return null;
    }

    if (hasTabId) {
      const nextTab = tabMap.value.get(options.tabId!);
      if (!nextTab) {
        return null;
      }

      return {
        tab: nextTab,
        component: null,
        gridPortal: null,
        mapPortal: null,
        portalType: null as "grid" | "map" | null,
      };
    }

    if (hasComponent) {
      return {
        tab: null,
        component: options.component ?? null,
        gridPortal: null,
        mapPortal: null,
        portalType: null as "grid" | "map" | null,
      };
    }

    if (hasGridPortal) {
      const normalizedPortal =
        typeof options.gridPortal === "string" &&
        options.gridPortal.trim().length > 0
          ? options.gridPortal.trim()
          : "thePortal";
      return {
        tab: null,
        component: null,
        gridPortal: normalizedPortal,
        mapPortal: null,
        portalType: "grid" as const,
      };
    }

    const normalizedPortal =
      typeof options.mapPortal === "string" &&
      options.mapPortal.trim().length > 0
        ? options.mapPortal.trim()
        : "map_portal";
    return {
      tab: null,
      component: null,
      gridPortal: null,
      mapPortal: normalizedPortal,
      portalType: "map" as const,
    };
  };

  const openInPane = (paneId: string, options: PaneOpenContentOptions) => {
    const parsed = parsePaneOptions(options);
    if (!parsed) {
      return false;
    }

    const targetPane = panes.value.find((pane) => pane.id === paneId) ?? null;
    if (!targetPane) {
      return false;
    }

    panes.value = panes.value.map((pane) => {
      if (pane.id === paneId) {
        return {
          ...pane,
          tab: parsed.tab,
          component: parsed.component,
          gridPortal: parsed.gridPortal,
          mapPortal: parsed.mapPortal,
        };
      }

      if (
        parsed.portalType &&
        (pane.gridPortal !== null || pane.mapPortal !== null)
      ) {
        return {
          ...pane,
          gridPortal: null,
          mapPortal: null,
        };
      }

      return pane;
    });

    selectedPaneId.value = paneId;
    return true;
  };

  const getAttachedSlotCount = () => getAttachedPanes(panes.value).length;

  const setDetached = (paneId: string, detached: boolean) => {
    const targetPane = panes.value.find((pane) => pane.id === paneId) ?? null;
    if (!targetPane || targetPane.detached === detached) {
      return false;
    }

    const attachedCount = getAttachedSlotCount();

    if (detached) {
      if (attachedCount <= 1) {
        return false;
      }

      const nextPanes = panes.value.map((pane) =>
        pane.id === paneId ? { ...pane, detached: true } : pane
      );
      const nextSlotCount = Math.max(1, attachedCount - 1);
      layout.value = getDefaultLayoutForSlotCount(nextSlotCount);
      syncPaneState(
        applyLayoutToPanes(nextPanes, layout.value, paneId, createPane),
        paneId
      );
      return true;
    }

    if (attachedCount >= 4) {
      return false;
    }

    const nextPanes = panes.value.map((pane) =>
      pane.id === paneId ? { ...pane, detached: false } : pane
    );
    const nextSlotCount = Math.min(4, attachedCount + 1);
    layout.value = getDefaultLayoutForSlotCount(nextSlotCount);
    syncPaneState(
      applyLayoutToPanes(nextPanes, layout.value, paneId, createPane),
      paneId
    );
    return true;
  };

  const openPane = (options: PaneOpenOptions) => {
    const parsed = parsePaneOptions(options);
    if (!parsed) {
      return false;
    }

    if (parsed.tab) {
      const existingPane =
        panes.value.find((pane) => pane.tab?.id === parsed.tab!.id) ?? null;
      if (existingPane) {
        if (options.type === "detached" && !existingPane.detached) {
          setDetached(existingPane.id, true);
        }
        selectedPaneId.value = existingPane.id;
        return true;
      }
    }

    if (options.type === "detached") {
      const nextPane = createPane(parsed.tab, parsed.component, true);
      const detachedPane = {
        ...nextPane,
        gridPortal: parsed.gridPortal,
        mapPortal: parsed.mapPortal,
      };
      const nextPanes = parsed.portalType
        ? panes.value.map((pane) => ({
            ...pane,
            gridPortal: null,
            mapPortal: null,
          }))
        : panes.value;
      syncPaneState([...nextPanes, detachedPane], detachedPane.id);
      return true;
    }

    const emptyAttachedPane =
      panes.value.find((pane) => !pane.detached && isPaneEmpty(pane)) ?? null;
    if (emptyAttachedPane) {
      return openInPane(emptyAttachedPane.id, options);
    }

    const attachedCount = getAttachedSlotCount();
    const nextSlotCount = Math.min(4, attachedCount + 1);
    if (nextSlotCount <= attachedCount) {
      return false;
    }

    const nextPane = createPane(parsed.tab, parsed.component, false);
    const attachedPane = {
      ...nextPane,
      gridPortal: parsed.gridPortal,
      mapPortal: parsed.mapPortal,
    };
    layout.value = getDefaultLayoutForSlotCount(nextSlotCount);
    const basePanes = parsed.portalType
      ? panes.value.map((pane) => ({
          ...pane,
          gridPortal: null,
          mapPortal: null,
        }))
      : panes.value;
    const nextPanes = applyLayoutToPanes(
      [...basePanes, attachedPane],
      layout.value,
      selectedPaneId.value,
      createPane
    );
    syncPaneState(nextPanes, attachedPane.id);
    return true;
  };

  const setLayout = (layoutId: PaneLayoutId) => {
    layout.value = layoutId;
    const nextPanes = applyLayoutToPanes(
      panes.value,
      layoutId,
      selectedPaneId.value,
      createPane
    );
    const currentSelectedTabId = getSelectedPane()?.tab?.id ?? null;
    const nextSelectedPane =
      nextPanes.find((pane) => pane.tab?.id === currentSelectedTabId) ??
      nextPanes.find((pane) => pane.component !== null) ??
      nextPanes[0] ??
      null;
    syncPaneState(nextPanes, nextSelectedPane?.id ?? null);
  };

  const closePane = (paneId: string) => {
    const paneToClose = panes.value.find((pane) => pane.id === paneId) ?? null;
    if (!paneToClose) {
      return false;
    }

    if (paneToClose.detached) {
      const nextPanes = panes.value.filter((pane) => pane.id !== paneId);
      syncPaneState(nextPanes);
      return true;
    }

    const attachedCount = getAttachedSlotCount();
    if (attachedCount <= 1) {
      return false;
    }

    const nextPanesWithoutTarget = panes.value.filter(
      (pane) => pane.id !== paneId
    );
    const nextSlotCount = Math.max(1, attachedCount - 1);
    layout.value = getDefaultLayoutForSlotCount(nextSlotCount);
    const nextSelectedPaneId =
      selectedPaneId.value === paneId ? null : selectedPaneId.value;
    syncPaneState(
      applyLayoutToPanes(
        nextPanesWithoutTarget,
        layout.value,
        nextSelectedPaneId,
        createPane
      ),
      nextSelectedPaneId
    );
    return true;
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
    openPane,
    openInPane,
    closePane,
    setDetached,
    movePane,
    resizePane,
  };
}
