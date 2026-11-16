import type { BibleDataManager } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import {
  ApiRequestError,
  type Dataset,
  type DatasetBooks,
  type DatasetLexiconEntry,
  type InterlinearBookChapter,
  type InterlinearWord,
  type LexiconEntry,
} from "seed-bible/managers";
import {
  createCachedReader,
  createIndexedDbRecordStore,
  type LoadResult,
  type RecordStore,
} from "./cache";
import { parseStrongsId } from "./strongs";

export const INTERLINEAR_DATASET_ID = "bsb-interlinear";
export const LEXICON_DATASET_ID = "stepbible-lexicon";

export const WORD_STUDY_DB_NAME = "seed-bible-word-study";

/**
 * How long a fetched chapter or lexicon entry is served before it is fetched
 * again. Both datasets are static apart from the odd correction, and the API
 * only promises freshness for a day, so thirty days matches the Theographic
 * cache: useful, while still letting fixes through.
 */
export const WORD_STUDY_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** How long a 404 is remembered: the API's own one day. */
export const WORD_STUDY_NOT_FOUND_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * How long an expired record stays on the device as the offline answer. A
 * year: a reader who studied a passage once should still be able to study it
 * on a plane months later.
 */
export const WORD_STUDY_KEEP_STALE_MS = 365 * 24 * 60 * 60 * 1000;

/** The original words of one verse, or why there are none. */
export type VerseWordsResult =
  | { status: "ok"; words: InterlinearWord[]; dataset: Dataset }
  /** The interlinear doesn't cover the book, such as the deuterocanon. */
  | { status: "book-unavailable" }
  /**
   * The book is covered but not this verse: a chapter or verse the reader's
   * translation numbers differently from the BSB, such as Malachi 4.
   */
  | { status: "verse-unavailable" }
  /** Couldn't be fetched (offline, a server error) and nothing is cached. */
  | { status: "error"; error: unknown };

export type LexiconEntryResult =
  | { status: "ok"; entry: LexiconEntry; dataset: Dataset }
  | { status: "not-found" }
  | { status: "error"; error: unknown };

export interface WordStudyProvider {
  getVerseWords(
    book: string,
    chapter: number,
    verse: number
  ): Promise<VerseWordsResult>;
  /**
   * The lexicon entry for a Strong's number. Takes the extended form too
   * ("H0430G"), reading the entry it belongs to ("H0430").
   */
  getLexiconEntry(strongsId: string): Promise<LexiconEntryResult>;
}

/** The API calls the provider makes: the only thing tests replace. */
export type WordStudySource = Pick<
  BibleDataManager,
  "getDatasetBookChapter" | "getDatasetBooks" | "getDatasetLexiconEntry"
>;

class NotFoundError extends Error {
  constructor(readonly key: string) {
    super(`Nothing at ${key}.`);
    this.name = "NotFoundError";
  }
}

/** Turns an API call into a cache load, reading a 404 as "nothing there". */
async function loadFromApi(call: () => Promise<unknown>): Promise<LoadResult> {
  try {
    return { found: true, value: await call() };
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      return { found: false };
    }
    throw error;
  }
}

/** Creates the IndexedDB cache, or null where IndexedDB is unavailable. */
export function createIndexedDbWordStudyStore(): RecordStore | null {
  return createIndexedDbRecordStore(WORD_STUDY_DB_NAME);
}

/**
 * Reads the interlinear and lexicon datasets, keeping what it fetches on the
 * device. Records are keyed by API path.
 *
 * Only what a reader asks for is downloaded: one interlinear chapter per
 * chapter studied (every verse in it is then answered from that one file),
 * and one lexicon entry per word opened. The lexicon's ~2 MB index is never
 * fetched.
 */
export function createWordStudyProvider(options: {
  source: WordStudySource;
  store: RecordStore | null;
}): WordStudyProvider {
  const { source } = options;
  const reader = createCachedReader({
    store: options.store,
    ttlMs: WORD_STUDY_CACHE_TTL_MS,
    notFoundTtlMs: WORD_STUDY_NOT_FOUND_TTL_MS,
    keepStaleForMs: WORD_STUDY_KEEP_STALE_MS,
    notFoundError: (key) => new NotFoundError(key),
  });

  const readChapter = (book: string, chapter: number) =>
    reader.read<InterlinearBookChapter>(
      `/api/d/${INTERLINEAR_DATASET_ID}/${book}/${chapter}.json`,
      () =>
        loadFromApi(() =>
          source.getDatasetBookChapter(INTERLINEAR_DATASET_ID, book, chapter)
        )
    );

  const readBooks = () =>
    reader.read<DatasetBooks>(
      `/api/d/${INTERLINEAR_DATASET_ID}/books.json`,
      () => loadFromApi(() => source.getDatasetBooks(INTERLINEAR_DATASET_ID))
    );

  /**
   * Why a chapter the interlinear doesn't have is missing. Only asked after a
   * 404, so the usual path never fetches the book list. When the list can't
   * be read either, "this verse" is the answer that is never wrong.
   */
  const whyMissing = async (
    book: string
  ): Promise<"book-unavailable" | "verse-unavailable"> => {
    try {
      const { books } = await readBooks();
      return books.some((entry) => entry.id === book)
        ? "verse-unavailable"
        : "book-unavailable";
    } catch {
      return "verse-unavailable";
    }
  };

  return {
    async getVerseWords(book, chapter, verse) {
      let data: InterlinearBookChapter;
      try {
        data = await readChapter(book, chapter);
      } catch (error) {
        if (error instanceof NotFoundError) {
          return { status: await whyMissing(book) };
        }
        return { status: "error", error };
      }

      const found = data.chapter.content.find((entry) => entry.verse === verse);
      if (!found || found.words.length === 0) {
        return { status: "verse-unavailable" };
      }
      return { status: "ok", words: found.words, dataset: data.dataset };
    },

    async getLexiconEntry(strongsId) {
      const id = parseStrongsId(strongsId);
      if (!id) {
        return { status: "not-found" };
      }

      try {
        const data = await reader.read<DatasetLexiconEntry>(
          `/api/d/${LEXICON_DATASET_ID}/lexicon/${id.entryId}.json`,
          () =>
            loadFromApi(() =>
              source.getDatasetLexiconEntry(LEXICON_DATASET_ID, id.entryId)
            )
        );
        return { status: "ok", entry: data.entry, dataset: data.dataset };
      } catch (error) {
        if (error instanceof NotFoundError) {
          return { status: "not-found" };
        }
        return { status: "error", error };
      }
    },
  };
}
