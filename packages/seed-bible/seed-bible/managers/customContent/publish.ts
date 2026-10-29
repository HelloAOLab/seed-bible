import {
  buildChapterRecord,
  countPublishedChapters,
  paginateChapterRecord,
  publishedChapterKeys,
} from "./chapterIndex";
import {
  CONTENT_CHAPTER_INDEX_ADDRESS,
  CONTENT_CHAPTER_MARKER,
  CONTENT_ITEM_MARKER,
  CONTENT_LIBRARY_MARKER,
  CONTENT_MANIFEST_ADDRESS,
  contentChapterAddress,
  contentChapterIndexSchema,
  contentItemSchema,
  contentLibraryManifestSchema,
  parseContentChapterAddress,
  parseContentChapterKey,
  type ContentChapterIndex,
  type ContentItem,
  type ContentLibraryManifest,
} from "./schema";

/** The outcome of a CasualOS data call, as both the SDK and the worker's client report it. */
export type StoreResult =
  | { success: true; data?: unknown }
  | { success: false; errorCode: string; errorMessage?: string };

/**
 * The few CasualOS data calls publishing needs. The browser backs it with
 * the SDK (`OsManager`), the import worker with its own HTTP client, so
 * both publish with exactly this code.
 */
export interface ContentRecordStore {
  getData: (recordName: string, address: string) => Promise<StoreResult>;
  recordData: (
    recordName: string,
    address: string,
    data: unknown,
    marker: string
  ) => Promise<StoreResult>;
  eraseData: (recordName: string, address: string) => Promise<StoreResult>;
  listByMarker: (
    recordName: string,
    marker: string
  ) => Promise<{ address: string; data: unknown }[]>;
}

/** Thrown when CasualOS refuses a library read or write; `code` is its error code. */
export class ContentLibraryError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ContentLibraryError";
  }
}

/** Fails loudly on a refused write, so nobody reports unsaved work as saved. */
export function assertStored(result: StoreResult, what: string): void {
  if (!result.success) {
    throw new ContentLibraryError(
      result.errorCode,
      `Failed to ${what}: ${result.errorMessage ?? result.errorCode}`
    );
  }
}

export async function readLibraryManifest(
  store: ContentRecordStore,
  recordName: string
): Promise<ContentLibraryManifest> {
  const result = await store.getData(recordName, CONTENT_MANIFEST_ADDRESS);
  if (!result.success) {
    throw new ContentLibraryError(
      result.errorCode === "data_not_found"
        ? "library_not_found"
        : result.errorCode,
      "The content library could not be read."
    );
  }
  const parsed = contentLibraryManifestSchema.safeParse(result.data);
  if (!parsed.success) {
    throw new ContentLibraryError(
      "invalid_library",
      "The content library's manifest is invalid."
    );
  }
  return parsed.data;
}

/** Every item in the library that parses; anything else is skipped with a warning. */
export async function loadLibraryItems(
  store: ContentRecordStore,
  recordName: string
): Promise<ContentItem[]> {
  const entries = await store.listByMarker(recordName, CONTENT_ITEM_MARKER);
  const items: ContentItem[] = [];
  for (const entry of entries) {
    const parsed = contentItemSchema.safeParse(entry.data);
    if (parsed.success) {
      items.push(parsed.data);
    } else {
      console.warn("Skipping invalid content item:", entry.address);
    }
  }
  return items;
}

/**
 * Rewrites the given chapters from `items`, then the chapter index, and
 * returns the saved index. Items are saved before this runs,
 * so a failure partway leaves the items right and the index repairable by
 * publishing again with `full`.
 *
 * `full` rewrites every chapter that has a record now or should have one,
 * which also erases records left behind for chapters nothing points at.
 */
export async function publishChapters(
  store: ContentRecordStore,
  recordName: string,
  options: {
    keys?: Iterable<string>;
    full?: boolean;
    items?: readonly ContentItem[];
    now?: number;
  }
): Promise<ContentChapterIndex> {
  const now = options.now ?? Date.now();
  const items = options.items ?? (await loadLibraryItems(store, recordName));
  const keys = new Set(options.keys ?? []);
  /** Pages each chapter has stored now, so pages it no longer needs are erased. */
  const storedPages = new Map<string, number>();
  let pages: Record<string, number> = {};
  if (options.full) {
    // A full rebuild is how a broken index gets repaired, so it doesn't
    // read the old one: it finds every stored page by listing them.
    const existing = await store.listByMarker(
      recordName,
      CONTENT_CHAPTER_MARKER
    );
    for (const entry of existing) {
      const parsed = parseContentChapterAddress(entry.address);
      if (parsed) {
        keys.add(parsed.key);
        storedPages.set(
          parsed.key,
          Math.max(storedPages.get(parsed.key) ?? 1, parsed.page)
        );
      }
    }
    for (const item of items) {
      for (const key of publishedChapterKeys(item)) {
        keys.add(key);
      }
    }
  } else {
    pages = { ...(await readChapterIndex(store, recordName)).pages };
  }

  for (const key of keys) {
    const chapter = parseContentChapterKey(key);
    if (!chapter) {
      continue;
    }
    const built = buildChapterRecord(items, chapter.book, chapter.chapter, now);
    const written = built ? paginateChapterRecord(built) : [];
    for (const [position, page] of written.entries()) {
      assertStored(
        await store.recordData(
          recordName,
          contentChapterAddress(chapter.book, chapter.chapter, position + 1),
          page,
          CONTENT_CHAPTER_MARKER
        ),
        `update ${key}`
      );
    }
    const before = Math.max(storedPages.get(key) ?? 1, pages[key] ?? 1);
    for (let page = written.length + 1; page <= before; page++) {
      const erased = await store.eraseData(
        recordName,
        contentChapterAddress(chapter.book, chapter.chapter, page)
      );
      if (!erased.success && erased.errorCode !== "data_not_found") {
        assertStored(erased, `clear ${key}`);
      }
    }
    if (written.length > 1) {
      pages[key] = written.length;
    } else {
      delete pages[key];
    }
  }

  const chapters = countPublishedChapters(items);
  const pagedChapters = Object.fromEntries(
    Object.entries(pages).filter(([key]) => chapters[key])
  );
  const index: ContentChapterIndex = {
    schemaVersion: 1,
    chapters,
    ...(Object.keys(pagedChapters).length > 0 ? { pages: pagedChapters } : {}),
    updatedAt: now,
  };
  assertStored(
    await store.recordData(
      recordName,
      CONTENT_CHAPTER_INDEX_ADDRESS,
      index,
      CONTENT_LIBRARY_MARKER
    ),
    "save the chapter index"
  );
  return index;
}

/** The library's published chapter counts; empty when nothing was ever published. */
export async function readChapterIndex(
  store: ContentRecordStore,
  recordName: string
): Promise<ContentChapterIndex> {
  const result = await store.getData(recordName, CONTENT_CHAPTER_INDEX_ADDRESS);
  if (!result.success) {
    if (result.errorCode === "data_not_found") {
      return { schemaVersion: 1, chapters: {}, updatedAt: 0 };
    }
    throw new ContentLibraryError(
      result.errorCode,
      "The content library's chapter index could not be read."
    );
  }
  const parsed = contentChapterIndexSchema.safeParse(result.data);
  if (!parsed.success) {
    throw new ContentLibraryError(
      "invalid_library",
      "The content library's chapter index is invalid."
    );
  }
  return parsed.data;
}
