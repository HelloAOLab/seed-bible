import axios from "axios";
import {
  requestToPromise,
  transactionToPromise,
} from "@packages/seed-bible/seed-bible/managers/indexedDbUtils";
import type { BibleDataManager } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import type {
  BookReference,
  CacheEntry,
  ChapterId,
  ChapterReferences,
  CrossReference,
  DownloadSummary,
  VerseReferences,
} from "./interfaces";

const REFERENCES_BASE_URL = "https://vmfnri.helloao.org/api/d/open-cross-ref";

const REFERENCES_DB_NAME = "seed-bible-references";
const REFERENCES_DB_VERSION = 3;
const REFERENCES_STORE = "chapterReferences";

/**
 * How many chapters a full download fetches at a time. Asking for all ~1,200 at
 * once buries the browser's request queue, and the requests left waiting
 * longest start timing out; a pool keeps the connection busy without that.
 */
const DOWNLOAD_CONCURRENCY = 20;

const chapterReferencesKey = (bookId: string, chapter: number) =>
  `references.${bookId}.${chapter}`;

let databasePromise: Promise<IDBDatabase> | null = null;

const openReferencesDatabase = (): Promise<IDBDatabase> | null => {
  if (typeof indexedDB === "undefined") {
    return null;
  }

  if (databasePromise) {
    return databasePromise;
  }

  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(REFERENCES_DB_NAME, REFERENCES_DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (database.objectStoreNames.contains(REFERENCES_STORE)) {
        database.deleteObjectStore(REFERENCES_STORE);
      }
      database.createObjectStore(REFERENCES_STORE, { keyPath: "key" });
    };

    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        databasePromise = null;
      };
      resolve(database);
    };

    request.onerror = () =>
      reject(
        request.error ?? new Error("Failed to open the references database.")
      );
    request.onblocked = () =>
      reject(new Error("References database upgrade blocked by another tab."));
  }).catch((error: unknown) => {
    databasePromise = null;
    throw error;
  });

  return databasePromise;
};

const saveInIndexedDB = async (key: string, data: unknown): Promise<void> => {
  const database = await openReferencesDatabase();
  if (!database) {
    return;
  }

  const entry: CacheEntry = { key, data };
  const transaction = database.transaction(REFERENCES_STORE, "readwrite");
  transaction.objectStore(REFERENCES_STORE).put(entry);
  await transactionToPromise(transaction);
};

const getFromIndexedDB = async <T,>(key: string): Promise<T | null> => {
  const database = await openReferencesDatabase();
  if (!database) {
    return null;
  }

  const transaction = database.transaction(REFERENCES_STORE, "readonly");
  const entry = (await requestToPromise(
    transaction.objectStore(REFERENCES_STORE).get(key)
  )) as CacheEntry | undefined;

  return entry ? (entry.data as T) : null;
};

export const GetReferences = async (
  props: ChapterId
): Promise<ChapterReferences> => {
  const { bookId, chapter } = props;
  const cacheKey = chapterReferencesKey(bookId, chapter);

  try {
    const cached = await getFromIndexedDB<ChapterReferences>(cacheKey);
    if (cached) {
      return cached;
    }
  } catch (error) {
    console.warn("Could not read references from IndexedDB", error);
  }

  const referenceUrl = `${REFERENCES_BASE_URL}/${bookId}/${chapter}.json`;

  const referenceReq = await axios.get(referenceUrl);

  const content: VerseReferences[] = [
    ...(referenceReq.data?.chapter?.content ?? []),
  ];
  const chapterReferences: ChapterReferences = {
    book: bookId,
    chapter,
    references: content,
  };

  try {
    await saveInIndexedDB(cacheKey, chapterReferences);
  } catch (error) {
    console.warn("Could not save references to IndexedDB", error);
  }

  return chapterReferences;
};

/**
 * The cross-references of one verse. The dataset is published and cached a
 * chapter at a time, so this is a chapter fetch plus a lookup — following a
 * reference into a chapter already on the device costs nothing.
 */
export const getVerseReferences = async (props: {
  bookId: string;
  chapter: number;
  verse: number;
}): Promise<CrossReference[]> => {
  const { bookId, chapter, verse } = props;
  const chapterReferences = await GetReferences({ bookId, chapter });
  return (
    chapterReferences.references.find((entry) => entry.verse === verse)
      ?.references ?? []
  );
};

