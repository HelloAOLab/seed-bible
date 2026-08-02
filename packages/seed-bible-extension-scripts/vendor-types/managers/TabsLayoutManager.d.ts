import { type ReadonlySignal, type Signal } from "@preact/signals";
import type { ReaderTab, TabsManager } from "../managers/TabsManager";
/** Supported tab slot layout presets. */
export type TabSlotLayoutId =
  | "single"
  | "split-2v"
  | "split-left-two-right"
  | "split-3v"
  | "grid-2x2"
  | "split-4v"
  | "stacked-2";
export interface TabSlotLayoutOption {
  /** Stable layout identifier. */
  id: TabSlotLayoutId;
  /** Human-readable layout label for menus/tooltips. */
  label: string;
  /** Number of tab slots in this layout. */
  slotCount: number;
}
export declare const TAB_SLOT_LAYOUT_OPTIONS: TabSlotLayoutOption[];
export interface TabSlot {
  /** Stable slot identifier. */
  id: string;
  /** Tab currently occupying this slot, or null when the slot is empty. */
  tab: ReaderTab | null;
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
}
/**
 * Creates the tabs layout manager.
 *
 * Behavior:
 * - Initializes with one slot bound to the selected tab.
 * - Synchronizes slot tab references as the tabs list changes.
 * - Disposes slot-only tab clones once no slot references them.
 * - Forces `layout` to `"single"` whenever `panelsEnabled` is false.
 */
export declare function createTabsLayout(
  tabsManager: TabsManager,
  panelsEnabled: ReadonlySignal<boolean>
): TabsLayoutManager;
