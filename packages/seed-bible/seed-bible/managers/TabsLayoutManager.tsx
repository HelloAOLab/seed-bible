import {
  computed,
  effect,
  signal,
  type ReadonlySignal,
  type Signal,
} from "@preact/signals";
import type { ReaderTab, TabsManager } from "../managers/TabsManager";
import {
  normalizeStoredTabsState,
  readStoredTabsState,
} from "./TabsPersistence";

/** Supported tab slot layout presets. */
export type TabSlotLayoutId =
  | "single"
  | "split-2v"
  | "split-left-two-right"
  | "split-3v"
  | "grid-2x2"
  | "split-4v"
  // Mobile-only: two slots stacked top/bottom. This is never a
  // user-selectable preset (it is intentionally absent from
  // TAB_SLOT_LAYOUT_OPTIONS) — it is only produced by the app's effective
  // layout when a mobile viewport shows two slots.
  | "stacked-2";

export interface TabSlotLayoutOption {
  /** Stable layout identifier. */
  id: TabSlotLayoutId;
  /** Human-readable layout label for menus/tooltips. */
  label: string;
  /** Number of tab slots in this layout. */
  slotCount: number;
}

export const TAB_SLOT_LAYOUT_OPTIONS: TabSlotLayoutOption[] = [
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

export interface TabSlot {
  /** Stable slot identifier. */
  id: string;
  /** Tab currently occupying this slot, or null when the slot is empty. */
  tab: ReaderTab | null;
}

function getLayoutSlotCount(layoutId: TabSlotLayoutId) {
  return (
    TAB_SLOT_LAYOUT_OPTIONS.find((layout) => layout.id === layoutId)
      ?.slotCount ?? 1
  );
}

function getDefaultLayoutForSlotCount(slotCount: number): TabSlotLayoutId {
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

function createSlotFactory() {
  let nextSlotId = 1;

  return (tab: ReaderTab | null, customId?: string): TabSlot => {
    const slotId = nextSlotId;
    nextSlotId += 1;

    return {
      id: customId ?? `slot-${slotId}`,
      tab,
    };
  };
}

function getTabsInDisplayOrder(
  existingSlots: TabSlot[],
  selectedId: string | null,
  slotCount: number
) {
  // Pulling the selected slot's tab to the front reshuffles which tab is
  // shown in which physical slot, so only do it when the layout actually has
  // fewer slots than exist (shrinking) — there we want to keep the focused
  // slot's tab rather than drop it. When the slot count is preserved or
  // grows, keep the existing left-to-right order so slots stay put.
  // Reordering on every re-layout is what made an "open in new panel" clone
  // jump into the first slot and swap with the original tab.
  const isShrinking = existingSlots.length > slotCount;
  const selectedSlot = isShrinking
    ? (existingSlots.find((slot) => slot.id === selectedId) ?? null)
    : null;
  const orderedSlots = selectedSlot
    ? [
        selectedSlot,
        ...existingSlots.filter((slot) => slot.id !== selectedSlot.id),
      ]
    : existingSlots;

  const seenTabs = new Set<string>();
  return orderedSlots.reduce<(ReaderTab | null)[]>((result, slot) => {
    if (!slot.tab || seenTabs.has(slot.tab.id)) {
      return result;
    }

    seenTabs.add(slot.tab.id);
    result.push(slot.tab);
    return result;
  }, []);
}

function applyLayoutToSlots(
  existingSlots: TabSlot[],
  layoutId: TabSlotLayoutId,
  selectedId: string | null,
  createSlot: (tab: ReaderTab | null) => TabSlot
) {
  const slotCount = getLayoutSlotCount(layoutId);
  const orderedTabs = getTabsInDisplayOrder(
    existingSlots,
    selectedId,
    slotCount
  );

  return Array.from({ length: slotCount }, (_, index) => {
    const existingSlot = existingSlots[index] ?? null;
    const nextTab = orderedTabs[index] ?? null;

    return existingSlot
      ? { ...existingSlot, tab: nextTab }
      : createSlot(nextTab);
  });
}

/**
 * API surface for tab slot layout, selection, and slot management.
 *
 * Tabs are always displayed through a slot in this layout — they can never
 * float or detach into a standalone pane.
 */
export interface TabsLayoutManager {
  /** All slots currently tracked by the manager, in display order. */
  slots: Signal<TabSlot[]>;

  /** Active layout preset. */
  layout: Signal<TabSlotLayoutId>;

  /** Currently selected slot ID. */
  selectedSlotId: Signal<string | null>;

  /** Selects a slot by ID if it exists. */
  selectSlot: (slotId: string) => void;

  /**
   * Applies a layout preset and redistributes slot content.
   * When `panelsEnabled` is false, only `"single"` is accepted.
   */
  setLayout: (layoutId: TabSlotLayoutId) => void;

  /**
   * Sets tab content on the currently selected slot (or the first slot if
   * none is selected).
   */
  setSelectedSlotTab: (tabId: string) => void;

  /**
   * Opens an existing tab in an existing slot.
   * Returns true on success, false when input/slot is invalid.
   */
  openTabInSlot: (slotId: string, tabId: string) => boolean;

  /**
   * Opens a tab in a brand-new slot ("open in new panel", repurposed for the
   * tab-slot model). A slot is bound to a tab by id, and slots sharing a tab
   * share its reading state and get de-duplicated into a single slot. So when
   * the requested tab is already displayed in a slot (the common case — it's
   * the tab currently being read), opening it again would either leave an
   * empty slot or move both slots when navigating chapters. To give the user
   * an independent, navigable slot, the tab is cloned into a fresh one seeded
   * at the same reading location.
   * Returns the new (or reused) slot, or null if a new slot could not be
   * created (layout already at its 4-slot maximum).
   */
  openTabInNewSlot: (tabId: string) => TabSlot | null;

  /**
   * Closes a slot. Cannot go below one remaining slot.
   * Returns true when a slot was closed.
   */
  closeSlot: (slotId: string) => boolean;

  /**
   * Rebuilds the slot arrangement persisted by the previous visit.
   *
   * Construction deliberately starts from a single slot — what SSR renders —
   * because a restored split mounts panes the served HTML doesn't contain, and
   * `hydrate()` reports (rather than silently patches) a client tree with extra
   * elements. Must be called *after* `TabsManager.hydrateStoredTabs`, since
   * slots are bound to tab objects by id; `app.hydrateFromStorage` sequences
   * both. Idempotent.
   */
  hydrateStoredLayout: () => void;
}

/**
 * Creates the tabs layout manager.
 *
 * Behavior:
 * - Initializes with one slot bound to the selected tab, or rebuilds the slot
 *   arrangement persisted by the previous visit when one is stored.
 * - Synchronizes slot tab references as the tabs list changes.
 * - Disposes slot-only tab clones once no slot references them.
 * - Forces `layout` to `"single"` whenever `panelsEnabled` is false — but only
 *   for layouts chosen through `setLayout`/`openTabInNewSlot`/`closeSlot`. A
 *   *restored* layout is kept intact regardless, and clamped for rendering
 *   only; see the note on `canRestoreLayout` below.
 */
export function createTabsLayout(
  tabsManager: TabsManager,
  panelsEnabled: ReadonlySignal<boolean>
): TabsLayoutManager {
  const createSlot = createSlotFactory();
  const slots = signal<TabSlot[]>([]);
  const selectedSlotId = signal<string | null>(null);
  const layout = signal<TabSlotLayoutId>("single");

  const syncSlotState = (
    nextSlots: TabSlot[],
    nextSelectedSlotId?: string | null
  ) => {
    slots.value = nextSlots;

    const desiredSlotId =
      nextSelectedSlotId !== undefined
        ? nextSelectedSlotId
        : selectedSlotId.value;
    if (desiredSlotId && nextSlots.some((slot) => slot.id === desiredSlotId)) {
      selectedSlotId.value = desiredSlotId;
      return;
    }

    selectedSlotId.value = nextSlots[0]?.id ?? null;
  };

  const getSelectedTab = () =>
    tabsManager.tabs.value.find(
      (tab) => tab.id === tabsManager.selectedTabId.value
    ) ?? null;

  // Remove hidden slot-only clones (restored by TabsManager to back split
  // panes) whose id no longer occupies any slot, so their reading states don't
  // leak. Used by both restore paths below.
  const removeUnreferencedSlotOnlyTabs = (referencedIds: Set<string>) => {
    const orphanIds = tabsManager.tabs.value
      .filter((tab) => tab.slotOnly && !referencedIds.has(tab.id))
      .map((tab) => tab.id);
    for (const id of orphanIds) {
      tabsManager.removeTab(id);
    }
  };

  // Start from the single slot SSR renders. The stored arrangement is applied
  // by `hydrateStoredLayout` after the first commit — restoring it here would
  // mount panes the served HTML never contained, which is the one hydration
  // divergence Preact reports instead of silently patching.
  slots.value = [createSlot(getSelectedTab())];
  selectedSlotId.value = slots.value[0]?.id ?? null;

  let storedLayoutHydrated = false;

  const hydrateStoredLayout = () => {
    if (storedLayoutHydrated) {
      return;
    }
    storedLayoutHydrated = true;

    const selectedTab = getSelectedTab();
    const bootSlot = slots.value[0] ?? null;
    const storedState = normalizeStoredTabsState(readStoredTabsState());
    // Deliberately NOT gated on `panelsEnabled`. A stored split is restored into
    // the manager even when panels are disabled, and the *rendered* view is
    // clamped to a single slot by `effectiveSlots`/`effectiveSlotLayout` in
    // SeedBibleStateManager — the same split-preserving treatment a mobile
    // viewport already gets, and what the layout menu in `Sidebar` already
    // assumes. Gating here instead would collapse the layout AND let the
    // persistence effect write the collapsed version straight back, so a split
    // built with panels on would be lost for good the first time the app opened
    // with them off.
    const canRestoreLayout =
      !!storedState &&
      storedState.slotTabIds.length > 0 &&
      getLayoutSlotCount(storedState.layout) === storedState.slotTabIds.length;

    if (canRestoreLayout && storedState) {
      const findTab = (id: string | null) =>
        id === null
          ? null
          : (tabsManager.tabs.value.find((tab) => tab.id === id) ?? null);

      const selectedIndex =
        storedState.selectedSlotIndex !== null &&
        storedState.selectedSlotIndex >= 0 &&
        storedState.selectedSlotIndex < storedState.slotTabIds.length
          ? storedState.selectedSlotIndex
          : 0;

      // Reuse the boot slot's id for the slot that ends up selected.
      // `TabsLayout` keys each pane on `slot.id`, so handing that pane a fresh
      // `slot-N` would unmount and remount it — throwing away the scripture
      // that just hydrated. Every other slot is new and can take a new id.
      const restoredSlots = storedState.slotTabIds.map((id, index) =>
        createSlot(
          findTab(id),
          index === selectedIndex ? bootSlot?.id : undefined
        )
      );

      // If reconcile appended a brand-new selected tab, it occupies no restored
      // slot. Drop it into the selected slot so it is actually visible, mirroring
      // the normal select-a-tab -> setSelectedSlotTab behavior.
      const isSelectedShown = restoredSlots.some(
        (slot) => slot.tab?.id === selectedTab?.id
      );
      if (selectedTab && !isSelectedShown && restoredSlots[selectedIndex]) {
        restoredSlots[selectedIndex] = {
          ...restoredSlots[selectedIndex]!,
          tab: selectedTab,
        };
      }

      slots.value = restoredSlots;
      // A single restored slot is always "single" (the only 1-slot preset); this
      // also neutralizes a corrupt stored id, which resolves to a 1-slot count.
      // For >1 slots the guard above already proved `layout` is a real preset.
      layout.value = restoredSlots.length === 1 ? "single" : storedState.layout;
      selectedSlotId.value =
        restoredSlots[selectedIndex]?.id ?? restoredSlots[0]?.id ?? null;

      removeUnreferencedSlotOnlyTabs(
        new Set(
          restoredSlots
            .map((slot) => slot.tab?.id)
            .filter((id): id is string => typeof id === "string")
        )
      );
      return;
    }

    // No restorable multi-slot layout. Rebind the existing slot to whichever tab
    // is now selected — `hydrateStoredTabs` may have replaced the tab objects
    // (and renamed their ids) out from under it — and drop hidden clones, which
    // without a split to back are dead weight.
    slots.value = [{ ...(bootSlot ?? createSlot(null)), tab: selectedTab }];
    selectedSlotId.value = slots.value[0]?.id ?? null;
    removeUnreferencedSlotOnlyTabs(
      new Set(selectedTab ? [selectedTab.id] : [])
    );
  };

  const tabMap = computed(
    () => new Map(tabsManager.tabs.value.map((tab) => [tab.id, tab]))
  );
  const nextSlots = computed(() =>
    slots.value.map((slot) => {
      if (!slot.tab) {
        return slot;
      }
      const nextTab = tabMap.value.get(slot.tab.id) ?? null;
      return { ...slot, tab: nextTab };
    })
  );

  effect(() => {
    if (
      nextSlots.value.some(
        (slot, index) => slots.value[index]?.tab !== slot.tab
      )
    ) {
      syncSlotState(nextSlots.value);
    }
  });

  // Disposes slot-only tabs (those backing an "open in new panel" clone) once
  // no slot references them, so closing/collapsing a slot doesn't leak hidden
  // tabs and their reading states.
  const disposeUnreferencedSlotOnlyTabs = () => {
    const referencedTabIds = new Set(
      slots.value
        .map((slot) => slot.tab?.id)
        .filter((id): id is string => typeof id === "string")
    );
    for (const tab of tabsManager.tabs.value) {
      if (tab.slotOnly && !referencedTabIds.has(tab.id)) {
        tabsManager.removeTab(tab.id);
      }
    }
  };

  const getSelectedSlot = () =>
    slots.value.find((slot) => slot.id === selectedSlotId.value) ??
    slots.value[0] ??
    null;

  const selectSlot = (slotId: string) => {
    if (slots.value.some((slot) => slot.id === slotId)) {
      selectedSlotId.value = slotId;
    }
  };

  const getSlotCount = () => slots.value.length;

  const setLayout = (layoutId: TabSlotLayoutId) => {
    const nextLayoutId = panelsEnabled.value ? layoutId : "single";
    layout.value = nextLayoutId;
    const nextSlotsValue = applyLayoutToSlots(
      slots.value,
      nextLayoutId,
      selectedSlotId.value,
      createSlot
    );
    const currentSelectedTabId = getSelectedSlot()?.tab?.id ?? null;
    const nextSelectedSlot =
      nextSlotsValue.find((slot) => slot.tab?.id === currentSelectedTabId) ??
      nextSlotsValue[0] ??
      null;
    syncSlotState(nextSlotsValue, nextSelectedSlot?.id ?? null);
    disposeUnreferencedSlotOnlyTabs();
  };

  const setSelectedSlotTab = (tabId: string) => {
    if (!tabId) {
      return;
    }

    const nextTab = tabMap.value.get(tabId);
    if (!nextTab) {
      return;
    }

    const selectedSlot = getSelectedSlot();
    if (!selectedSlot) {
      const nextSlot = createSlot(nextTab);
      syncSlotState([nextSlot], nextSlot.id);
      return;
    }

    if (selectedSlot.tab?.id === nextTab.id) {
      return;
    }

    slots.value = slots.value.map((slot) =>
      slot.id === selectedSlot.id ? { ...slot, tab: nextTab } : slot
    );
  };

  const openTabInSlot = (slotId: string, tabId: string) => {
    const nextTab = tabMap.value.get(tabId);
    if (!nextTab) {
      return false;
    }

    const targetSlot = slots.value.find((slot) => slot.id === slotId) ?? null;
    if (!targetSlot) {
      return false;
    }

    slots.value = slots.value.map((slot) =>
      slot.id === slotId ? { ...slot, tab: nextTab } : slot
    );
    selectedSlotId.value = slotId;
    return true;
  };

  const resolveTabForNewSlot = (tabId: string): string => {
    const sourceTab =
      tabsManager.tabs.value.find((tab) => tab.id === tabId) ?? null;
    if (!sourceTab) {
      return tabId;
    }

    const alreadyShown = slots.value.some((slot) => slot.tab?.id === tabId);
    if (!alreadyShown) {
      return tabId;
    }

    const readingState = sourceTab.readingState;
    const clone = tabsManager.addTab(
      undefined,
      {
        initialTranslationId: readingState.translationId.value,
        initialBookId: readingState.bookId.value,
        initialChapterNumber: readingState.chapterNumber.value,
      },
      { slotOnly: true }
    );
    return clone.id;
  };

  const openTabInNewSlot = (tabId: string): TabSlot | null => {
    const slotTabId = resolveTabForNewSlot(tabId);
    const nextTab = tabMap.value.get(slotTabId);
    if (!nextTab) {
      return null;
    }

    const slotCount = getSlotCount();
    const nextSlotCount = Math.min(4, slotCount + 1);
    if (nextSlotCount <= slotCount) {
      return null;
    }

    const nextSlot = createSlot(nextTab);
    layout.value = panelsEnabled.value
      ? getDefaultLayoutForSlotCount(nextSlotCount)
      : "single";
    const nextSlotsValue = applyLayoutToSlots(
      [...slots.value, nextSlot],
      layout.value,
      selectedSlotId.value,
      createSlot
    );
    syncSlotState(nextSlotsValue, nextSlot.id);
    return slots.value.find((slot) => slot.tab?.id === nextTab.id) ?? nextSlot;
  };

  const closeSlot = (slotId: string) => {
    const slotCount = getSlotCount();
    if (slotCount <= 1) {
      return false;
    }

    const slotToClose = slots.value.find((slot) => slot.id === slotId) ?? null;
    if (!slotToClose) {
      return false;
    }

    const nextSlotsWithoutTarget = slots.value.filter(
      (slot) => slot.id !== slotId
    );
    const nextSlotCount = Math.max(1, slotCount - 1);
    layout.value = panelsEnabled.value
      ? getDefaultLayoutForSlotCount(nextSlotCount)
      : "single";
    const nextSelectedSlotId =
      selectedSlotId.value === slotId ? null : selectedSlotId.value;
    syncSlotState(
      applyLayoutToSlots(
        nextSlotsWithoutTarget,
        layout.value,
        nextSelectedSlotId,
        createSlot
      ),
      nextSelectedSlotId
    );
    disposeUnreferencedSlotOnlyTabs();
    return true;
  };

  return {
    slots,
    layout,
    selectedSlotId,
    selectSlot,
    setLayout,
    setSelectedSlotTab,
    openTabInSlot,
    openTabInNewSlot,
    closeSlot,
    hydrateStoredLayout,
  };
}
