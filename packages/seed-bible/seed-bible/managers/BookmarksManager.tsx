import { effect, signal, type Signal } from "@preact/signals";
import { z } from "zod";
import type { LoginManager } from "seed-bible.managers.LoginManager";

const BOOKMARKS_ADDRESS = "bookmarks";
const DEFAULT_BOOKMARK_COLOR = "yellow";

export const bookmarkSchema = z.object({
  id: z.string().min(1),
  translationId: z.string().min(1),
  bookId: z.string().min(1),
  chapterNumber: z.number().int().positive(),
  createdAtMs: z.number().int().nonnegative(),
  color: z.string().min(1),
});

export const bookmarksSchema = z.object({
  bookmarks: z.array(bookmarkSchema),
});

export type Bookmark = z.infer<typeof bookmarkSchema>;

export interface BookmarksManager {
  bookmarks: Signal<Bookmark[]>;
  saveBookmark: (
    translationId: string,
    bookId: string,
    chapterNumber: number
  ) => Promise<void>;
  deleteBookmark: (bookmarkId: string) => Promise<void>;
}

function sortBookmarks(bookmarks: Bookmark[]): Bookmark[] {
  return [...bookmarks].sort((a, b) => b.createdAtMs - a.createdAtMs);
}

function isSameChapter(
  bookmark: Bookmark,
  translationId: string,
  bookId: string,
  chapterNumber: number
): boolean {
  return (
    bookmark.translationId === translationId &&
    bookmark.bookId === bookId &&
    bookmark.chapterNumber === chapterNumber
  );
}

export function createBookmarksManager(login: LoginManager): BookmarksManager {
  const bookmarks = signal<Bookmark[]>([]);

  let loadVersion = 0;
  let persistQueue: Promise<void> = Promise.resolve();

  const persistBookmarks = async (
    userId: string,
    nextBookmarks: Bookmark[]
  ): Promise<void> => {
    const payload = bookmarksSchema.parse({
      bookmarks: nextBookmarks,
    });

    await os.recordData(userId, BOOKMARKS_ADDRESS, payload);
  };

  const queuePersist = (userId: string, nextBookmarks: Bookmark[]) => {
    persistQueue = persistQueue
      .then(() => persistBookmarks(userId, nextBookmarks))
      .catch((error) => {
        console.error("Failed to persist bookmarks:", error);
      });

    return persistQueue;
  };

  const ensureAuthenticatedUserId = async (): Promise<string | null> => {
    if (!login.userId.value) {
      await login.login();
    }

    return login.userId.value;
  };

  const loadBookmarks = async (userId: string, version: number) => {
    const data = await os.getData(userId, BOOKMARKS_ADDRESS);

    if (version !== loadVersion) {
      return;
    }

    if (!data || !data.success || !data.data) {
      bookmarks.value = [];
      return;
    }

    const parsed = bookmarksSchema.safeParse(data.data);
    if (!parsed.success) {
      console.warn("Failed to parse bookmarks:", parsed.error);
      bookmarks.value = [];
      return;
    }

    bookmarks.value = sortBookmarks(parsed.data.bookmarks);
  };

  effect(() => {
    const userId = login.userId.value;
    const version = ++loadVersion;

    if (!userId) {
      bookmarks.value = [];
      return;
    }

    void loadBookmarks(userId, version);
  });

  const saveBookmark = async (
    translationId: string,
    bookId: string,
    chapterNumber: number
  ): Promise<void> => {
    const parsedTranslationId = z.string().min(1).parse(translationId);
    const parsedBookId = z.string().min(1).parse(bookId);
    const parsedChapterNumber = z
      .number()
      .int()
      .positive()
      .parse(chapterNumber);
    const userId = await ensureAuthenticatedUserId();

    if (!userId) {
      console.warn("Unable to save bookmark: user is not authenticated.");
      return;
    }

    const existing = bookmarks.value.find((bookmark) =>
      isSameChapter(
        bookmark,
        parsedTranslationId,
        parsedBookId,
        parsedChapterNumber
      )
    );

    const nextBookmark: Bookmark = {
      id: existing?.id ?? `bookmark-${uuid()}`,
      translationId: parsedTranslationId,
      bookId: parsedBookId,
      chapterNumber: parsedChapterNumber,
      createdAtMs: existing?.createdAtMs ?? Date.now(),
      color: existing?.color ?? DEFAULT_BOOKMARK_COLOR,
    };

    const nextBookmarks = sortBookmarks([
      ...bookmarks.value.filter((bookmark) => bookmark.id !== nextBookmark.id),
      nextBookmark,
    ]);

    bookmarks.value = nextBookmarks;
    await queuePersist(userId, nextBookmarks);
  };

  const deleteBookmark = async (bookmarkId: string): Promise<void> => {
    const parsedBookmarkId = z.string().min(1).parse(bookmarkId);
    const userId = await ensureAuthenticatedUserId();

    if (!userId) {
      console.warn("Unable to delete bookmark: user is not authenticated.");
      return;
    }

    const nextBookmarks = bookmarks.value.filter(
      (bookmark) => bookmark.id !== parsedBookmarkId
    );

    if (nextBookmarks.length === bookmarks.value.length) {
      return;
    }

    bookmarks.value = nextBookmarks;
    await queuePersist(userId, nextBookmarks);
  };

  return {
    bookmarks,
    saveBookmark,
    deleteBookmark,
  };
}
