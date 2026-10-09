import {
  computed,
  effect,
  signal,
  type ReadonlySignal,
  type Signal,
} from "@preact/signals";
import * as z from "zod/v4";
import type { LoginManager } from "./LoginManager";
import type { CasualOSManager } from "./OsManager";
import { readRecord } from "./RecordRead";

/**
 * Schema for one bookmark.
 *
 * A bookmark is a named, colored marker for where you are in a book — "Reading
 * plan", "Sermon prep" — that you move forward as you read. Unlike a save it is
 * not archival: it always points at exactly one chapter, moving it replaces
 * where it was, and there is no verse-level form. Several bookmarks may sit on
 * the same chapter.
 *
 * The location fields are required on purpose. A bookmark that points nowhere
 * is never stored; the premade "My bookmark" offered to a user with none exists
 * only as modal state until they place it.
 */
export const bookmarkSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  colorId: z.string().min(1),
  translationId: z.string().min(1),
  bookId: z.string().min(1),
  chapterNumber: z.number().int().positive(),
  createdAt: z.number().int().nonnegative(),
  /** Stamped on every move. Drives "most recently moved first" ordering. */
  updatedAt: z.number().int().nonnegative(),
});

export const bookmarksPayloadSchema = z.object({
  bookmarks: z.array(bookmarkSchema),
});

export type Bookmark = z.infer<typeof bookmarkSchema>;
export type BookmarksPayload = z.infer<typeof bookmarksPayloadSchema>;

/** The chapter a bookmark points at. */
export interface BookmarkLocation {
  translationId: string;
  bookId: string;
  chapterNumber: number;
}

/** The parts of a bookmark the user names and colors. */
export interface BookmarkDetails {
  name: string;
  colorId: string;
}

/**
 * Soft cap on how many bookmarks a user can create. Bookmarks are markers you
 * move, not a collection you grow — Saves is where things accumulate.
 *
 * "Soft" because it only stops *creating* one: a stored list already over the
 * cap (from a later raise of it, or another client) is kept whole, never
 * truncated.
 */
export const MAX_BOOKMARKS = 5;

/**
 * The bookmarks record. Deliberately not `bookmarks` (the legacy saves record,
 * see SavesManager) or `saves`: reading either would surface a user's whole
 * save history as bookmarks.
 */
const STORAGE_ADDRESS = "readingBookmarks";

