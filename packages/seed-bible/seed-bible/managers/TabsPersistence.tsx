import {
  DEFAULT_BOOK_ID,
  DEFAULT_CHAPTER_NUMBER,
} from "../managers/BibleReadingManager";
import type { TabSlotLayoutId } from "../managers/TabsLayoutManager";

// localStorage key holding the reader's non-ephemeral tab state so it survives a
// browser refresh or a later revisit. Mirrors the pattern in ConfigManager.
const TABS_STORAGE_KEY = "sb-tabs-state";

// Bump when the persisted shape changes incompatibly; a stored blob with a
// different version is ignored (treated as "no stored state").
const TABS_STORAGE_VERSION = 1;

/**
 * A single reader tab, reduced to the values worth persisting. Ephemeral state
 * (highlights, decorations, selected verses, scroll position, discovered
 * content, shared sessions) is intentionally omitted.
 */
export interface PersistedTab {
  /** Stable tab id (for example: tab-1). */
  id: string;
  /** Selected translation id. */
  translationId: string;
  /** Selected book id (for example: GEN), or null when unresolved. */
  bookId: string | null;
  /** Selected 1-based chapter number. */
  chapterNumber: number;
  /**
   * True for a hidden clone that only backs a split-pane slot (never shown in
   * the tab strip). Restored so a split layout comes back intact.
   */
  slotOnly?: boolean;
}

/** The whole persisted tab state: tabs, selection, and pane layout. */
export interface PersistedTabsState {
  version: number;
  tabs: PersistedTab[];
  /** Id of the selected tab. */
  selectedTabId: string;
  /** Active slot layout preset. */
  layout: TabSlotLayoutId;
  /** Tab id occupying each slot, in slot order (null for an empty slot). */
  slotTabIds: (string | null)[];
  /** Index (into `slotTabIds`) of the selected slot, or null. */
  selectedSlotIndex: number | null;
}

/** Reading parameters read from the URL, before any defaulting. */
export interface QueryReadingParams {
  /** Explicit translation (`translationId` or `translation`), or null. */
  translationId: string | null;
  /** Explicit book id, or null. */
  bookId: string | null;
  /** Explicit chapter number, or null when absent/invalid. */
  chapter: number | null;
  /** True when the URL carried any of translation/book/chapter. */
  specified: boolean;
}

function isPersistedTab(value: unknown): value is PersistedTab {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const tab = value as Record<string, unknown>;
  return (
    typeof tab.id === "string" &&
    typeof tab.translationId === "string" &&
    (tab.bookId === null || typeof tab.bookId === "string") &&
    typeof tab.chapterNumber === "number" &&
    Number.isFinite(tab.chapterNumber) &&
    tab.chapterNumber > 0 &&
    (tab.slotOnly === undefined || typeof tab.slotOnly === "boolean")
  );
}

function isPersistedTabsState(value: unknown): value is PersistedTabsState {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const state = value as Record<string, unknown>;
  return (
    state.version === TABS_STORAGE_VERSION &&
    Array.isArray(state.tabs) &&
    state.tabs.every(isPersistedTab) &&
    typeof state.selectedTabId === "string" &&
    typeof state.layout === "string" &&
    Array.isArray(state.slotTabIds) &&
    state.slotTabIds.every((id) => id === null || typeof id === "string") &&
    (state.selectedSlotIndex === null ||
      (typeof state.selectedSlotIndex === "number" &&
        Number.isFinite(state.selectedSlotIndex)))
  );
}

/**
 * Reads the persisted tab state from localStorage. Returns null during SSR, when
 * nothing is stored, or when the stored blob is malformed or from another
 * version — the caller then falls back to the default single-tab behavior.
 */
export function readStoredTabsState(): PersistedTabsState | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(TABS_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isPersistedTabsState(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    // Ignore malformed/unavailable storage.
    return null;
  }
}

/** Tab state to persist, without the storage `version` (stamped on write). */
export type PersistableTabsState = Omit<PersistedTabsState, "version">;

/**
 * Persists the tab state, stamping the current storage version.
 * Best-effort: no-op during SSR or on storage errors.
 */
export function writeStoredTabsState(state: PersistableTabsState): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const payload: PersistedTabsState = {
      ...state,
      version: TABS_STORAGE_VERSION,
    };
    window.localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Best-effort; losing the cache only means a default load next time.
  }
}

/**
 * Renames stored tab ids to a gap-free `tab-1..tab-N` by array order and remaps
 * `selectedTabId` + `slotTabIds` to match.
 *
 * `TabsManager.addTab` derives new ids from `tabs.length + 1`, which would
 * collide with a restored id when the stored ids have gaps (e.g. `tab-1`,
 * `tab-3` after the middle tab was closed). Normalizing on restore keeps ids
 * dense so a subsequent `addTab` can't collide, and gives both managers an
 * identical id space to agree on without sharing mutable state.
 */
