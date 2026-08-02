import { type Signal } from "@preact/signals";
import {
  FreeUseBibleAPI,
  type ApiRequestOptions,
  type Translation,
  type TranslationBookChapter,
  type TranslationBooks,
} from "../managers/FreeUseBibleAPI";
import { type OfflineTranslationsManager } from "../managers/OfflineTranslationsManager";
import type { OfflineTranslationStore } from "../managers/OfflineTranslationStore";
/** How a set of translations should be folded into the known-translations list. */
export interface MergeTranslationsOptions {
  /**
   * When true, translations that are already known are left untouched instead of
   * being replaced.
   *
   * Use this for metadata that may be older than what the app already has — most
   * importantly a downloaded translation's saved copy, whose `sha256` is from
   * download time. Overwriting a freshly fetched hash with that older one would
   * make an available update look like it had already been applied.
   */
  fillOnly?: boolean;
}
export interface BibleDataManager {
  endpoints: Signal<string[]>;
  availableTranslations: Signal<Translation[]>;
  translationBooks: Signal<Map<string, TranslationBooks>>;
  api: FreeUseBibleAPI;
  /**
   * Translations the user has downloaded to their device for offline reading.
   *
   * Every read below checks this first, so a downloaded translation is served
   * from the device rather than the network.
   */
  offline: OfflineTranslationsManager;
  /**
   * Loads an endpoint's translation list and merges it into
   * `availableTranslations`.
   *
   * @param endpoint The endpoint to read. Defaults to the API's own endpoint.
   * @param options Pass `refresh: true` to bypass the API's response cache. Only
   * needed when the caller depends on values that change over time, such as each
   * translation's content hash.
   */
  getTranslations: (
    endpoint?: string,
    options?: {
      refresh?: boolean;
    }
  ) => Promise<Translation[]>;
  getTranslationBooks: (translationId: string) => Promise<TranslationBooks>;
  /**
   * Returns the already-downloaded book catalog for a translation, or null when
   * it has not been fetched yet. Never hits the network, so callers can answer
   * questions like "which chapter comes next" synchronously.
   *
   * Reads the cache **untracked**, so calling this from inside an `effect()` or
   * `computed()` does not subscribe that reaction to the catalog. Reactive
   * consumers should read the `translationBooks` signal directly instead.
   */
  getCachedTranslationBooks: (translationId: string) => TranslationBooks | null;
  getTranslationBookChapter: (
    translationId: string,
    book: string,
    chapter: number | string,
    options?: ApiRequestOptions
  ) => Promise<TranslationBookChapter>;
  getNextChapter: (
    chapter: TranslationBookChapter,
    options?: ApiRequestOptions
  ) => Promise<TranslationBookChapter | null>;
  getPreviousChapter: (
    chapter: TranslationBookChapter,
    options?: ApiRequestOptions
  ) => Promise<TranslationBookChapter | null>;
  /**
   * Gets the API endpoint associated with a given translation. If the translation is not associated with a specific endpoint, it returns the default endpoint.
   * @param translationId The ID of the translation for which to retrieve the API endpoint.
   * @returns
   */
  getTranslationEndpointInfo: (translationId: string) => {
    translationId: string;
    endpoint: string;
    isDefault: boolean;
  };
  /**
   * Gets a string that can be used in the translation query parameter to load the specified translation.
   * @param translationId The ID of the translation.
   */
  buildTranslationId: (translationId: string) => string;
}
export type BookId =
  | "GEN"
  | "EXO"
  | "LEV"
  | "NUM"
  | "DEU"
  | "JOS"
  | "JDG"
  | "RUT"
  | "1SA"
  | "2SA"
  | "1KI"
  | "2KI"
  | "1CH"
  | "2CH"
  | "EZR"
  | "NEH"
  | "EST"
  | "JOB"
  | "PSA"
  | "PRO"
  | "ECC"
  | "SNG"
  | "ISA"
  | "JER"
  | "LAM"
  | "EZK"
  | "DAN"
  | "HOS"
  | "JOL"
  | "AMO"
  | "OBA"
  | "JON"
  | "MIC"
  | "NAM"
  | "HAB"
  | "ZEP"
  | "HAG"
  | "ZEC"
  | "MAL"
  | "MAT"
  | "MRK"
  | "LUK"
  | "JHN"
  | "ACT"
  | "ROM"
  | "1CO"
  | "2CO"
  | "GAL"
  | "EPH"
  | "PHP"
  | "COL"
  | "1TH"
  | "2TH"
  | "1TI"
  | "2TI"
  | "TIT"
  | "PHM"
  | "HEB"
  | "JAS"
  | "1PE"
  | "2PE"
  | "1JN"
  | "2JN"
  | "3JN"
  | "JUD"
  | "REV"
  | "TOB"
  | "JDT"
  | "ESG"
  | "WIS"
  | "SIR"
  | "BAR"
  | "LJE"
  | "S3Y"
  | "SUS"
  | "BEL"
  | "1MA"
  | "2MA"
  | "3MA"
  | "4MA"
  | "1ES"
  | "2ES"
  | "MAN"
  | "PS2"
  | "ODA"
  | "PSS"
  | "EZA"
  | "5EZ"
  | "6EZ"
  | "DAG"
  | "PS3"
  | "2BA"
  | "LBA"
  | "JUB"
  | "ENO"
  | "1MQ"
  | "2MQ"
  | "3MQ"
  | "REP"
  | "4BA"
  | "LAO";
export interface VerseRef {
  book: BookId;
  chapter: number;
  verse?: number;
  /** The text content following the verse reference, e.g. "In the beginning..." in "GEN 1:1 In the beginning..." */
  content?: string;
  /** End chapter for multi-chapter ranges, e.g. 2 in "GEN 1:1-2:3" */
  endChapter?: number;
  /** End verse for multi-verse ranges, e.g. 3 in "GEN 1:1-1:3" */
  endVerse?: number;
}
export interface VerseRefMatch {
  ref: VerseRef;
  /** Inclusive start index of the match within the source text. */
  start: number;
  /** Exclusive end index of the match within the source text. */
  end: number;
}
/**
 * Parses the given verse reference.
 * Formatted like "GEN 1:1".
 *
 * @param text The reference to parse.
 */
export declare function parseVerseReference(text: string): VerseRef | null;
/**
 * Finds and parses all verse references in the given text, returning each
 * with its character offsets (start inclusive, end exclusive).
 */
export declare function parseVerseReferences(text: string): VerseRefMatch[];
/**
 * Gets the ID of the given book.
 * Returns null if the ID could not be found.
 * @param book The name/ID of the book.
 */
export declare function getBookId(book: string): BookId | null;
export interface CreateBibleDataManagerOptions {
  /**
   * Where downloaded translations are stored. Defaults to IndexedDB; tests pass
   * an in-memory store, and null disables offline downloads entirely.
   */
  offlineStore?: OfflineTranslationStore | null;
}
export declare function createBibleDataManager(
  api: FreeUseBibleAPI,
  options?: CreateBibleDataManagerOptions
): BibleDataManager;