function makeBookmarkId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `bookmark-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Most recently moved first; `createdAt` and `id` only break exact ties. */
function compareByMostRecentlyMoved(a: Bookmark, b: Bookmark): number {
  return (
    b.updatedAt - a.updatedAt ||
    b.createdAt - a.createdAt ||
    a.id.localeCompare(b.id)
  );
}

export interface BookmarksManager {
  /**
   * The current user's bookmarks, most recently moved first. Empty when logged
   * out.
   */
  bookmarks: ReadonlySignal<Bookmark[]>;

  /** False once the user has {@link MAX_BOOKMARKS} or more bookmarks. */
  canCreate: ReadonlySignal<boolean>;

  /** Whether the bookmarks management panel is showing in the sidebar. */
  isPanelOpen: Signal<boolean>;

  /**
   * Whether the panel was opened from the mobile toolbar's More menu, which
   * decides whether its header offers Close (dismiss the drawer) or Back (to
   * the tabs list it was opened from).
   */
  openedFromToolbar: Signal<boolean>;

  togglePanel: () => void;

  /** Closes the panel and forgets where it was opened from. */
  closePanel: () => void;

  /**
   * Every bookmark on the given chapter in the given translation, most
   * recently moved first. A bookmark on the same chapter in a different
   * translation does not count.
   */
  getBookmarksForLocation: (
    translationId: string | null | undefined,
    bookId: string | null | undefined,
    chapterNumber: number | null | undefined
  ) => Bookmark[];

  /**
   * Resolves once the signed-in user's stored bookmarks are in memory, retrying
   * a load that failed earlier. False when signed out, or when the record still
   * could not be read — in which case nothing should be offered that would
   * write over it.
   */
  ensureLoaded: () => Promise<boolean>;

  /**
   * Creates a bookmark at the given chapter. Returns the new bookmark, or null
   * when nothing was written: the user is signed out, the record never loaded,
   * the name is blank, or the user is already at {@link MAX_BOOKMARKS}.
   */
  createBookmark: (
    details: BookmarkDetails,
    location: BookmarkLocation
  ) => Promise<Bookmark | null>;

  /** Moves a bookmark to the given chapter and stamps it as just moved. */
  moveBookmark: (id: string, location: BookmarkLocation) => Promise<void>;

  /**
   * Renames or recolors a bookmark. Leaves its location and `updatedAt`
   * alone — editing a label is not moving it. A blank name is ignored.
   */
  updateBookmark: (id: string, details: BookmarkDetails) => Promise<void>;

  /** Deletes a bookmark. */
  removeBookmark: (id: string) => Promise<void>;
}

export function createBookmarksManager(
  os: CasualOSManager,
  login: LoginManager
): BookmarksManager {
  const stored = signal<Bookmark[]>([]);
  const loadedUserId = signal<string | null>(null);
  const isPanelOpen = signal(false);
  const openedFromToolbar = signal(false);

  /**
   * The load for the current user while it is in flight. Mutators wait on it
   * (see {@link ensureLoaded}) so a change made during the round trip isn't
   * overwritten when the load lands.
   */
  let loadPromise: Promise<void> | null = null;

  const bookmarks = computed(() =>
    [...stored.value].sort(compareByMostRecentlyMoved)
  );
  const canCreate = computed(() => stored.value.length < MAX_BOOKMARKS);

  const loadBookmarks = async (userId: string): Promise<void> => {
    const result = await os.getData(userId, STORAGE_ADDRESS);
    if (login.userId.value !== userId) {
      return;
    }
    const read = readRecord(result, bookmarksPayloadSchema, "bookmarks");
    if (read.status === "error") {
      // Leave the user unloaded rather than showing an empty list: an empty
      // list that later persists would replace a record we never managed to
      // read. The next mutation retries the load.
      console.warn(
        "Could not read the bookmarks record; leaving bookmarks untouched until the next load."
      );
      return;
    }
    stored.value = read.status === "found" ? read.value.bookmarks : [];
    loadedUserId.value = userId;
  };

  const ensureLoaded = async (): Promise<boolean> => {
    const pending = loadPromise;
    if (pending) {
      await pending;
    }
    const userId = login.userId.value;
    if (!userId) {
      return false;
    }
    if (loadedUserId.value === userId) {
      return true;
    }
    // Share a retry another caller already started rather than firing another.
    if (loadPromise === pending) {
      loadPromise = loadBookmarks(userId);
    }
    const retry = loadPromise;
    if (retry) {
      await retry;
    }
    return loadedUserId.value === userId;
  };

  effect(() => {
    const userId = login.userId.value;
    if (!userId) {
      stored.value = [];
      loadedUserId.value = null;
      loadPromise = null;
      isPanelOpen.value = false;
      openedFromToolbar.value = false;
      return;
    }
    if (loadedUserId.value === userId) {
      return;
    }
    loadPromise = loadBookmarks(userId);
  });

  /**
   * Applies `next` locally and writes it. Callers have already passed
   * {@link ensureLoaded}, so what is in memory is this user's real list.
   */
  const commit = async (next: Bookmark[]): Promise<void> => {
    const userId = login.userId.value;
    if (!userId) return;
    stored.value = next;
    const payload = bookmarksPayloadSchema.parse({ bookmarks: next });
    const result = await os.recordData(userId, STORAGE_ADDRESS, payload, {
      marker: "publicRead",
    });
    // A rejected write resolves with `success: false` rather than throwing,
    // so it has to be checked to be noticed at all.
    if (result && result.success === false) {
      throw new Error(`Failed to write bookmarks: ${result.errorCode}`);
    }
  };

  const getBookmarksForLocation: BookmarksManager["getBookmarksForLocation"] = (
    translationId,
    bookId,
    chapterNumber
  ) => {
    if (!translationId || !bookId || !chapterNumber) {
      return [];
    }
    return bookmarks.value.filter(
      (bookmark) =>
        bookmark.translationId === translationId &&
        bookmark.bookId === bookId &&
        bookmark.chapterNumber === chapterNumber
    );
  };

  const createBookmark: BookmarksManager["createBookmark"] = async (
    details,
    location
  ) => {
    const name = details.name.trim();
    if (!name) return null;
    if (!(await ensureLoaded())) return null;
    if (!canCreate.value) return null;
    const now = Date.now();
    const bookmark: Bookmark = {
      id: makeBookmarkId(),
      name,
      colorId: details.colorId,
      translationId: location.translationId,
      bookId: location.bookId,
      chapterNumber: location.chapterNumber,
      createdAt: now,
      updatedAt: now,
    };
    await commit([...stored.value, bookmark]);
    return bookmark;
  };

  const moveBookmark: BookmarksManager["moveBookmark"] = async (
    id,
    location
  ) => {
    if (!(await ensureLoaded())) return;
    if (!stored.value.some((bookmark) => bookmark.id === id)) return;
    // Always restamped, even onto the chapter it already marks: placing it
    // again is what brings it to the front of the stack and the lists.
    const updatedAt = Date.now();
    await commit(
      stored.value.map((bookmark) =>
        bookmark.id === id
          ? {
              ...bookmark,
              translationId: location.translationId,
              bookId: location.bookId,
              chapterNumber: location.chapterNumber,
              updatedAt,
            }
          : bookmark
      )
    );
  };

  const updateBookmark: BookmarksManager["updateBookmark"] = async (
    id,
    details
  ) => {
    const name = details.name.trim();
    if (!name) return;
    if (!(await ensureLoaded())) return;
    const existing = stored.value.find((bookmark) => bookmark.id === id);
    if (!existing) return;
    if (existing.name === name && existing.colorId === details.colorId) return;
    await commit(
      stored.value.map((bookmark) =>
        bookmark.id === id
          ? { ...bookmark, name, colorId: details.colorId }
          : bookmark
      )
    );
  };

  const removeBookmark: BookmarksManager["removeBookmark"] = async (id) => {
    if (!(await ensureLoaded())) return;
    const next = stored.value.filter((bookmark) => bookmark.id !== id);
    if (next.length === stored.value.length) return;
    await commit(next);
  };

  return {
    bookmarks,
    canCreate,
    isPanelOpen,
    openedFromToolbar,
    togglePanel: () => {
      isPanelOpen.value = !isPanelOpen.value;
    },
    closePanel: () => {
      isPanelOpen.value = false;
      openedFromToolbar.value = false;
    },
    getBookmarksForLocation,
    ensureLoaded,
    createBookmark,
    moveBookmark,
    updateBookmark,
    removeBookmark,
  };
}
