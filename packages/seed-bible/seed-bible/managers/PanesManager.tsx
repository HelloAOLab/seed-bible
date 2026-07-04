import { computed, effect, Signal, signal } from "@preact/signals";
import type { ComponentChild } from "preact";
import type { ReaderTab, TabsManager } from "../managers/TabsManager";

/** Supported attached pane layout presets. */
export type PaneLayoutId =
  | "single"
  | "split-2v"
  | "split-left-two-right"
  | "split-3v"
  | "grid-2x2"
  | "split-4v";

export interface PaneLayoutOption {
  /** Stable layout identifier. */
  id: PaneLayoutId;
  /** Human-readable layout label for menus/tooltips. */
  label: string;
  /** Number of attached pane slots in this layout. */
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
  /** Stable pane identifier. */
  id: string;
  /** Tab content rendered in this pane, if present. */
  tab: ReaderTab | null;
  /** Custom component content rendered in this pane, if present. */
  component: (() => ComponentChild) | null;
  /** Grid portal identifier rendered in this pane, if present. */
  gridPortal: string | null;
  /** Map portal identifier rendered in this pane, if present. */
  mapPortal: string | null;
  /** The instance identifier for the pane's content (only for grid/map portals). */
  inst: string | null;
  /** The pattern that should be loaded in the grid/map portal */
  pattern: CasualOSPattern | null;
  /** Query parameters for the pane's content. */
  query: Record<string, string> | null;
  /** True when pane is detached from attached layout slots. */
  detached: boolean;
  /** Detached pane anchor mode. */
  detachedAnchor: DetachedPaneAnchor;
  /** Detached pane X position for floating mode. */
  x: number;
  /** Detached pane Y position for floating mode. */
  y: number;
  /** Detached pane width (or side-panel width when anchored to side). */
  width: number;
  /** Detached pane height (or bottom-panel height when anchored to bottom). */
  height: number;
}

/** Placement mode for detached panes. */
export type DetachedPaneAnchor = "floating" | "side" | "bottom" | "fullscreen";

interface PaneContent {
  tab: ReaderTab | null;
  component: (() => ComponentChild) | null;
  gridPortal: string | null;
  mapPortal: string | null;
  inst: string | null;
  pattern: CasualOSPattern | null;
  query: Record<string, string> | null;
}

export type CasualOSPattern =
  | {
      name: string;
    }
  | { aux: string };

export interface PaneOpenContentOptions {
  /** Tab ID to render in the pane. */
  tabId?: string;
  /** Custom component to render in the pane. */
  component?: (() => ComponentChild) | null;
  /** Grid portal ID to render in the pane. */
  gridPortal?: string | null;
  /** Map portal ID to render in the pane. */
  mapPortal?: string | null;
  /** The instance identifier for the pane's content (only for grid/map portals). */
  inst?: string | null;
  /** The pattern that should be loaded in the grid/map portal */
  pattern?: CasualOSPattern | null;
  /** Query parameters for the pane's content (translates to the config bot tags for the grid portal/map portal). */
  query?: Record<string, string> | null;
}

export interface PaneOpenOptions extends PaneOpenContentOptions {
  /** Whether to open in attached slots or as a detached pane. */
  type: "attached" | "detached";
  /** Optional anchor mode when opening as detached pane. */
  detachedAnchor?: Exclude<DetachedPaneAnchor, "floating">;
  /**
   * Optional stable pane identifier.
   * When provided, an existing pane with this ID is reused and updated with the
   * given content. If no pane with this ID exists, a new pane with this ID is
   * created.
   */
  id?: string;
}

