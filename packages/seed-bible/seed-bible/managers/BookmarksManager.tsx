import {
  computed,
  effect,
  signal,
  type ReadonlySignal,
  type Signal,
} from "@preact/signals";
import { z } from "zod";
import type { LoginManager } from "seed-bible.managers.LoginManager";
import type { ReaderTab } from "seed-bible.managers.TabsManager";

/**
 * Schema for one bookmark entry.
 *
 * A bookmark is a saved Bible location (translation + book + chapter) that a
 * user has flagged from a tab. It is persisted per user under the
 * `"bookmarks"` storage key so it survives across sessions / devices and is
 * restored when the user logs back in. Each bookmark belongs to exactly one
 * category (folder) — newly added bookmarks land in the default category and
 * can be moved or grouped from there.
 */
export const bookmarkSchema = z.object({
  id: z.string().min(1),
  translationId: z.string().min(1),
  bookId: z.string().min(1),
  chapterNumber: z.number().int().positive(),
  createdAt: z.number().int().nonnegative(),
  category: z.string().min(1),
});

export const bookmarkCategorySchema = z.object({
  name: z.string().min(1),
});

// Persisted shape accepts legacy payloads that predate the `category` field
// and the `categories` list. We normalize them on load before they ever
// surface to the rest of the app.
const persistedBookmarkSchema = bookmarkSchema.extend({
  category: z.string().min(1).optional(),
});

export const bookmarksPayloadSchema = z.object({
  bookmarks: z.array(persistedBookmarkSchema),
  categories: z.array(bookmarkCategorySchema).optional(),
});

export type Bookmark = z.infer<typeof bookmarkSchema>;
export type BookmarkCategory = z.infer<typeof bookmarkCategorySchema>;
export type BookmarksPayload = z.infer<typeof bookmarksPayloadSchema>;

const STORAGE_ADDRESS = "bookmarks";

/** Category every new bookmark lands in if none is specified. */
export const DEFAULT_BOOKMARK_CATEGORY = "My Bookmarks";

