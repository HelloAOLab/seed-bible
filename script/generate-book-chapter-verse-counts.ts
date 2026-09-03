/**
 * Fetches the complete AAB translation and derives, for every book and
 * chapter, the number of the last verse in that chapter. Writes the result
 * back into `bookChapterVerseCounts.ts`, keeping the file's existing book
 * order and only touching books that already appear there (the Protestant
 * canon) — any apocryphal books AAB includes are ignored.
 *
 * The "last verse number" is computed from the actual verse content rather
 * than trusting `numberOfVerses`, since some chapters omit verse numbers
 * (e.g. combined or bracketed verses), which would make a plain count
 * diverge from the true last verse number.
 *
 * Usage: pnpm generate-book-chapter-verse-counts
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  FreeUseBibleAPI,
  FREE_USE_BIBLE_API_ENDPOINT,
  type CompleteTranslation,
} from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import { BOOK_CHAPTER_VERSE_COUNTS } from "@packages/seed-bible/seed-bible/managers/bookChapterVerseCounts";

const TRANSLATION_ID = "AAB";
const OUTPUT_PATH = fileURLToPath(
  new URL(
    "../packages/seed-bible/seed-bible/managers/bookChapterVerseCounts.ts",
    import.meta.url
  )
);

function lastVerseNumber(
  content: CompleteTranslation["books"][number]["chapters"][number]["chapter"]["content"]
): number {
  let max = 0;
  for (const item of content) {
    if (item.type === "verse" && item.number > max) {
      max = item.number;
    }
  }
  return max;
}

function formatArray(numbers: readonly number[]): string {
  // Match the source style: comma-separated, wrapped by prettier afterward.
  return `[${numbers.join(", ")}]`;
}

function formatKey(bookId: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(bookId)
    ? bookId
    : JSON.stringify(bookId);
}

async function main(): Promise<void> {
  const endpoint =
    process.argv
      .find((arg) => arg.startsWith("--endpoint="))
      ?.slice("--endpoint=".length) || FREE_USE_BIBLE_API_ENDPOINT;

  const api = new FreeUseBibleAPI(endpoint);
  console.log(
    `Fetching complete translation ${TRANSLATION_ID} from ${endpoint}...`
  );
  const complete = await api.getCompleteTranslation(TRANSLATION_ID);

  const booksById = new Map(complete.books.map((book) => [book.id, book]));

  const knownBookIds = Object.keys(BOOK_CHAPTER_VERSE_COUNTS);
  const missing: string[] = [];
  const changes: string[] = [];
  const newCounts: Record<string, number[]> = {};

  for (const bookId of knownBookIds) {
    const book = booksById.get(bookId);
    if (!book) {
      missing.push(bookId);
      newCounts[bookId] = [...BOOK_CHAPTER_VERSE_COUNTS[bookId]!];
      continue;
    }

    const counts = book.chapters.map((chapter) =>
      lastVerseNumber(chapter.chapter.content)
    );
    newCounts[bookId] = counts;

    const oldCounts = BOOK_CHAPTER_VERSE_COUNTS[bookId]!;
    if (
      oldCounts.length !== counts.length ||
      oldCounts.some((value, index) => value !== counts[index])
    ) {
      changes.push(
        `${bookId}: ${oldCounts.length} -> ${counts.length} chapters, counts ${
          JSON.stringify(oldCounts) === JSON.stringify(counts)
            ? "unchanged"
            : "changed"
        }`
      );
    }
  }

  if (missing.length > 0) {
    console.warn(
      `AAB is missing ${missing.length} book(s) already present in bookChapterVerseCounts.ts; keeping existing counts for: ${missing.join(", ")}`
    );
  }

  console.log(`${changes.length} book(s) changed:`);
  for (const change of changes) {
    console.log(`  ${change}`);
  }

  const entries = knownBookIds
    .map(
      (bookId) => `  ${formatKey(bookId)}: ${formatArray(newCounts[bookId]!)},`
    )
    .join("\n");

  const header = `/**
 * Per-chapter verse counts for Protestant-canon books (USFM ids).
 * Used by the free-text verse scanner for verse bounds when no translation
 * book list is available. Derived from the ${TRANSLATION_ID} translation's
 * last verse number per chapter.
 *
 * Mirrors seed-bible-utils BooksStaticInfo; kept local to avoid a circular
 * package dependency (seed-bible-utils depends on seed-bible).
 */
export const BOOK_CHAPTER_VERSE_COUNTS: Readonly<
  Record<string, readonly number[]>
> = {
${entries}
};

/** Number of chapters in a book, or undefined when unknown. */
export function getBookChapterCount(bookId: string): number | undefined {
  return BOOK_CHAPTER_VERSE_COUNTS[bookId]?.length;
}

/** Verses in a 1-based chapter, or undefined when unknown. */
export function getChapterVerseCount(
  bookId: string,
  chapter: number
): number | undefined {
  const chapters = BOOK_CHAPTER_VERSE_COUNTS[bookId];
  if (!chapters || chapter < 1 || chapter > chapters.length) {
    return undefined;
  }
  return chapters[chapter - 1];
}
`;

  await writeFile(OUTPUT_PATH, header, "utf-8");
  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(
    "Run `pnpm exec prettier --write` on the file to normalize array wrapping."
  );
}

main().catch((error) => {
  console.error(`Failed to generate book chapter verse counts:`, error);
  process.exitCode = 1;
});