function createPaneFactory() {
  let nextPaneId = 1;

  return (
    tab: ReaderTab | null,
    component: (() => ComponentChild) | null = null,
    detached = false,
    detachedAnchor: DetachedPaneAnchor = "floating",
    customId?: string
  ): Pane => {
    const paneId = nextPaneId;
    nextPaneId += 1;
    const offset = (paneId - 1) * 24;

    return {
      id: customId ?? `pane-${paneId}`,
      tab,
      component,
      gridPortal: null,
      mapPortal: null,
      inst: null,
      pattern: null,
      query: null,
      detached,
      detachedAnchor: detached ? detachedAnchor : "floating",
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
    inst: null,
    pattern: null,
    query: null,
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
  selectedId: string | null,
  slotCount: number
) {
  const attachedPanes = getAttachedPanes(nextPanes);

  // Pulling the selected pane's content to the front reshuffles which tab is
  // shown in which physical slot, so only do it when the layout actually has
  // fewer slots than panes (shrinking) — there we want to keep the focused
  // pane's content rather than drop it. When the slot count is preserved or
  // grows, keep the existing left-to-right order so panes stay put. Reordering
  // on every re-layout is what made an "open in new panel" clone jump into the
  // first slot and swap with the original tab.
  const isShrinking = attachedPanes.length > slotCount;
  const selectedPane = isShrinking
    ? (attachedPanes.find((pane) => pane.id === selectedId) ?? null)
    : null;
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
        inst: null,
        pattern: null,
        query: null,
      });
      return result;
    }

    if (pane.gridPortal !== null) {
      result.push({
        tab: null,
        component: null,
        gridPortal: pane.gridPortal,
        mapPortal: null,
        inst: pane.inst,
        pattern: pane.pattern,
        query: pane.query,
      });
      return result;
    }

    if (pane.mapPortal !== null) {
      result.push({
        tab: null,
        component: null,
        gridPortal: null,
        mapPortal: pane.mapPortal,
        inst: pane.inst,
        pattern: pane.pattern,
        query: pane.query,
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
      inst: null,
      pattern: null,
      query: null,
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
    component?: (() => ComponentChild) | null,
    detached?: boolean,
    detachedAnchor?: DetachedPaneAnchor
  ) => Pane
) {
  const slotCount = getLayoutSlotCount(layoutId);
  const attachedPanes = getAttachedPanes(existingPanes);
  const detachedPanes = getDetachedPanes(existingPanes);
  const orderedContents = getPaneContentsInDisplayOrder(
    attachedPanes,
    selectedId,
    slotCount
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
          inst: nextContent.inst,
          pattern: nextContent.pattern,
          query: nextContent.query,
        }
      : createPane(nextContent.tab, nextContent.component);
  });

  return [...nextAttachedPanes, ...detachedPanes];
}

/**
 * API surface for pane layout, selection, and detached pane management.
 *
 * The manager supports attached slot-based layouts plus detached panes with
 * floating/side/bottom anchoring.
 */
export interface PanesManager {
  /** All panes (attached and detached) currently tracked by the manager. */
  panes: Signal<Pane[]>;

  /** Active attached layout preset. */
  layout: Signal<PaneLayoutId>;

  /** Currently selected pane ID. */
  selectedPaneId: Signal<string | null>;

  /** Selects a pane by ID if it exists. */
  selectPane: (paneId: string) => void;

  /** Applies an attached layout preset and redistributes attached pane content. */
  setLayout: (layoutId: PaneLayoutId) => void;

  /**
   * Sets tab content on the currently selected pane.
   * If the currently selected pane is a component-backed pane, then the first tab-backed pane is changed instead.
   */
  setSelectedPaneTab: (tabId: string) => void;

  /**
   * Opens content in a new pane when possible.
   * Returns the pane that was opened or focused, or null if the operation could not be completed.
   */
  openPane: (options: PaneOpenOptions) => Pane | null;

  /**
   * Opens/replaces content in an existing pane.
   * Returns true on success, false when input/pane is invalid.
   */
  openInPane: (paneId: string, options: PaneOpenContentOptions) => boolean;

  /**
   * Closes a pane.
   * Attached panes cannot be closed below one remaining attached slot.
   * Returns true when a pane was closed.
   */
  closePane: (paneId: string) => boolean;

  /**
   * Toggles detached state for a pane.
   * Enforces attached slot count constraints.
   * Returns true when state changed.
   */
  setDetached: (paneId: string, detached: boolean) => boolean;

  /**
   * Sets anchor mode for a detached pane.
   * Returns true when anchor changed.
   */
  setDetachedAnchor: (paneId: string, anchor: DetachedPaneAnchor) => boolean;

  /** Moves a floating detached pane by delta values. */
  movePane: (paneId: string, deltaX: number, deltaY: number) => void;

  /**
   * Resizes a detached pane by delta values.
   * In side mode only width changes, in bottom mode only height changes.
   */
  resizePane: (
    paneId: string,
    deltaWidth: number,
    deltaHeight: number,
    uiScale: number
  ) => void;
}