/**
 * The strongest cross-references first, capped at `limit`. Shared with the UI
 * so a loading placeholder lays out the same rows in the same order the fetch
 * is about to fill in — no reshuffle when the text arrives.
 */
export const selectTopReferences = (
  references: CrossReference[],
  limit: number
): CrossReference[] =>
  references
    .filter((ref) => ref.score !== undefined)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, limit);

export const createRefsWithText = async (props: {
  references: CrossReference[];
  limit: number;
  dataManager: BibleDataManager;
  translationId: string;
}) => {
  const { references, limit, dataManager, translationId } = props;

  const limitedReferences = selectTopReferences(references, limit);

  const refsWithText = await Promise.all(
    limitedReferences.map(async (ref) => {
      const verseText = await dataManager.getTranslationBookChapter(
        translationId,
        ref.book,
        ref.chapter
      );

      const verseTexts: string[] = [];
      verseText.chapter.content.forEach((content) => {
        if (
          content.type === "verse" &&
          content.number >= ref.verse &&
          content.number <= (ref.endVerse ?? ref.verse)
        ) {
          let verseContent = "";
          content.content.forEach((verseContentItem) => {
            if (typeof verseContentItem === "string") {
              verseContent += verseContentItem;
            } else if ("text" in verseContentItem) {
              verseContent += verseContentItem.text;
            }
          });
          verseTexts.push(verseContent.trim());
        }
      });
      return {
        ...ref,
        text: verseTexts.filter(Boolean).join(" "),
      };
    })
  );

  return refsWithText;
};

/**
 * What one stored cross-reference costs on disk, in bytes.
 *
 * Nothing reports the dataset's size ahead of time, so this is measured: 42
 * chapters sampled across all 66 books, sized as the JSON the cache actually
 * stores, came to 53.8 and 54.1 bytes per reference in two independent
 * samples. At the dataset's ~345,000 references that puts a full download
 * near 18 MB.
 */
const BYTES_PER_REFERENCE_ESTIMATE = 54;

/** The dataset's shape, as `books.json` describes it. */
export interface ReferenceDatasetIndex {
  /** Every chapter the dataset publishes. */
  chapters: ChapterId[];
  /** Cross-references across the whole dataset. */
  referenceCount: number;
}

/** Reads `books.json` and expands it into the work a full download involves. */
export const loadReferenceDatasetIndex =
  async (): Promise<ReferenceDatasetIndex> => {
    const response = await axios.get(`${REFERENCES_BASE_URL}/books.json`);
    const books: BookReference[] = response.data?.books ?? [];

    return {
      chapters: books.flatMap((book) =>
        Array.from({ length: book.numberOfChapters }, (_, index) => ({
          bookId: book.id,
          chapter: index + 1,
        }))
      ),
      referenceCount: books.reduce(
        (total, book) => total + (book.totalNumberOfReferences ?? 0),
        0
      ),
    };
  };

/** Roughly what a full download will take up on the device, in bytes. */
export const estimateReferencesSizeBytes = (referenceCount: number): number =>
  referenceCount * BYTES_PER_REFERENCE_ESTIMATE;

/**
 * Fills the cache with the whole cross-reference dataset, so references work
 * with no network. One chapter failing doesn't stop the rest — the count of
 * what didn't make it comes back in the summary.
 */
export const downloadReferences = async (): Promise<DownloadSummary> => {
  const { chapters } = await loadReferenceDatasetIndex();
  const total = chapters.length;

  let nextIndex = 0;
  let downloaded = 0;
  let failed = 0;

  const downloadNextChapter = async (): Promise<void> => {
    while (nextIndex < total) {
      const chapter = chapters[nextIndex++];
      if (!chapter) {
        return;
      }

      try {
        await GetReferences(chapter);
        downloaded += 1;
      } catch (error) {
        failed += 1;
        console.warn(
          `Could not download references for ${chapter.bookId} chapter ${chapter.chapter}`,
          error
        );
      }
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(DOWNLOAD_CONCURRENCY, total) },
      downloadNextChapter
    )
  );

  return { total, downloaded, failed };
};
