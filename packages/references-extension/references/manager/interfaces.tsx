/** A single cross-reference, as the open-cross-ref API returns it. */
export interface CrossReference {
  book: string;
  chapter: number;
  verse: number;
  endVerse?: number;
  score?: number;
}

/** One verse's text within a cross-reference that may span several verses. */
export interface ReferenceVerseText {
  number: number;
  text: string;
}

export interface CrossReferenceWithText extends CrossReference {
  text: string;
  /** The same text split per verse; empty when none of it could be found. */
  verses: ReferenceVerseText[];
}

/** A group of books a cross-reference is filed under in the reference list. */
export type ReferenceSection =
  | "law"
  | "history"
  | "wisdom"
  | "prophets"
  | "new-testament"
  | "other";

/** Identifies the verse whose cross-references are wanted. */
export interface ReferenceId {
  bookId: string;
  chapter: number;
  verse: number;
}

/** One verse and everything it cross-references. */
export interface VerseReferences {
  verse: number;
  references: CrossReference[];
}

/** Every verse's cross-references for one chapter. */
export interface ChapterReferences {
  book: string;
  chapter: number;
  references: VerseReferences[];
}

/** A cached chapter, under the key it was saved with. */
export interface CacheEntry {
  key: string;
  data: unknown;
}

/** One book, as much of `books.json` as the extension reads. */
export interface BookReference {
  id: string;
  numberOfChapters: number;
  totalNumberOfReferences: number;
}

/** Identifies one chapter of the cross-reference dataset. */
export interface ChapterId {
  bookId: string;
  chapter: number;
}

/** What a full-dataset download managed to fetch. */
export interface DownloadSummary {
  total: number;
  downloaded: number;
  failed: number;
}