export function normalizeStoredTabsState(
  state: PersistedTabsState | null
): PersistedTabsState | null {
  if (!state) {
    return null;
  }

  const idMap = new Map<string, string>();
  const tabs = state.tabs.map((tab, index) => {
    const nextId = `tab-${index + 1}`;
    idMap.set(tab.id, nextId);
    return { ...tab, id: nextId };
  });

  const selectedTabId =
    idMap.get(state.selectedTabId) ?? tabs[0]?.id ?? state.selectedTabId;

  const slotTabIds = state.slotTabIds.map((id) =>
    id === null ? null : (idMap.get(id) ?? null)
  );

  return { ...state, tabs, selectedTabId, slotTabIds };
}

/** Reads the reading parameters from a URL without applying any defaults. */
export function readQueryReadingParams(url: URL): QueryReadingParams {
  const translationId =
    url.searchParams.get("translationId") ??
    url.searchParams.get("translation");
  const bookId = url.searchParams.get("book");
  const chapterRaw = url.searchParams.get("chapter");
  const chapterValue = chapterRaw !== null ? Number(chapterRaw) : Number.NaN;
  const chapter =
    Number.isFinite(chapterValue) && chapterValue > 0
      ? Math.floor(chapterValue)
      : null;

  const specified =
    url.searchParams.has("translationId") ||
    url.searchParams.has("translation") ||
    url.searchParams.has("book") ||
    url.searchParams.has("chapter");

  return { translationId, bookId, chapter, specified };
}

/**
 * Reconciles the stored tabs with the URL's reading parameters, producing the
 * final ordered tab descriptors and the id of the tab to select.
 *
 * Matching, the single-tab update, and new-tab creation only consider *visible*
 * tabs (non-`slotOnly`); hidden slot clones are carried through untouched so a
 * split layout can be rebuilt.
 *
 * Logic:
 * - No reading params in the URL → keep the stored tabs and selection as-is.
 * - Params present → find the first visible tab matching the query translation
 *   (the query's translation, or `defaultTranslationId` when unspecified),
 *   preferring the currently-selected tab when it also matches so a plain
 *   refresh stays on the tab you were reading. Update that tab to the query
 *   book/chapter/translation and select it.
 * - No visible tab matches the translation → update the single visible tab if
 *   there is exactly one, otherwise append a new tab for the query and select it.
 *
 * Missing `book`/`chapter` default to `GEN`/`1`, matching how the app already
 * interprets a deep link.
 */
export function reconcileStoredTabs(
  state: PersistedTabsState,
  query: QueryReadingParams,
  defaultTranslationId: string
): { tabs: PersistedTab[]; selectedTabId: string } {
  const tabs = state.tabs.map((tab) => ({ ...tab }));

  if (!query.specified) {
    return { tabs, selectedTabId: state.selectedTabId };
  }

  const targetTranslation = query.translationId ?? defaultTranslationId;
  const targetBook = query.bookId ?? DEFAULT_BOOK_ID;
  const targetChapter = query.chapter ?? DEFAULT_CHAPTER_NUMBER;

  const applyQuery = (tab: PersistedTab): PersistedTab => ({
    ...tab,
    translationId: targetTranslation,
    bookId: targetBook,
    chapterNumber: targetChapter,
  });

  const isVisible = (tab: PersistedTab) => !tab.slotOnly;

  // Prefer the restored selected tab when it is visible and already on the
  // query translation (the plain-refresh case), before falling back to the
  // first visible translation match in order.
  const selectedTab =
    tabs.find((tab) => tab.id === state.selectedTabId) ?? null;
  const matchTab =
    selectedTab &&
    isVisible(selectedTab) &&
    selectedTab.translationId === targetTranslation
      ? selectedTab
      : (tabs.find(
          (tab) => isVisible(tab) && tab.translationId === targetTranslation
        ) ?? null);

  if (matchTab) {
    const index = tabs.indexOf(matchTab);
    tabs[index] = applyQuery(matchTab);
    return { tabs, selectedTabId: tabs[index]!.id };
  }

  const visibleTabs = tabs.filter(isVisible);
  if (visibleTabs.length === 1) {
    const index = tabs.indexOf(visibleTabs[0]!);
    tabs[index] = applyQuery(tabs[index]!);
    return { tabs, selectedTabId: tabs[index]!.id };
  }

  const newTab: PersistedTab = {
    id: `tab-${tabs.length + 1}`,
    translationId: targetTranslation,
    bookId: targetBook,
    chapterNumber: targetChapter,
  };
  tabs.push(newTab);
  return { tabs, selectedTabId: newTab.id };
}
