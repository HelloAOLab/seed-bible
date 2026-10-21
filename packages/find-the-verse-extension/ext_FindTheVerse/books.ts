import { BOOK_SLUGS, type BookId } from "seed-bible/managers";

/**
 * Canonical order is the app's book list (Protestant books, then Apocrypha),
 * the same order playlists use. A second hard-coded list would rank books the
 * app knows about — Tobit, for example — as unknown and give the wrong hint.
 */
const BOOK_ORDER = new Map<string, number>(
  (Object.keys(BOOK_SLUGS) as BookId[]).map((id, index) => [id, index])
);

export interface BookNameSource {
  id: string;
  name?: string;
  commonName?: string;
}

/** Index in canonical order, or -1 when the id is not a book the app knows. */
export function bookOrderIndex(bookId: string): number {
  return BOOK_ORDER.get(bookId) ?? -1;
}

/** Book ids in the same order `bookOrderIndex` uses. */
export function orderedBookIds(): string[] {
  return [...BOOK_ORDER.keys()];
}

export function isKnownBookId(bookId: string): boolean {
  return bookOrderIndex(bookId) >= 0;
}

/**
 * Prefer the open translation's own name. Fall back to a title built from the
 * canonical slug so a card still reads "John" before that catalog arrives.
 */
export function bookDisplayName(
  bookId: string,
  books?: readonly BookNameSource[]
): string {
  const book = books?.find((entry) => entry.id === bookId);
  const translated = book?.name || book?.commonName;
  if (translated) return translated;

  const slug = BOOK_SLUGS[bookId as BookId];
  if (!slug) return bookId;
  return slug
    .split("-")
    .map((part) =>
      part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part
    )
    .join(" ");
}
