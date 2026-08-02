import type * as Typesense from "typesense";
import * as z from "zod/v4";
import type { TranslationBook } from "./FreeUseBibleAPI";
export type SearchType = "verses";
type SearchFilterPrimitive = string | number | boolean;
export type SearchFilters =
  | string
  | Record<
      string,
      SearchFilterPrimitive | SearchFilterPrimitive[] | null | undefined
    >;
export declare const VerseSearchDocumentSchema: z.ZodObject<
  {
    id: z.ZodString;
    translation: z.ZodString;
    book: z.ZodString;
    chapter: z.ZodNumber;
    verse: z.ZodNumber;
    text: z.ZodString;
    language: z.ZodString;
    reference: z.ZodString;
  },
  z.core.$strip
>;
export type VerseSearchDocument = z.infer<typeof VerseSearchDocumentSchema>;
export type VerseSearchResponse = Typesense.SearchResponse<VerseSearchDocument>;
/**
 * A book (optionally with a specific chapter) that matches a search query.
 * Produced locally from the already-loaded book list — no network request.
 */
export interface BookReferenceMatch {
  /** The ID of the matched book. */
  bookId: string;
  /** The display name of the book (the translation's common name). */
  bookName: string;
  /**
   * The chapter the query resolved to, or `null` when no valid chapter number
   * was typed. `null` means "open the book at its first chapter".
   */
  chapterNumber: number | null;
  /** The book's canonical order, used for stable ranking tie-breaks. */
  order: number;
}
/**
 * Finds the books (and optional chapter) that match a free-text search query.
 *
 * The query is split into a text part and an optional trailing chapter number,
 * mirroring the Bible selector's convention (`BibleSelectorManager`). For
 * example `"Gen 2"` matches Genesis and resolves chapter 2, `"psa 51"` matches
 * Psalms chapter 51, and `"PSA 5"` resolves via the book id. A bare number or
 * empty text returns nothing (we don't list every book for `"5"`).
 *
 * @param query The raw search query.
 * @param books The books of the active translation.
 * @param limit The maximum number of matches to return.
 */
export declare function matchBookReferences(
  query: string,
  books: TranslationBook[],
  limit?: number
): BookReferenceMatch[];
export interface SearchManager {
  /**
   * Searches for verses matching the given text and filters.
   * @param language The ISO 639-3 language code of the verses to search within.
   * @param translationId The ID of the translation to search within.
   * @param query The search query text.
   * @param filters The filters to apply to the search.
   */
  searchVerses: (
    language: string,
    translationId: string,
    query: string,
    filters?: SearchFilters
  ) => Promise<VerseSearchResponse>;
}
export declare function createSearchManager(): SearchManager;
export {};