/**
 * Creates pane manager state and wiring.
 *
 * Behavior:
 * - Initializes with one attached pane bound to selected tab.
 * - Synchronizes pane tab references as tabs list changes.
 * - Mirrors active portal IDs into configBot tags.
 */
export function createPanes(
  tabsManager: TabsManager,
  selectedTabId: Signal<string>
): PanesManager {
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
          panes.value[index]?.mapPortal !== pane.mapPortal ||
          panes.value[index]?.inst !== pane.inst ||
          panes.value[index]?.pattern !== pane.pattern ||
          panes.value[index]?.query !== pane.query
      )
    ) {
      syncPaneState(nextPanes.value);
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

    let selectedPane = getSelectedPane();
    if (!selectedPane) {
      const nextPane = createPane(nextTab);
      syncPaneState([nextPane]);
      selectedPaneId.value = nextPane.id;
      return;
    }

    const $panes = panes.peek();

    // Do not auto-replace a component-backed pane with a tab.
    if (selectedPane.component !== null) {
      selectedPane = $panes.find((p) => p.tab !== null) ?? null;
    }

    if (!selectedPane) {
      // no reading tabs to replace, so replace the first attached pane instead
      selectedPane = $panes.find((p) => !p.detached) ?? null;
    }

    if (!selectedPane) {
      // still no pane, so open a new attached one
      openPane({
        type: "attached",
        tabId: nextTab.id,
      });
      return;
    }

    if (selectedPane.tab?.id === nextTab.id) {
      return;
    }

    panes.value = $panes.map((pane) =>
      pane.id === selectedPane.id
        ? {
            ...pane,
            tab: nextTab,
            component: null,
            gridPortal: null,
            mapPortal: null,
            inst: null,
            pattern: null,
            query: null,
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
        inst: null,
        pattern: null,
        query: null,
      };
    }

    if (hasComponent) {
      return {
        tab: null,
        component: options.component ?? null,
        gridPortal: null,
        mapPortal: null,
        portalType: null as "grid" | "map" | null,
        inst: null,
        pattern: null,
        query: null,
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
        inst: options.inst ?? null,
        pattern: options.pattern ?? null,
        query: options.query ?? null,
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
      inst: options.inst ?? null,
      pattern: options.pattern ?? null,
      query: options.query ?? null,
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
          inst: parsed.inst,
          pattern: parsed.pattern ?? null,
          query: parsed.query ?? null,
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
        pane.id === paneId
          ? { ...pane, detached: true, detachedAnchor: "floating" as const }
          : pane
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
      pane.id === paneId
        ? { ...pane, detached: false, detachedAnchor: "floating" as const }
        : pane
    );
    const nextSlotCount = Math.min(4, attachedCount + 1);
    layout.value = getDefaultLayoutForSlotCount(nextSlotCount);
    syncPaneState(
      applyLayoutToPanes(nextPanes, layout.value, paneId, createPane),
      paneId
    );
    return true;
  };

  const setDetachedAnchor = (paneId: string, anchor: DetachedPaneAnchor) => {
    const targetPane = panes.value.find((pane) => pane.id === paneId) ?? null;
    if (!targetPane || !targetPane.detached) {
      return false;
    }

    if (targetPane.detachedAnchor === anchor) {
      return false;
    }

    panes.value = panes.value.map((pane) =>
      pane.id === paneId ? { ...pane, detachedAnchor: anchor } : pane
    );
    return true;
  };

  const openPane = (options: PaneOpenOptions): Pane | null => {
    const parsed = parsePaneOptions(options);
    if (!parsed) {
      return null;
    }

    if (options.id) {
      const existingPane =
        panes.value.find((pane) => pane.id === options.id) ?? null;
      if (existingPane) {
        return openInPane(existingPane.id, options)
          ? (panes.value.find((pane) => pane.id === existingPane.id) ?? null)
          : null;
      }
    }

    if (parsed.tab) {
      const existingPane =
        panes.value.find((pane) => pane.tab?.id === parsed.tab!.id) ?? null;
      if (existingPane) {
        if (options.type === "detached" && !existingPane.detached) {
          setDetached(existingPane.id, true);
        }
        if (options.type === "detached") {
          setDetachedAnchor(
            existingPane.id,
            options.detachedAnchor ?? "floating"
          );
        }
        selectedPaneId.value = existingPane.id;
        return (
          panes.value.find((pane) => pane.id === existingPane.id) ??
          existingPane
        );
      }
    }

    if (options.type === "detached") {
      const nextPane = createPane(
        parsed.tab,
        parsed.component,
        true,
        options.detachedAnchor ?? "floating",
        options.id
      );
      const detachedPane = {
        ...nextPane,
        gridPortal: parsed.gridPortal,
        mapPortal: parsed.mapPortal,
        inst: parsed.inst,
        pattern: parsed.pattern,
        query: parsed.query ?? null,
      };
      syncPaneState([...panes.value, detachedPane], detachedPane.id);
      return detachedPane;
    }

    const emptyAttachedPane =
      panes.value.find((pane) => !pane.detached && isPaneEmpty(pane)) ?? null;
    if (emptyAttachedPane) {
      return openInPane(emptyAttachedPane.id, options)
        ? (panes.value.find((pane) => pane.id === emptyAttachedPane.id) ?? null)
        : null;
    }

    const attachedCount = getAttachedSlotCount();
    const nextSlotCount = Math.min(4, attachedCount + 1);
    if (nextSlotCount <= attachedCount) {
      return null;
    }

    const nextPane = createPane(
      parsed.tab,
      parsed.component,
      false,
      "floating",
      options.id
    );
    const attachedPane = {
      ...nextPane,
      gridPortal: parsed.gridPortal,
      mapPortal: parsed.mapPortal,
      inst: parsed.inst,
      pattern: parsed.pattern,
      query: parsed.query ?? null,
    };
    layout.value = getDefaultLayoutForSlotCount(nextSlotCount);
    const nextPanes = applyLayoutToPanes(
      [...panes.value, attachedPane],
      layout.value,
      selectedPaneId.value,
      createPane
    );
    syncPaneState(nextPanes, attachedPane.id);
    return (
      panes.value.find((pane) => pane.id === attachedPane.id) ?? attachedPane
    );
  };

  // Disposes pane-only tabs (those backing an "open in new/detached panel")
  // once no pane references them, so closing/collapsing a panel doesn't leak
  // hidden tabs and their reading states.
  const disposeUnreferencedPaneOnlyTabs = () => {
    const referencedTabIds = new Set(
      panes.value
        .map((pane) => pane.tab?.id)
        .filter((id): id is string => typeof id === "string")
    );
    for (const tab of tabsManager.tabs.value) {
      if (tab.paneOnly && !referencedTabIds.has(tab.id)) {
        tabsManager.removeTab(tab.id);
      }
    }
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
    disposeUnreferencedPaneOnlyTabs();
  };

  const closePane = (paneId: string) => {
    const paneToClose = panes.value.find((pane) => pane.id === paneId) ?? null;
    if (!paneToClose) {
      return false;
    }

    if (paneToClose.detached) {
      const nextPanes = panes.value.filter((pane) => pane.id !== paneId);
      syncPaneState(nextPanes);
      disposeUnreferencedPaneOnlyTabs();
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
    disposeUnreferencedPaneOnlyTabs();
    return true;
  };

  const movePane = (paneId: string, deltaX: number, deltaY: number) => {
    panes.value = panes.value.map((pane) => {
      if (pane.id !== paneId) {
        return pane;
      }

      if (pane.detachedAnchor !== "floating") {
        return pane;
      }

      return {
        ...pane,
        x: Math.max(0, pane.x + deltaX),
        y: Math.max(0, pane.y + deltaY),
      };
    });
  };

  const resizePane = (
    paneId: string,
    deltaWidth: number,
    deltaHeight: number,
    uiScale: number
  ) => {
    panes.value = panes.value.map((pane) => {
      if (pane.id !== paneId) {
        return pane;
      }

      if (pane.detachedAnchor === "fullscreen") {
        return pane;
      }

      if (pane.detachedAnchor === "side") {
        return {
          ...pane,
          width: Math.max(320 * uiScale, pane.width + deltaWidth),
        };
      }

      if (pane.detachedAnchor === "bottom") {
        return {
          ...pane,
          height: Math.max(180 * uiScale, pane.height + deltaHeight),
        };
      }

      return {
        ...pane,
        width: Math.max(280 * uiScale, pane.width + deltaWidth),
        height: Math.max(180 * uiScale, pane.height + deltaHeight),
      };
    });
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
    setDetachedAnchor,
    movePane,
    resizePane,
  };
}
