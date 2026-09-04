import {
  computed,
  effect,
  signal,
  type ReadonlySignal,
  type Signal,
} from "@preact/signals";
import * as z from "zod/v4";
import type { LoginManager } from "../managers/LoginManager";
import type { CasualOSManager } from "./OsManager";
import { captureEvent } from "./Utils";

/**
 * Verse target for a save: a single verse number or an inclusive `[start, end]`
 * range. Absent when the save refers to a whole chapter.
 */
export const saveVerseSchema = z.union([
  z.number().int().positive(),
  z
    .tuple([z.number().int().positive(), z.number().int().positive()])
    .refine(([start, end]) => start <= end, {
      message: "Verse range start must be less than or equal to end.",
    }),
]);

/**
 * Schema for one save entry.
 *
 * A save is an archival reference to a Bible location (translation + book +
 * chapter, optionally narrowed to a single verse or `[start, end]` range) that
 * a user filed away from a tab, the reader header, or the verse toolbar. The
 * passage a save points at never changes — refiling it between categories is
 * expected, repointing it is not. Saves are persisted per user under the
 * `"saves"` storage key so they survive across sessions / devices and are
 * restored when the user logs back in. Each save belongs to one or more
 * categories (folders); newly added saves land in the default category unless
 * the user picks others.
 */
export const saveSchema = z.object({
  id: z.string().min(1),
  translationId: z.string().min(1),
  bookId: z.string().min(1),
  chapterNumber: z.number().int().positive(),
  verse: saveVerseSchema.optional(),
  createdAt: z.number().int().nonnegative(),
  categories: z.array(z.string().min(1)).min(1),
});

export const saveCategorySchema = z.object({
  name: z.string().min(1),
});

/**
 * Pre-rename category field: a single folder name or a list of them. Read
 * only — `normalizeSaves` folds it into `categories` on load.
 */
const legacyCategoryFieldSchema = z.union([
  z.string().min(1),
  z.array(z.string().min(1)).min(1),
]);

// Persisted shape accepts payloads that predate the `categories` array, the
// `verse` field, and the `categories` list. We normalize them on load before
// they ever surface to the rest of the app.
const persistedSaveSchema = saveSchema.extend({
  categories: z.array(z.string().min(1)).optional(),
  category: legacyCategoryFieldSchema.optional(),
  verse: saveVerseSchema.optional(),
});

/** Canonical payload, used when writing. */
export const savesPayloadSchema = z.object({
  saves: z.array(saveSchema),
  categories: z.array(saveCategorySchema).optional(),
});

/** Tolerant read-side view of the same record. */
const persistedSavesPayloadSchema = z.object({
  saves: z.array(persistedSaveSchema),
  categories: z.array(saveCategorySchema).optional(),
});

/** Payload shape at {@link LEGACY_SAVES_ADDRESS}, before the rename. */
const legacySavesPayloadSchema = z.object({
  bookmarks: z.array(persistedSaveSchema),
  categories: z.array(saveCategorySchema).optional(),
});

export type Save = z.infer<typeof saveSchema>;
export type SaveVerse = z.infer<typeof saveVerseSchema>;
export type SaveCategory = z.infer<typeof saveCategorySchema>;
export type SavesPayload = z.infer<typeof savesPayloadSchema>;

type PersistedSave = z.infer<typeof persistedSaveSchema>;
type LegacySavesPayload = z.infer<typeof legacySavesPayloadSchema>;
type RecordResult = Awaited<ReturnType<CasualOSManager["getData"]>>;

const STORAGE_ADDRESS = "saves";

/**
 * Where saves lived before they were called saves. Read-only: a user with no
 * `saves` record yet has this one copied forward to {@link STORAGE_ADDRESS},
 * after which nothing writes here again. The record itself is never erased, so
 * a rollback costs nothing. Removed in #1659.
 */
const LEGACY_SAVES_ADDRESS = "bookmarks";

/** Category every new save lands in if none is specified. */
export const DEFAULT_SAVE_CATEGORY = "My Saves";

