import type { BibleDataManager } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import {
  ApiRequestError,
  type Dataset,
  type InterlinearBookChapter,
  type InterlinearVerse,
  type InterlinearWord,
  type LexiconEntry,
} from "seed-bible/managers";
import { parseStrongsId } from "./strongs";

export const INTERLINEAR_DATASET_ID = "bsb-interlinear";
export const LEXICON_DATASET_ID = "stepbible-lexicon";

/** The original words of one verse, or why there are none. */
export type VerseWordsResult =
  | { status: "ok"; words: InterlinearWord[]; dataset: Dataset }
  /** The interlinear doesn't cover the book, such as the deuterocanon. */
  | { status: "book-unavailable" }
  /**
   * The book is covered but not this verse: a chapter or verse the reader's
   * translation numbers differently from the BSB, such as Malachi 3:19 in a
   * translation that follows the Hebrew numbering (the BSB's Malachi 4:1).
   */
  | { status: "verse-unavailable" }
  /** Couldn't be fetched (offline, a server error) and nothing is cached. */
  | { status: "error"; error: unknown };

/** Every verse of one chapter, or why there are none. */
export type ChapterWordsResult =
  | { status: "ok"; verses: InterlinearVerse[]; dataset: Dataset }
  /** The interlinear doesn't cover the book, such as the deuterocanon. */
  | { status: "book-unavailable" }
  /**
   * The book is covered but not this chapter, such as Joel 4 in a
   * translation that follows the Hebrew numbering (the BSB's Joel 3).
   */
  | { status: "chapter-unavailable" }
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
  /** Every verse of a chapter, from the same download `getVerseWords` uses. */
  getChapterWords(book: string, chapter: number): Promise<ChapterWordsResult>;
  /**
   * The lexicon entry for a Strong's number. Takes the extended form too
   * ("H0430G"), reading the entry it belongs to ("H0430").
   */
  getLexiconEntry(strongsId: string): Promise<LexiconEntryResult>;
}

/** The app's dataset calls the provider makes. */
export type WordStudySource = Pick<
  BibleDataManager,
  "getDatasetBookChapter" | "getDatasetBooks" | "getDatasetLexiconEntry"
>;

/** Whether the API answered "no such file", live or remembered by the app. */
function isNotFound(error: unknown): boolean {
  return error instanceof ApiRequestError && error.status === 404;
}

/**
 * Reads the interlinear and lexicon datasets. The app keeps what it downloads
 * on the device (`BibleDataManager`'s `getDataset*`), so a later visit, or one
 * made offline, is answered without the network.
 *
 * Only what a reader asks for is downloaded: one interlinear chapter per
 * chapter studied (every verse in it is then answered from that one file),
 * and one lexicon entry per word opened. The lexicon's ~2 MB index is never
 * fetched.
 */
export function createWordStudyProvider(
  source: WordStudySource
): WordStudyProvider {
  /**
   * Why a chapter the interlinear doesn't have is missing. Only asked after a
   * 404, so the usual path never fetches the book list. When the list can't
   * be read either, "this chapter" is the answer that is never wrong.
   */
  const whyMissing = async (
    book: string
  ): Promise<"book-unavailable" | "chapter-unavailable"> => {
    try {
      const { books } = await source.getDatasetBooks(INTERLINEAR_DATASET_ID);
      return books.some((entry) => entry.id === book)
        ? "chapter-unavailable"
        : "book-unavailable";
    } catch {
      return "chapter-unavailable";
    }
  };

  const getChapterWords = async (
    book: string,
    chapter: number
  ): Promise<ChapterWordsResult> => {
    let data: InterlinearBookChapter;
    try {
      data = await source.getDatasetBookChapter(
        INTERLINEAR_DATASET_ID,
        book,
        chapter
      );
    } catch (error) {
      if (isNotFound(error)) {
        return { status: await whyMissing(book) };
      }
      return { status: "error", error };
    }
    return {
      status: "ok",
      verses: data.chapter.content,
      dataset: data.dataset,
    };
  };

  return {
    getChapterWords,

    async getVerseWords(book, chapter, verse) {
      const result = await getChapterWords(book, chapter);
      if (result.status === "chapter-unavailable") {
        return { status: "verse-unavailable" };
      }
      if (result.status !== "ok") {
        return result;
      }

      const found = result.verses.find((entry) => entry.verse === verse);
      if (!found || found.words.length === 0) {
        return { status: "verse-unavailable" };
      }
      return { status: "ok", words: found.words, dataset: result.dataset };
    },

    async getLexiconEntry(strongsId) {
      const id = parseStrongsId(strongsId);
      if (!id) {
        return { status: "not-found" };
      }

      try {
        const data = await source.getDatasetLexiconEntry(
          LEXICON_DATASET_ID,
          id.entryId
        );
        return { status: "ok", entry: data.entry, dataset: data.dataset };
      } catch (error) {
        if (isNotFound(error)) {
          return { status: "not-found" };
        }
        return { status: "error", error };
      }
    },
  };
}
