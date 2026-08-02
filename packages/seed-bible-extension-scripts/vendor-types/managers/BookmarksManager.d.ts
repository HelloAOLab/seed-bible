import { type ReadonlySignal, type Signal } from "@preact/signals";
import * as z from "zod/v4";
import type { LoginManager } from "../managers/LoginManager";
import type { ReaderTab } from "../managers/TabsManager";
import type { CasualOSManager } from "./OsManager";
/**
 * Verse target for a bookmark: a single verse number or an inclusive `[start, end]`
 * range. Absent when the bookmark refers to a whole chapter.
 */
export declare const bookmarkVerseSchema: z.ZodUnion<
  readonly [z.ZodNumber, z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>]
>;
/**
 * Schema for one bookmark entry.
 *
 * A bookmark is a saved Bible location (translation + book + chapter, optionally
 * narrowed to a single verse or `[start, end]` range) that a user has flagged
 * from a tab or from the verse toolbar. Bookmarks are *links* to a location —
 * clicking one navigates the active tab there. They are persisted per user
 * under the `"bookmarks"` storage key so they survive across sessions /
 * devices and are restored when the user logs back in. Each bookmark belongs
 * to exactly one category (folder) — newly added bookmarks land in the
 * default category and can be moved or grouped from there.
 */
export declare const bookmarkSchema: z.ZodObject<
  {
    id: z.ZodString;
    translationId: z.ZodString;
    bookId: z.ZodString;
    chapterNumber: z.ZodNumber;
    verse: z.ZodOptional<
      z.ZodUnion<
        readonly [z.ZodNumber, z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>]
      >
    >;
    createdAt: z.ZodNumber;
    category: z.ZodString;
  },
  z.core.$strip
>;
export declare const bookmarkCategorySchema: z.ZodObject<
  {
    name: z.ZodString;
  },
  z.core.$strip
>;
export declare const bookmarksPayloadSchema: z.ZodObject<
  {
    bookmarks: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString;
          translationId: z.ZodString;
          bookId: z.ZodString;
          chapterNumber: z.ZodNumber;
          createdAt: z.ZodNumber;
          category: z.ZodOptional<z.ZodString>;
          verse: z.ZodOptional<
            z.ZodUnion<
              readonly [
                z.ZodNumber,
                z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>,
              ]
            >
          >;
        },
        z.core.$strip
      >
    >;
    categories: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            name: z.ZodString;
          },
          z.core.$strip
        >
      >
    >;
  },
  z.core.$strip
>;
export type Bookmark = z.infer<typeof bookmarkSchema>;
export type BookmarkVerse = z.infer<typeof bookmarkVerseSchema>;
export type BookmarkCategory = z.infer<typeof bookmarkCategorySchema>;
export type BookmarksPayload = z.infer<typeof bookmarksPayloadSchema>;
/** Category every new bookmark lands in if none is specified. */
export declare const DEFAULT_BOOKMARK_CATEGORY = "My Bookmarks";
/**
 * Derives the bookmark `verse` field from a list of selected verses. Returns:
 *   - `undefined` when nothing is selected,
 *   - a single number when one verse is selected or the range collapses to one,
 *   - `[start, end]` when the selection spans multiple distinct verse numbers.
 */
