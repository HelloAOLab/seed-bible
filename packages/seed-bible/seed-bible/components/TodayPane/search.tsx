/** A single verse match returned by the full-text verse search. */
export interface VerseSearchResult {
  id: string;
  translationId: string;
  bookId: string;
  chapterNumber: number;
  verseNumber: number | null;
  reference: string;
  text: string;
}
