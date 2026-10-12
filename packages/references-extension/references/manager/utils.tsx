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
  ReferenceSection,
  ReferenceVerseText,
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

/** Sections in canonical order, with the USFM book ids each one covers. */
const SECTION_BOOKS: [ReferenceSection, string[]][] = [
  ["law", ["GEN", "EXO", "LEV", "NUM", "DEU"]],
  [
    "history",
    [
      "JOS",
      "JDG",
      "RUT",
      "1SA",
      "2SA",
      "1KI",
      "2KI",
      "1CH",
      "2CH",
      "EZR",
      "NEH",
      "EST",
    ],
  ],
  ["wisdom", ["JOB", "PSA", "PRO", "ECC", "SNG"]],
  [
    "prophets",
    [
      "ISA",
      "JER",
      "LAM",
      "EZK",
      "DAN",
      "HOS",
      "JOL",
      "AMO",
      "OBA",
      "JON",
      "MIC",
      "NAM",
      "HAB",
      "ZEP",
      "HAG",
      "ZEC",
      "MAL",
    ],
  ],
  [
    "new-testament",
    [
      "MAT",
      "MRK",
      "LUK",
      "JHN",
      "ACT",
      "ROM",
      "1CO",
      "2CO",
      "GAL",
      "EPH",
      "PHP",
      "COL",
      "1TH",
      "2TH",
      "1TI",
      "2TI",
      "TIT",
      "PHM",
      "HEB",
      "JAS",
      "1PE",
      "2PE",
      "1JN",
      "2JN",
      "3JN",
      "JUD",
      "REV",
    ],
  ],
];

const SECTION_BY_BOOK = new Map(
  SECTION_BOOKS.flatMap(([section, books]) =>
    books.map((book) => [book, section] as const)
  )
);

const SECTION_ORDER: ReferenceSection[] = [
  ...SECTION_BOOKS.map(([section]) => section),
  "other",
];

export const referenceSectionOf = (bookId: string): ReferenceSection =>
  SECTION_BY_BOOK.get(bookId.toUpperCase()) ?? "other";

/**
 * Files references under their section, sections in canonical order. Within a
 * section the incoming order is kept, so a ranked list stays ranked.
 */
export const groupReferencesBySection = <T extends CrossReference>(
  references: T[]
): { section: ReferenceSection; references: T[] }[] => {
  const bySection = new Map<ReferenceSection, T[]>();
  for (const reference of references) {
    const section = referenceSectionOf(reference.book);
    const group = bySection.get(section);
    if (group) {
      group.push(reference);
    } else {
      bySection.set(section, [reference]);
    }
  }

  return SECTION_ORDER.flatMap((section) => {
    const group = bySection.get(section);
    return group ? [{ section, references: group }] : [];
  });
};

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
      // One chapter missing from the translation (an NT-only Bible asked for
      // an OT passage) leaves just that reference without text, rather than
      // failing the batch and blanking every reference with it.
      let verses: ReferenceVerseText[] = [];
      try {
        ({ verses } = await loadReferencePassage({
          reference: ref,
          dataManager,
          translationId,
        }));
      } catch (error) {
        console.warn(
          `Could not load the text of ${ref.book} ${ref.chapter}:${ref.verse}`,
          error
        );
      }
      return {
        ...ref,
        text: verses.map((verse) => verse.text).join(" "),
        verses,
      };
    })
  );

  return refsWithText;
};

/**
 * A reference's text in `translationId`, one entry per verse, along with the
 * translation's short name for attributing it ("BSB").
 */
export const loadReferencePassage = async (props: {
  reference: CrossReference;
  dataManager: BibleDataManager;
  translationId: string;
}): Promise<{ verses: ReferenceVerseText[]; translation: string }> => {
  const { reference, dataManager, translationId } = props;
  const chapterData = await dataManager.getTranslationBookChapter(
    translationId,
    reference.book,
    reference.chapter
  );

  const verses: ReferenceVerseText[] = [];
  chapterData.chapter.content.forEach((content) => {
    if (
      content.type === "verse" &&
      content.number >= reference.verse &&
      content.number <= (reference.endVerse ?? reference.verse)
    ) {
      let verseContent = "";
      content.content.forEach((verseContentItem) => {
        if (typeof verseContentItem === "string") {
          verseContent += verseContentItem;
        } else if ("text" in verseContentItem) {
          verseContent += verseContentItem.text;
        }
      });
      const trimmed = verseContent.trim();
      if (trimmed) {
        verses.push({ number: content.number, text: trimmed });
      }
    }
  });

  return {
    verses,
    translation: chapterData.translation?.shortName ?? translationId,
  };
};

/** "Genesis 15:7", or "Genesis 15:4–5" for a range. */
export function formatReference(
  reference: CrossReference,
  bookName: string
): string {
  const { chapter, verse, endVerse } = reference;
  const verses = endVerse && endVerse > verse ? `${verse}–${endVerse}` : verse;
  return `${bookName} ${chapter}:${verses}`;
}

export function referenceKey(reference: CrossReference): string {
  return `${reference.book}-${reference.chapter}-${reference.verse}-${reference.endVerse ?? ""}`;
}

/** Book id → display name, from whatever the translation has cached. */
export function buildBookNames(
  dataManager: BibleDataManager,
  translationId: string
): Map<string, string> {
  const books = dataManager.getCachedTranslationBooks(translationId);
  return new Map(
    books?.books.map((book) => [book.id, book.commonName || book.name]) ?? []
  );
}

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