export declare function bookmarkVerseFromSelection(
  verseNumbers: readonly number[]
): BookmarkVerse | undefined;
export interface BookmarksManager {
  /** All bookmarks for the current user. Empty array when logged out. */
  bookmarks: ReadonlySignal<Bookmark[]>;
  /** Ordered list of bookmark categories (folders). */
  categories: ReadonlySignal<BookmarkCategory[]>;
  /**
   * Names of categories the user has expanded in the sidebar. Held in memory
   * only — not persisted, since the user's view preference resets per session.
   */
  expandedCategories: ReadonlySignal<ReadonlySet<string>>;
  /**
   * Whether the bookmarks list is currently open in the sidebar — when true,
   * the sidebar shows the saved bookmarks list instead of the open tabs list.
   * The name is kept for backwards compatibility with the header toggle.
   */
  isFilterActive: Signal<boolean>;
  /**
   * Whether the bookmarks view was opened from the bottom toolbar (as opposed
   * to the Tabs header toggle). On mobile this decides the header's leading
   * button: a Close (X) that dismisses the whole drawer when opened from the
   * toolbar, versus a Back arrow that returns to the Tabs list otherwise.
   */
  openedFromToolbar: Signal<boolean>;
  /** Toggles the bookmarks view on/off. */
  toggleFilter: () => void;
  /** Closes the bookmarks view. Used after navigating from a bookmark. */
  closeView: () => void;
  /** Toggles whether a category is expanded in the sidebar. */
  toggleCategoryExpanded: (name: string) => void;
  /**
   * Returns true if a bookmark exists for the given location. When `verse` is
   * omitted, only chapter-level bookmarks (no verse field) count as a match.
   * Reactive — re-evaluates when `bookmarks` or login state changes.
   */
  isLocationBookmarked: (
    translationId: string | null | undefined,
    bookId: string | null | undefined,
    chapterNumber: number | null | undefined,
    verse?: BookmarkVerse
  ) => boolean;
  /**
   * Returns true if any bookmark (chapter- or verse-level) exists for the
   * given chapter. Used by the tab row dot indicator to flag any saved
   * reference into that chapter.
   */
  isChapterBookmarked: (
    translationId: string | null | undefined,
    bookId: string | null | undefined,
    chapterNumber: number | null | undefined
  ) => boolean;
  /**
   * Adds the given location as a bookmark if not already saved.
   * Requires the user to be logged in; will trigger login otherwise.
   * Defaults to the default category when none is provided. Pass `verse` to
   * scope the bookmark to a single verse or `[start, end]` range.
   */
  addBookmark: (
    translationId: string,
    bookId: string,
    chapterNumber: number,
    options?: {
      verse?: BookmarkVerse;
      category?: string;
    }
  ) => Promise<void>;
  /**
   * Removes the bookmark matching the given location (and optional verse).
   * When `verse` is omitted, only the chapter-level bookmark is removed —
   * verse-scoped bookmarks for the same chapter are left in place.
   */
  removeBookmarkForLocation: (
    translationId: string,
    bookId: string,
    chapterNumber: number,
    verse?: BookmarkVerse
  ) => Promise<void>;
  /** Removes a specific bookmark by id. */
  removeBookmark: (id: string) => Promise<void>;
  /**
   * Moves an existing bookmark into another category (creating the category
   * first when needed). No-op when the bookmark id is unknown or the target
   * category is already the bookmark's current folder.
   */
  moveBookmark: (id: string, category: string) => Promise<void>;
  /**
   * Toggles a chapter-level bookmark for a tab's current location. If the
   * user is not logged in this triggers a login first. Newly added
   * bookmarks land in the default category.
   */
  toggleBookmarkForTab: (tab: ReaderTab) => Promise<void>;
  /**
   * Toggles the bookmark at the given location. Same login-on-add behavior
   * as `toggleBookmarkForTab` but takes a raw location instead of a tab.
   * Pass `verse` to toggle a verse-scoped bookmark instead of the
   * chapter-level one.
   */
  toggleBookmarkAtLocation: (
    translationId: string | null | undefined,
    bookId: string | null | undefined,
    chapterNumber: number | null | undefined,
    verse?: BookmarkVerse
  ) => Promise<void>;
  /**
   * Toggles a verse-scoped bookmark for the currently selected verses in the
   * given reading state. Collapses a single-verse selection to a number and a
   * multi-verse selection to an inclusive range based on min/max verse number.
   * No-op when there is no selection.
   */
  toggleBookmarkForSelectedVerses: (
    readingState: import("../managers/BibleReadingManager").BibleReadingState
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
export declare function createBookmarksManager(
  os: CasualOSManager,
  login: LoginManager
): BookmarksManager;
