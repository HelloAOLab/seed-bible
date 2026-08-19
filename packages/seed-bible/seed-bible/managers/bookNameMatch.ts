import type { TranslationBook } from "./FreeUseBibleAPI";

/** Normalizes a book name for comparison: lowercased, whitespace collapsed. */
export function normalizeBookName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Exact (case-insensitive) match on the book's common name, name, or id. */
export function exactTranslationBook(
  target: string,
  books: TranslationBook[]
): TranslationBook | null {
  return (
    books.find(
      (b) =>
        normalizeBookName(b.commonName) === target ||
        normalizeBookName(b.name) === target ||
        normalizeBookName(b.id) === target
    ) ?? null
  );
}

/** All books whose common name or name starts with the target. */
export function prefixTranslationBooks(
  target: string,
  books: TranslationBook[]
): TranslationBook[] {
  return books.filter(
    (b) =>
      normalizeBookName(b.commonName).startsWith(target) ||
      normalizeBookName(b.name).startsWith(target)
  );
}
