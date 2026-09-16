/**
 * Fetches the complete AAB translation and derives, for every book and
 * chapter, the number of the last verse in that chapter. Writes the result
 * back into `bookChapterVerseCounts.ts`, keeping the file's existing book
 * order and only touching books that already appear there (the Protestant
 * canon) — any apocryphal books AAB includes are ignored.
 *
 * AAB is used specifically because it numbers the traditional Textus
 * Receptus verses (e.g. Matt 17:21, Mark 9:44/46, Acts 8:37), so its last
 * verse number per chapter matches the familiar KJV maxima. A translation
 * that omits those verses would yield lower, stricter bounds.
 *
 * The "last verse number" is computed from the actual verse content rather
 * than trusting `numberOfVerses`, since some chapters omit verse numbers
 * (e.g. combined or bracketed verses), which would make a plain count
 * diverge from the true last verse number.
 *
 * Only the `BOOK_CHAPTER_VERSE_COUNTS` data object is rewritten — the rest
 * of the file (the header comment and the `getBookChapterCount`/
 * `getChapterVerseCount` functions) is preserved verbatim so hand-written
 * changes to them survive regeneration.
 *
 * Usage: pnpm generate-book-chapter-verse-counts
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import * as prettier from "prettier";
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

  const newDataObject = `export const BOOK_CHAPTER_VERSE_COUNTS: Readonly<
  Record<string, readonly number[]>
> = {
${entries}
};`;

  const existingSource = await readFile(OUTPUT_PATH, "utf-8");
  const dataObjectPattern =
    /export const BOOK_CHAPTER_VERSE_COUNTS[\s\S]*?\n};/;
  if (!dataObjectPattern.test(existingSource)) {
    throw new Error(
      `Could not find the BOOK_CHAPTER_VERSE_COUNTS data object in ${OUTPUT_PATH}; refusing to overwrite the file.`
    );
  }
  const updatedSource = existingSource.replace(
    dataObjectPattern,
    newDataObject
  );

  const prettierConfig = await prettier.resolveConfig(OUTPUT_PATH);
  const formattedSource = await prettier.format(updatedSource, {
    ...prettierConfig,
    filepath: OUTPUT_PATH,
  });

  await writeFile(OUTPUT_PATH, formattedSource, "utf-8");
  console.log(`Wrote ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(`Failed to generate book chapter verse counts:`, error);
  process.exitCode = 1;
});
