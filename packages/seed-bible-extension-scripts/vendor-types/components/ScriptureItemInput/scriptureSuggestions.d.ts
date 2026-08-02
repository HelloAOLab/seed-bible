import type { VerseRef } from "../../managers/PlaylistManager";
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
/** One selectable chapter/verse within a book suggestion. */
export interface ChapterOption {
  ref: VerseRef;
  label: string;
}
/** A matched book plus the chapters offered for it. */
export interface BookSuggestion {
  book: TranslationBook;
  options: ChapterOption[];
}
/**
 * Human-readable label for a reference's chapter/verse portion, e.g. "2",
 * "3:16", "1:2" (single-chapter verse), or "1-3" (chapter range).
 */
export declare function formatRefLabel(ref: VerseRef): string;
/**
 * Builds the dropdown suggestions for the current input.
 *
 * Books are matched purely by name/id prefix — unlike the reference parser this
 * deliberately does NOT prefer an exact match, so a query is never collapsed to
 * a single book (typing "Jud" keeps both Judges and Jude). Each matched book
 * then offers chapters or verses per {@link optionsForBook}; books with no
 * matching chapter/verse are dropped.
 */
export declare function computeSuggestions(
  input: string,
  books: TranslationBook[]
): BookSuggestion[];