/**
 * The default folder's pre-rename name. The copy-forward maps it onto
 * {@link DEFAULT_SAVE_CATEGORY} so a migrated user ends up with one default
 * folder instead of a full "My Bookmarks" sitting beside an empty "My Saves".
 */
const LEGACY_DEFAULT_SAVE_CATEGORY = "My Bookmarks";

/**
 * Cleans a list of category names for storage: trims, drops blanks and
 * duplicates, and falls back to the default category when nothing is left (a
 * save with no folder would have nowhere to live).
 */
export function normalizeSaveCategories(
  categories: readonly string[]
): string[] {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const raw of categories) {
    const name = raw.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    unique.push(name);
  }
  return unique.length === 0 ? [DEFAULT_SAVE_CATEGORY] : unique;
}

/**
 * True when `save` is a member of the given category name.
 */
export function saveBelongsToCategory(
  save: Save,
  categoryName: string
): boolean {
  return save.categories.includes(categoryName);
}

function makeSaveId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `save-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function saveMatchesChapter(
  save: Save,
  translationId: string | null | undefined,
  bookId: string | null | undefined,
  chapterNumber: number | null | undefined
): boolean {
  if (!translationId || !bookId || !chapterNumber) {
    return false;
  }
  return (
    save.translationId === translationId &&
    save.bookId === bookId &&
    save.chapterNumber === chapterNumber
  );
}

/**
 * True when `save` targets the exact same chapter + verse(s) as the given
 * location. A save with no `verse` field only matches a chapter-level
 * location query (verse=undefined).
 */
function saveMatchesLocation(
  save: Save,
  translationId: string | null | undefined,
  bookId: string | null | undefined,
  chapterNumber: number | null | undefined,
  verse?: SaveVerse
): boolean {
  if (!saveMatchesChapter(save, translationId, bookId, chapterNumber)) {
    return false;
  }
  return versesEqual(save.verse, verse);
}

function versesEqual(
  a: SaveVerse | undefined,
  b: SaveVerse | undefined
): boolean {
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;
  if (typeof a === "number" && typeof b === "number") return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a[0] === b[0] && a[1] === b[1];
  }
  return false;
}

/** The category names a persisted item carries, in either storage form. */
function persistedCategoryNames(item: PersistedSave): string[] {
  if (item.categories !== undefined) {
    return item.categories;
  }
  if (item.category === undefined) {
    return [];
  }
  return typeof item.category === "string" ? [item.category] : item.category;
}

/**
 * Migrates raw persisted items and folders into the current shape:
 *   - the single-name-or-list `category` field folds into `categories`
 *   - items without any category get assigned the default
 *   - any category referenced by an item but missing from `categories`
 *     gets appended, preserving order
 *   - the default category is always present (added first if absent) so the
 *     user can drop saves into it on first run
 *
 * `renameCategory` lets the legacy copy-forward map the old default folder name
 * onto the new one; it is identity for records already at `saves`.
 */
function normalizeSaves(
  items: readonly PersistedSave[],
  persistedCategories: readonly SaveCategory[] | undefined,
  renameCategory: (name: string) => string = (name) => name
): { saves: Save[]; categories: SaveCategory[] } {
  const saves: Save[] = items.map((item) => {
    const { category: _legacyCategory, ...rest } = item;
    return {
      ...rest,
      categories: normalizeSaveCategories(
        persistedCategoryNames(item).map(renameCategory)
      ),
    };
  });

  const categories: SaveCategory[] = [];
  const seen = new Set<string>();
  for (const category of persistedCategories ?? []) {
    const name = renameCategory(category.name);
    if (seen.has(name)) continue;
    seen.add(name);
    categories.push({ name });
  }

  if (!seen.has(DEFAULT_SAVE_CATEGORY)) {
    categories.unshift({ name: DEFAULT_SAVE_CATEGORY });
    seen.add(DEFAULT_SAVE_CATEGORY);
  }

  for (const save of saves) {
    for (const name of save.categories) {
      if (!seen.has(name)) {
        categories.push({ name });
        seen.add(name);
      }
    }
  }

  return { saves, categories };
}

/** Maps the pre-rename default folder name onto the current one. */
function renameLegacyDefaultCategory(name: string): string {
  return name === LEGACY_DEFAULT_SAVE_CATEGORY ? DEFAULT_SAVE_CATEGORY : name;
}

/**
 * What a read of a record actually established.
 *
 * `absent` is a fact about the record: the server answered, and there is
 * nothing at that address. `error` means we never found out — the request
 * failed, or what came back wasn't a saves payload. Keeping them apart is what
 * stops a transient read failure from looking like a brand-new user.
 */
type RecordRead<T> =
  | { status: "found"; value: T }
  | { status: "absent" }
  | { status: "error" };

function readRecord<T>(
  result: RecordResult | undefined,
  schema: z.ZodType<T>,
  label: string
): RecordRead<T> {
  if (!result) {
    return { status: "error" };
  }
  if (!result.success) {
    // `data_not_found` is the only failure that means "there is no record
    // here". A server error, a rate limit, or an expired token all leave the
    // question open, so they are errors rather than absences.
    return result.errorCode === "data_not_found"
      ? { status: "absent" }
      : { status: "error" };
  }
  if (result.data === undefined || result.data === null) {
    return { status: "absent" };
  }
  const parsed = schema.safeParse(result.data);
  if (!parsed.success) {
    console.warn(`Failed to parse ${label} payload:`, parsed.error);
    return { status: "error" };
  }
  return { status: "found", value: parsed.data };
}

export interface SavesManager {
  /** All saves for the current user. Empty array when logged out. */
  saves: ReadonlySignal<Save[]>;

  /** Ordered list of save categories (folders). */
  categories: ReadonlySignal<SaveCategory[]>;

  /**
   * Names of categories the user has expanded in the sidebar. Held in memory
   * only — not persisted, since the user's view preference resets per session.
   */
  expandedCategories: ReadonlySignal<ReadonlySet<string>>;

  /**
   * Whether the saves list is currently open in the sidebar — when true, the
   * sidebar shows the saves list instead of the open tabs list. The name is
   * kept for backwards compatibility with the header toggle.
   */
  isFilterActive: Signal<boolean>;

  /**
   * Whether the saves view was opened from the bottom toolbar (as opposed to
   * the Tabs header toggle). On mobile this decides the header's leading
   * button: a Close (X) that dismisses the whole drawer when opened from the
   * toolbar, versus a Back arrow that returns to the Tabs list otherwise.
   */
  openedFromToolbar: Signal<boolean>;

  /** Toggles the saves view on/off. */
  toggleFilter: () => void;

  /** Closes the saves view. Used after navigating from a save. */
  closeView: () => void;

  /** Toggles whether a category is expanded in the sidebar. */
  toggleCategoryExpanded: (name: string) => void;

  /**
   * Returns true if a save exists for the given location. When `verse` is
   * omitted, only chapter-level saves (no verse field) count as a match.
   * Reactive — re-evaluates when `saves` or login state changes.
   */
  isLocationSaved: (
    translationId: string | null | undefined,
    bookId: string | null | undefined,
    chapterNumber: number | null | undefined,
    verse?: SaveVerse
  ) => boolean;

  /**
   * Returns the save filed at the given location, or undefined when there is
   * none. Matches on the same rules as `isLocationSaved` — callers that need
   * the save's id (to edit its folders, say) use this instead of re-deriving
   * the match themselves.
   */
  getSaveForLocation: (
    translationId: string | null | undefined,
    bookId: string | null | undefined,
    chapterNumber: number | null | undefined,
    verse?: SaveVerse
  ) => Save | undefined;

  /**
   * Adds the given location as a save if not already filed.
   * Requires the user to be logged in; will trigger login otherwise.
   * Defaults to the default category when none is provided. Pass `verse` to
   * scope the save to a single verse or `[start, end]` range.
   */
  addSave: (
    translationId: string,
    bookId: string,
    chapterNumber: number,
    options?: { verse?: SaveVerse; categories?: readonly string[] }
  ) => Promise<void>;

  /** Removes a specific save by id, from every category it belongs to. */
  removeSave: (id: string) => Promise<void>;

  /**
   * Drops a save's membership in a single category. The save itself is only
   * deleted when that category was its last one. No-op when the save id is
   * unknown or it does not belong to the category.
   */
  removeSaveFromCategory: (id: string, categoryName: string) => Promise<void>;

  /**
   * Sets the categories an existing save belongs to (creating any missing
   * categories). No-op when the save id is unknown, the list is empty, or the
   * membership list is unchanged.
   */
  setSaveCategories: (
    id: string,
    categories: readonly string[]
  ) => Promise<void>;

  /** Creates a new (empty) category. No-op if one with that name exists. */
  createCategory: (name: string) => Promise<void>;

  /**
   * Renames a category and updates every save that belongs to it. No-op if the
   * target name is already taken (other than by the category itself).
   */
  renameCategory: (oldName: string, newName: string) => Promise<void>;

  /**
   * Deletes a category. Saves that only belonged to it are removed; saves that
   * also belong to other categories keep those memberships. The default
   * category cannot be deleted — it stays as the always-available landing
   * folder.
   */
  deleteCategory: (name: string) => Promise<void>;
}

export function createSavesManager(
  os: CasualOSManager,
  login: LoginManager
): SavesManager {
  const saves = signal<Save[]>([]);
  const categories = signal<SaveCategory[]>([{ name: DEFAULT_SAVE_CATEGORY }]);
  const expandedCategories = signal<ReadonlySet<string>>(
    new Set([DEFAULT_SAVE_CATEGORY])
  );
  const isFilterActive = signal(false);
  const openedFromToolbar = signal(false);
  const loadedUserId = signal<string | null>(null);

  /**
   * The initial load for the current user, while it is still in flight.
   * Mutators wait on it before touching state: a save added during the round
   * trip would otherwise be overwritten when the load applies, and on a
   * migrating user that also costs the copy-forward.
   */
  let loadPromise: Promise<void> | null = null;
  const whenLoaded = async (): Promise<void> => {
    const pending = loadPromise;
    if (pending) {
      await pending;
    }
  };

  const readSaves: ReadonlySignal<Save[]> = computed(() => saves.value);
  const readCategories: ReadonlySignal<SaveCategory[]> = computed(
    () => categories.value
  );
  const readExpanded: ReadonlySignal<ReadonlySet<string>> = computed(
    () => expandedCategories.value
  );

  const writeSaves = async (
    userId: string,
    nextSaves: Save[],
    nextCategories: SaveCategory[]
  ): Promise<void> => {
    const payload = savesPayloadSchema.parse({
      saves: nextSaves,
      categories: nextCategories,
    });
    await os.recordData(userId, STORAGE_ADDRESS, payload, {
      marker: "publicRead",
    });
  };

  /**
   * Flags the one case the migration deliberately does not handle: a tab still
   * running pre-rename code writing to the legacy record after this user has
   * already migrated. Those writes are invisible to the new client (never
   * destroyed — the legacy record is kept), and #1659 uses this event to decide
   * when contracting is safe.
   *
   * An upper bound, not an exact count: a save the new client deleted after the
   * migration also reads as "in legacy, absent from saves". Deletions are far
   * rarer than the alternative would be noisy, and the point of the event is to
   * confirm the number sits at zero.
   */
  const reportLegacyDivergence = (
    currentSaves: readonly Save[],
    legacy: LegacySavesPayload | null
  ): void => {
    if (!legacy) return;
    const known = new Set(currentSaves.map((save) => save.id));
    const orphanCount = legacy.bookmarks.filter(
      (item) => !known.has(item.id)
    ).length;
    if (orphanCount === 0) return;
    captureEvent("saves_legacy_record_diverged", {
      orphanCount,
      legacyCount: legacy.bookmarks.length,
      saveCount: currentSaves.length,
    });
  };

  const loadSaves = async (userId: string): Promise<void> => {
    // The legacy record is fetched even when `saves` exists, purely so
    // `reportLegacyDivergence` can run. Both reads go out together, so the
    // extra address costs a request but no added latency.
    const [currentData, legacyData] = await Promise.all([
      os.getData(userId, STORAGE_ADDRESS),
      os.getData(userId, LEGACY_SAVES_ADDRESS),
    ]);
    if (loadedUserId.value !== userId && login.userId.value !== userId) {
      return;
    }

    const apply = (normalized: {
      saves: Save[];
      categories: SaveCategory[];
    }) => {
      saves.value = normalized.saves;
      categories.value = normalized.categories;
      loadedUserId.value = userId;
    };

    const legacy = readRecord(
      legacyData,
      legacySavesPayloadSchema,
      "legacy saves"
    );
    const current = readRecord(
      currentData,
      persistedSavesPayloadSchema,
      "saves"
    );

    if (current.status === "found") {
      const normalized = normalizeSaves(
        current.value.saves,
        current.value.categories
      );
      apply(normalized);
      reportLegacyDivergence(
        normalized.saves,
        legacy.status === "found" ? legacy.value : null
      );
      return;
    }

    if (current.status === "error" || legacy.status === "error") {
      // A read that failed is not a record that is absent, and the difference
      // is the whole migration. Copying the legacy record forward here would
      // write a pre-migration snapshot over a `saves` record that is very
      // likely still there — every migrated user keeps a readable legacy
      // record until #1659, so one hiccup on the `saves` read would cost them
      // every save made since they migrated. Applying an empty list is no
      // better: it shows the user nothing and lets the next save overwrite a
      // record we never managed to read.
      //
      // So: change nothing, leave the user unloaded, and let the next load
      // (a refresh, or signing back in) try again.
      console.warn(
        "Could not read the saves records; leaving saves untouched until the next load."
      );
      return;
    }

    if (legacy.status === "found") {
      // A pure copy-forward of the legacy payload — nothing from memory folds
      // in. That is what makes it safe for two tabs to migrate the same user at
      // once: identical input, identical output, so whichever write lands last
      // is the same bytes as the other.
      const normalized = normalizeSaves(
        legacy.value.bookmarks,
        legacy.value.categories,
        renameLegacyDefaultCategory
      );
      apply(normalized);
      try {
        await writeSaves(userId, normalized.saves, normalized.categories);
        captureEvent("saves_migrated_from_legacy_bookmarks", {
          saveCount: normalized.saves.length,
          categoryCount: normalized.categories.length,
        });
      } catch (err) {
        // Leave the legacy record alone and retry on the next load rather than
        // surfacing an error — the user still has their saves in memory.
        console.warn("Failed to migrate saves forward:", err);
      }
      return;
    }

    apply({ saves: [], categories: [{ name: DEFAULT_SAVE_CATEGORY }] });
  };

  const persist = async (
    nextSaves: Save[],
    nextCategories: SaveCategory[]
  ): Promise<void> => {
    const userId = login.userId.value;
    if (!userId) {
      console.warn("Cannot persist saves: user is not authenticated.");
      return;
    }
    if (loadedUserId.value !== userId) {
      // The stored record never loaded (see the error branch in `loadSaves`),
      // so what is in memory is not this user's list. Writing it would replace
      // a record we could not read with a nearly empty one. Dropping the
      // change is the recoverable failure; the write is not.
      console.warn(
        "Cannot persist saves: the stored record has not loaded for this user."
      );
      return;
    }
    await writeSaves(userId, nextSaves, nextCategories);
  };

  effect(() => {
    const userId = login.userId.value;
    if (!userId) {
      saves.value = [];
      categories.value = [{ name: DEFAULT_SAVE_CATEGORY }];
      expandedCategories.value = new Set([DEFAULT_SAVE_CATEGORY]);
      loadedUserId.value = null;
      loadPromise = null;
      isFilterActive.value = false;
      return;
    }
    if (loadedUserId.value === userId) {
      return;
    }
    loadPromise = loadSaves(userId);
    void loadPromise;
  });

  const getSaveForLocation: SavesManager["getSaveForLocation"] = (
    translationId,
    bookId,
    chapterNumber,
    verse
  ) => {
    return saves.value.find((save) =>
      saveMatchesLocation(save, translationId, bookId, chapterNumber, verse)
    );
  };

  const isLocationSaved: SavesManager["isLocationSaved"] = (
    translationId,
    bookId,
    chapterNumber,
    verse
  ) => {
    return (
      getSaveForLocation(translationId, bookId, chapterNumber, verse) !==
      undefined
    );
  };

  const ensureCategory = (
    nextCategories: SaveCategory[],
    name: string
  ): SaveCategory[] => {
    if (nextCategories.some((c) => c.name === name)) {
      return nextCategories;
    }
    return [...nextCategories, { name }];
  };

  const addSave: SavesManager["addSave"] = async (
    translationId,
    bookId,
    chapterNumber,
    options
  ) => {
    if (!login.userId.value) {
      await login.login();
    }
    if (!login.userId.value) {
      return;
    }
    await whenLoaded();
    const verse = options?.verse;
    if (isLocationSaved(translationId, bookId, chapterNumber, verse)) {
      return;
    }
    const categoryNames = normalizeSaveCategories(options?.categories ?? []);
    const newSave: Save = {
      id: makeSaveId(),
      translationId,
      bookId,
      chapterNumber,
      createdAt: Date.now(),
      categories: categoryNames,
      ...(verse !== undefined ? { verse } : {}),
    };
    const nextSaves: Save[] = [...saves.value, newSave];
    let nextCategories = categories.value;
    for (const name of categoryNames) {
      nextCategories = ensureCategory(nextCategories, name);
    }
    saves.value = nextSaves;
    categories.value = nextCategories;
    // Auto-expand every category that just received a save so the user sees the
    // new entry without having to click open the folder.
    const nextExpanded = new Set(expandedCategories.value);
    for (const name of categoryNames) {
      nextExpanded.add(name);
    }
    expandedCategories.value = nextExpanded;
    await persist(nextSaves, nextCategories);
  };

  const removeSave: SavesManager["removeSave"] = async (id) => {
    await whenLoaded();
    const next = saves.value.filter((save) => save.id !== id);
    if (next.length === saves.value.length) {
      return;
    }
    saves.value = next;
    await persist(next, categories.value);
  };

  const removeSaveFromCategory: SavesManager["removeSaveFromCategory"] = async (
    id,
    categoryName
  ) => {
    await whenLoaded();
    const existing = saves.value.find((save) => save.id === id);
    if (!existing) return;
    if (!existing.categories.includes(categoryName)) return;

    const remaining = existing.categories.filter(
      (name) => name !== categoryName
    );
    const next =
      remaining.length === 0
        ? saves.value.filter((save) => save.id !== id)
        : saves.value.map((save) =>
            save.id === id ? { ...save, categories: remaining } : save
          );
    saves.value = next;
    await persist(next, categories.value);
  };

  const setSaveCategories: SavesManager["setSaveCategories"] = async (
    id,
    nextCategoryNames
  ) => {
    // An empty list is a no-op rather than a delete: a save with no folder has
    // nowhere to live, and callers that mean "delete" have `removeSave`.
    if (nextCategoryNames.length === 0) return;
    await whenLoaded();
    const nextNames = normalizeSaveCategories(nextCategoryNames);

    const existing = saves.value.find((save) => save.id === id);
    if (!existing) return;

    const sameMembership =
      existing.categories.length === nextNames.length &&
      nextNames.every((name) => existing.categories.includes(name));
    if (sameMembership) {
      return;
    }

    let nextCategories = categories.value;
    for (const name of nextNames) {
      nextCategories = ensureCategory(nextCategories, name);
    }
    const nextSaves = saves.value.map((save) =>
      save.id === id ? { ...save, categories: nextNames } : save
    );
    saves.value = nextSaves;
    categories.value = nextCategories;
    const nextExpanded = new Set(expandedCategories.value);
    for (const name of nextNames) {
      nextExpanded.add(name);
    }
    expandedCategories.value = nextExpanded;
    await persist(nextSaves, nextCategories);
  };

  const toggleFilter = () => {
    isFilterActive.value = !isFilterActive.value;
  };

  const closeView = () => {
    isFilterActive.value = false;
    openedFromToolbar.value = false;
  };

  const toggleCategoryExpanded: SavesManager["toggleCategoryExpanded"] = (
    name
  ) => {
    const next = new Set(expandedCategories.value);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    expandedCategories.value = next;
  };

  const createCategory: SavesManager["createCategory"] = async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await whenLoaded();
    if (categories.value.some((c) => c.name === trimmed)) {
      return;
    }
    const nextCategories = [...categories.value, { name: trimmed }];
    categories.value = nextCategories;
    const nextExpanded = new Set(expandedCategories.value);
    nextExpanded.add(trimmed);
    expandedCategories.value = nextExpanded;
    await persist(saves.value, nextCategories);
  };

  const renameCategory: SavesManager["renameCategory"] = async (
    oldName,
    newName
  ) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    await whenLoaded();
    if (!categories.value.some((c) => c.name === oldName)) return;
    if (categories.value.some((c) => c.name === trimmed)) {
      // Target name collides with an existing category — skip to keep names
      // unique (which the rest of the manager relies on for lookup).
      return;
    }
    const nextCategories = categories.value.map((c) =>
      c.name === oldName ? { ...c, name: trimmed } : c
    );
    const nextSaves = saves.value.map((save) => {
      if (!save.categories.includes(oldName)) {
        return save;
      }
      return {
        ...save,
        categories: normalizeSaveCategories(
          save.categories.map((n) => (n === oldName ? trimmed : n))
        ),
      };
    });
    categories.value = nextCategories;
    saves.value = nextSaves;
    const nextExpanded = new Set(expandedCategories.value);
    if (nextExpanded.delete(oldName)) {
      nextExpanded.add(trimmed);
    }
    expandedCategories.value = nextExpanded;
    await persist(nextSaves, nextCategories);
  };

  const deleteCategory: SavesManager["deleteCategory"] = async (name) => {
    if (name === DEFAULT_SAVE_CATEGORY) {
      // The default folder always exists as the landing spot for new saves;
      // treat deletion as a no-op rather than silently moving its contents
      // elsewhere.
      return;
    }
    await whenLoaded();
    if (!categories.value.some((c) => c.name === name)) return;
    const nextCategories = categories.value.filter((c) => c.name !== name);
    const nextSaves: Save[] = [];
    for (const save of saves.value) {
      if (!save.categories.includes(name)) {
        nextSaves.push(save);
        continue;
      }
      const remaining = save.categories.filter((n) => n !== name);
      if (remaining.length === 0) {
        // Sole membership was the deleted folder — drop the save.
        continue;
      }
      nextSaves.push({ ...save, categories: remaining });
    }
    categories.value = nextCategories;
    saves.value = nextSaves;
    const nextExpanded = new Set(expandedCategories.value);
    nextExpanded.delete(name);
    expandedCategories.value = nextExpanded;
    await persist(nextSaves, nextCategories);
  };

  // Dev-only: mirrors the list to the console whenever it changes, so folder
  // membership is visible while working on Saves without opening the record.
  // The live manager is also on `window.__seedBible.saves` (see app/main.tsx).
  //
  // Excluded from SSR (no `window`) and from vitest, which also runs as DEV —
  // without the mode check every suite that builds a SeedBibleState logs.
  if (
    import.meta.env.DEV &&
    import.meta.env.MODE !== "test" &&
    typeof window !== "undefined"
  ) {
    effect(() => {
      console.log("[saves]", saves.value);
    });
  }

  return {
    saves: readSaves,
    categories: readCategories,
    expandedCategories: readExpanded,
    isFilterActive,
    openedFromToolbar,
    toggleFilter,
    closeView,
    toggleCategoryExpanded,
    isLocationSaved,
    getSaveForLocation,
    addSave,
    removeSave,
    removeSaveFromCategory,
    setSaveCategories,
    createCategory,
    renameCategory,
    deleteCategory,
  };
}
