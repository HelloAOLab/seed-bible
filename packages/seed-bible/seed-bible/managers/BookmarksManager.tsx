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
 * restored when the user logs back in.
 */
export const bookmarkSchema = z.object({
  id: z.string().min(1),
  translationId: z.string().min(1),
  bookId: z.string().min(1),
  chapterNumber: z.number().int().positive(),
  createdAt: z.number().int().nonnegative(),
});

export const bookmarksPayloadSchema = z.object({
  bookmarks: z.array(bookmarkSchema),
});

export type Bookmark = z.infer<typeof bookmarkSchema>;
export type BookmarksPayload = z.infer<typeof bookmarksPayloadSchema>;

const STORAGE_ADDRESS = "bookmarks";

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

export interface BookmarksManager {
  /** All bookmarks for the current user. Empty array when logged out. */
  bookmarks: ReadonlySignal<Bookmark[]>;

  /** Whether the bookmarks-only filter is currently active in the sidebar. */
  isFilterActive: Signal<boolean>;

  /** Toggles the bookmarks-only filter. */
  toggleFilter: () => void;

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
   */
  addBookmark: (
    translationId: string,
    bookId: string,
    chapterNumber: number
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
   * logged in this triggers a login first.
   */
  toggleBookmarkForTab: (tab: ReaderTab) => Promise<void>;
}

export function createBookmarksManager(login: LoginManager): BookmarksManager {
  const bookmarks = signal<Bookmark[]>([]);
  const isFilterActive = signal(false);
  const loadedUserId = signal<string | null>(null);

  const readBookmarks: ReadonlySignal<Bookmark[]> = computed(
    () => bookmarks.value
  );

  const loadBookmarks = async (userId: string): Promise<void> => {
    const data = await os.getData(userId, STORAGE_ADDRESS);
    if (loadedUserId.value !== userId && login.userId.value !== userId) {
      return;
    }

    if (!data || !data.success || !data.data) {
      bookmarks.value = [];
      loadedUserId.value = userId;
      return;
    }

    const parsed = bookmarksPayloadSchema.safeParse(data.data);
    if (!parsed.success) {
      console.warn("Failed to parse bookmarks payload:", parsed.error);
      bookmarks.value = [];
      loadedUserId.value = userId;
      return;
    }

    bookmarks.value = parsed.data.bookmarks;
    loadedUserId.value = userId;
  };

  const persist = async (next: Bookmark[]): Promise<void> => {
    const userId = authBot?.id;
    if (!userId) {
      console.warn("Cannot persist bookmarks: user is not authenticated.");
      return;
    }
    const payload = bookmarksPayloadSchema.parse({ bookmarks: next });
    await os.recordData(userId, STORAGE_ADDRESS, payload, {
      marker: "publicRead",
    });
  };

  effect(() => {
    const userId = login.userId.value;
    if (!userId) {
      bookmarks.value = [];
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

  const addBookmark: BookmarksManager["addBookmark"] = async (
    translationId,
    bookId,
    chapterNumber
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
    const next: Bookmark[] = [
      ...bookmarks.value,
      {
        id: makeBookmarkId(),
        translationId,
        bookId,
        chapterNumber,
        createdAt: Date.now(),
      },
    ];
    bookmarks.value = next;
    await persist(next);
  };

  const removeBookmark: BookmarksManager["removeBookmark"] = async (id) => {
    const next = bookmarks.value.filter((bookmark) => bookmark.id !== id);
    if (next.length === bookmarks.value.length) {
      return;
    }
    bookmarks.value = next;
    await persist(next);
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
      await persist(next);
    };

  const toggleBookmarkForTab: BookmarksManager["toggleBookmarkForTab"] = async (
    tab
  ) => {
    const translationId = tab.readingState.translationId.value;
    const bookId = tab.readingState.bookId.value;
    const chapterNumber = tab.readingState.chapterNumber.value;
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

  return {
    bookmarks: readBookmarks,
    isFilterActive,
    toggleFilter,
    isLocationBookmarked,
    addBookmark,
    removeBookmark,
    removeBookmarkForLocation,
    toggleBookmarkForTab,
  };
}
