import {
  buildChapterRecord,
  countPublishedChapters,
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
  if (options.full) {
    const existing = await store.listByMarker(
      recordName,
      CONTENT_CHAPTER_MARKER
    );
    for (const entry of existing) {
      keys.add(entry.address.replace(/^ch\./, ""));
    }
    for (const item of items) {
      for (const key of publishedChapterKeys(item)) {
        keys.add(key);
      }
    }
  }

  for (const key of keys) {
    const chapter = parseContentChapterKey(key);
    if (!chapter) {
      continue;
    }
    const address = contentChapterAddress(chapter.book, chapter.chapter);
    const built = buildChapterRecord(items, chapter.book, chapter.chapter, now);
    if (built) {
      assertStored(
        await store.recordData(
          recordName,
          address,
          built,
          CONTENT_CHAPTER_MARKER
        ),
        `update ${key}`
      );
    } else {
      const erased = await store.eraseData(recordName, address);
      if (!erased.success && erased.errorCode !== "data_not_found") {
        assertStored(erased, `clear ${key}`);
      }
    }
  }

  const index: ContentChapterIndex = {
    schemaVersion: 1,
    chapters: countPublishedChapters(items),
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