function makeBookmarkId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `bm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function bookmarkMatchesLocation(
  bookmark: Bookmark,
  translationId: string | null | undefined,
  bookId: string | null | undefined,
  chapterNumber: number | null | undefined
): boolean {
  if (!translationId || !bookId || !chapterNumber) {
    return false;
  }
  return (
    bookmark.translationId === translationId &&
    bookmark.bookId === bookId &&
    bookmark.chapterNumber === chapterNumber
  );
}

/**
 * Migrates a raw persisted payload into the current shape:
 *   - bookmarks without a `category` get assigned the default
 *   - any category referenced by a bookmark but missing from `categories`
 *     gets appended, preserving order
 *   - the default category is always present (added first if absent) so the
 *     user can drop bookmarks into it on first run
 */
function normalizePayload(payload: BookmarksPayload): {
  bookmarks: Bookmark[];
  categories: BookmarkCategory[];
} {
  const bookmarks: Bookmark[] = payload.bookmarks.map((b) => ({
    ...b,
    category: b.category ?? DEFAULT_BOOKMARK_CATEGORY,
  }));

  const categories: BookmarkCategory[] = (payload.categories ?? []).map(
    (c) => ({
      name: c.name,
    })
  );
  const seen = new Set(categories.map((c) => c.name));

  if (!seen.has(DEFAULT_BOOKMARK_CATEGORY)) {
    categories.unshift({ name: DEFAULT_BOOKMARK_CATEGORY });
    seen.add(DEFAULT_BOOKMARK_CATEGORY);
  }

  for (const bookmark of bookmarks) {
    if (!seen.has(bookmark.category)) {
      categories.push({ name: bookmark.category });
      seen.add(bookmark.category);
    }
  }

  return { bookmarks, categories };
}

export interface BookmarksManager {
  /**
   * Whether the bookmarks feature is enabled.
   */
  enabled: ReadonlySignal<boolean>;

  /** All bookmarks for the current user. Empty array when logged out. */
  bookmarks: ReadonlySignal<Bookmark[]>;

  /** Ordered list of bookmark categories (folders). */
  categories: ReadonlySignal<BookmarkCategory[]>;

  /**
   * Names of categories the user has expanded in the sidebar. Held in memory
   * only — not persisted, since the user's view preference resets per session.
   */
  expandedCategories: ReadonlySignal<ReadonlySet<string>>;

  /** Whether the bookmarks view is currently active in the sidebar. */
  isFilterActive: Signal<boolean>;

  /** Toggles the bookmarks view on/off. */
  toggleFilter: () => void;

  /** Toggles whether a category is expanded in the sidebar. */
  toggleCategoryExpanded: (name: string) => void;

  /**
   * Returns true if the given location currently has a saved bookmark.
   * Reactive — re-evaluates when `bookmarks` or login state changes.
   */
  isLocationBookmarked: (
    translationId: string | null | undefined,
    bookId: string | null | undefined,
    chapterNumber: number | null | undefined
  ) => boolean;

  /**
   * Adds the given location as a bookmark if not already saved.
   * Requires the user to be logged in; will trigger login otherwise.
   * Defaults to the default category when none is provided.
   */
  addBookmark: (
    translationId: string,
    bookId: string,
    chapterNumber: number,
    category?: string
  ) => Promise<void>;

  /** Removes the bookmark matching the given location (if any). */
  removeBookmarkForLocation: (
    translationId: string,
    bookId: string,
    chapterNumber: number
  ) => Promise<void>;

  /** Removes a specific bookmark by id. */
  removeBookmark: (id: string) => Promise<void>;

  /**
   * Toggles the bookmark for a tab's current location. If the user is not
   * logged in this triggers a login first. Newly added bookmarks land in
   * the default category.
   */
  toggleBookmarkForTab: (tab: ReaderTab) => Promise<void>;

  /**
   * Toggles the bookmark at the given location. Same login-on-add behavior
   * as `toggleBookmarkForTab` but takes a raw location instead of a tab —
   * used by the reader header.
   */
  toggleBookmarkAtLocation: (
    translationId: string | null | undefined,
    bookId: string | null | undefined,
    chapterNumber: number | null | undefined
  ) => Promise<void>;

  /** Creates a new (empty) category. No-op if one with that name exists. */
  createCategory: (name: string) => Promise<void>;

  /**
   * Renames a category and updates every bookmark inside it. No-op if the
   * target name is already taken (other than by the category itself).
   */
  renameCategory: (oldName: string, newName: string) => Promise<void>;

  /**
   * Deletes a category and every bookmark inside it. The default category
   * cannot be deleted — it stays as the always-available landing folder.
   */
  deleteCategory: (name: string) => Promise<void>;
}

export function createBookmarksManager(login: LoginManager): BookmarksManager {
  const enabled = signal<boolean>(false);
  const bookmarks = signal<Bookmark[]>([]);
  const categories = signal<BookmarkCategory[]>([
    { name: DEFAULT_BOOKMARK_CATEGORY },
  ]);
  const expandedCategories = signal<ReadonlySet<string>>(
    new Set([DEFAULT_BOOKMARK_CATEGORY])
  );
  const isFilterActive = signal(false);
  const loadedUserId = signal<string | null>(null);

  const readBookmarks: ReadonlySignal<Bookmark[]> = computed(
    () => bookmarks.value
  );
  const readCategories: ReadonlySignal<BookmarkCategory[]> = computed(
    () => categories.value
  );
  const readExpanded: ReadonlySignal<ReadonlySet<string>> = computed(
    () => expandedCategories.value
  );

  const loadBookmarks = async (userId: string): Promise<void> => {
    const data = await os.getData(userId, STORAGE_ADDRESS);
    if (loadedUserId.value !== userId && login.userId.value !== userId) {
      return;
    }

    const setEmpty = () => {
      bookmarks.value = [];
      categories.value = [{ name: DEFAULT_BOOKMARK_CATEGORY }];
      loadedUserId.value = userId;
    };

    if (!data || !data.success || !data.data) {
      setEmpty();
      return;
    }

    const parsed = bookmarksPayloadSchema.safeParse(data.data);
    if (!parsed.success) {
      console.warn("Failed to parse bookmarks payload:", parsed.error);
      setEmpty();
      return;
    }

    const normalized = normalizePayload(parsed.data);
    bookmarks.value = normalized.bookmarks;
    categories.value = normalized.categories;
    loadedUserId.value = userId;
  };

  const persist = async (
    nextBookmarks: Bookmark[],
    nextCategories: BookmarkCategory[]
  ): Promise<void> => {
    const userId = authBot?.id;
    if (!userId) {
      console.warn("Cannot persist bookmarks: user is not authenticated.");
      return;
    }
    const payload = bookmarksPayloadSchema.parse({
      bookmarks: nextBookmarks,
      categories: nextCategories,
    });
    await os.recordData(userId, STORAGE_ADDRESS, payload, {
      marker: "publicRead",
    });
  };

  effect(() => {
    const userId = login.userId.value;
    if (!userId) {
      bookmarks.value = [];
      categories.value = [{ name: DEFAULT_BOOKMARK_CATEGORY }];
      expandedCategories.value = new Set([DEFAULT_BOOKMARK_CATEGORY]);
      loadedUserId.value = null;
      isFilterActive.value = false;
      return;
    }
    if (loadedUserId.value === userId) {
      return;
    }
    void loadBookmarks(userId);
  });

  const isLocationBookmarked: BookmarksManager["isLocationBookmarked"] = (
    translationId,
    bookId,
    chapterNumber
  ) => {
    return bookmarks.value.some((bookmark) =>
      bookmarkMatchesLocation(bookmark, translationId, bookId, chapterNumber)
    );
  };

  const ensureCategory = (
    nextCategories: BookmarkCategory[],
    name: string
  ): BookmarkCategory[] => {
    if (nextCategories.some((c) => c.name === name)) {
      return nextCategories;
    }
    return [...nextCategories, { name }];
  };

  const addBookmark: BookmarksManager["addBookmark"] = async (
    translationId,
    bookId,
    chapterNumber,
    category
  ) => {
    if (!login.userId.value) {
      await login.login();
    }
    if (!login.userId.value) {
      return;
    }
    if (isLocationBookmarked(translationId, bookId, chapterNumber)) {
      return;
    }
    const targetCategory = category ?? DEFAULT_BOOKMARK_CATEGORY;
    const nextBookmarks: Bookmark[] = [
      ...bookmarks.value,
      {
        id: makeBookmarkId(),
        translationId,
        bookId,
        chapterNumber,
        createdAt: Date.now(),
        category: targetCategory,
      },
    ];
    const nextCategories = ensureCategory(categories.value, targetCategory);
    bookmarks.value = nextBookmarks;
    categories.value = nextCategories;
    // Auto-expand the category that just received a bookmark so the user
    // sees the new entry without having to click open the folder.
    const nextExpanded = new Set(expandedCategories.value);
    nextExpanded.add(targetCategory);
    expandedCategories.value = nextExpanded;
    await persist(nextBookmarks, nextCategories);
  };

  const removeBookmark: BookmarksManager["removeBookmark"] = async (id) => {
    const next = bookmarks.value.filter((bookmark) => bookmark.id !== id);
    if (next.length === bookmarks.value.length) {
      return;
    }
    bookmarks.value = next;
    await persist(next, categories.value);
  };

  const removeBookmarkForLocation: BookmarksManager["removeBookmarkForLocation"] =
    async (translationId, bookId, chapterNumber) => {
      const next = bookmarks.value.filter(
        (bookmark) =>
          !bookmarkMatchesLocation(
            bookmark,
            translationId,
            bookId,
            chapterNumber
          )
      );
      if (next.length === bookmarks.value.length) {
        return;
      }
      bookmarks.value = next;
      await persist(next, categories.value);
    };

  const toggleBookmarkForTab: BookmarksManager["toggleBookmarkForTab"] = async (
    tab
  ) => {
    const translationId = tab.readingState.translationId.value;
    const bookId = tab.readingState.bookId.value;
    const chapterNumber = tab.readingState.chapterNumber.value;
    await toggleBookmarkAtLocation(translationId, bookId, chapterNumber);
  };

  const toggleBookmarkAtLocation: BookmarksManager["toggleBookmarkAtLocation"] =
    async (translationId, bookId, chapterNumber) => {
      if (!translationId || !bookId || !chapterNumber) {
        return;
      }
      if (isLocationBookmarked(translationId, bookId, chapterNumber)) {
        await removeBookmarkForLocation(translationId, bookId, chapterNumber);
        return;
      }
      await addBookmark(translationId, bookId, chapterNumber);
    };

  const toggleFilter = () => {
    isFilterActive.value = !isFilterActive.value;
  };

  const toggleCategoryExpanded: BookmarksManager["toggleCategoryExpanded"] = (
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

  const createCategory: BookmarksManager["createCategory"] = async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (categories.value.some((c) => c.name === trimmed)) {
      return;
    }
    const nextCategories = [...categories.value, { name: trimmed }];
    categories.value = nextCategories;
    const nextExpanded = new Set(expandedCategories.value);
    nextExpanded.add(trimmed);
    expandedCategories.value = nextExpanded;
    await persist(bookmarks.value, nextCategories);
  };

  const renameCategory: BookmarksManager["renameCategory"] = async (
    oldName,
    newName
  ) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    if (!categories.value.some((c) => c.name === oldName)) return;
    if (categories.value.some((c) => c.name === trimmed)) {
      // Target name collides with an existing category — skip to keep names
      // unique (which the rest of the manager relies on for lookup).
      return;
    }
    const nextCategories = categories.value.map((c) =>
      c.name === oldName ? { ...c, name: trimmed } : c
    );
    const nextBookmarks = bookmarks.value.map((b) =>
      b.category === oldName ? { ...b, category: trimmed } : b
    );
    categories.value = nextCategories;
    bookmarks.value = nextBookmarks;
    const nextExpanded = new Set(expandedCategories.value);
    if (nextExpanded.delete(oldName)) {
      nextExpanded.add(trimmed);
    }
    expandedCategories.value = nextExpanded;
    await persist(nextBookmarks, nextCategories);
  };

  const deleteCategory: BookmarksManager["deleteCategory"] = async (name) => {
    if (name === DEFAULT_BOOKMARK_CATEGORY) {
      // The default folder always exists as the landing spot for new
      // bookmarks; treat deletion as a no-op rather than silently moving
      // its contents elsewhere.
      return;
    }
    if (!categories.value.some((c) => c.name === name)) return;
    const nextCategories = categories.value.filter((c) => c.name !== name);
    const nextBookmarks = bookmarks.value.filter((b) => b.category !== name);
    categories.value = nextCategories;
    bookmarks.value = nextBookmarks;
    const nextExpanded = new Set(expandedCategories.value);
    nextExpanded.delete(name);
    expandedCategories.value = nextExpanded;
    await persist(nextBookmarks, nextCategories);
  };

  const checkEnabled = () => {
    posthog.onFeatureFlags(() => {
      enabled.value = posthog?.isFeatureEnabled("bookmarks");
    });
  };

  void checkEnabled();

  return {
    enabled,
    bookmarks: readBookmarks,
    categories: readCategories,
    expandedCategories: readExpanded,
    isFilterActive,
    toggleFilter,
    toggleCategoryExpanded,
    isLocationBookmarked,
    addBookmark,
    removeBookmark,
    removeBookmarkForLocation,
    toggleBookmarkForTab,
    toggleBookmarkAtLocation,
    createCategory,
    renameCategory,
    deleteCategory,
  };
}
