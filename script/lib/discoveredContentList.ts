import { parseVerseReferences } from "@packages/seed-bible/seed-bible/managers/parseVerseReference";
import { createRequire } from "node:module";

// Loaded via createRequire rather than a static `import { createRecordsClient }`
// because the package ships as CJS with no exports map, and tsx's ESM named-export
// interop fails to bind the named export at link time (Node's CJS lexer and
// require() both expose it fine).
const { createRecordsClient } = createRequire(import.meta.url)(
  "@casual-simulation/aux-records/RecordsClient.js"
) as typeof import("@casual-simulation/aux-records/RecordsClient.js");
/** Matches the shape of `DiscoverReference` in `managers/DiscoverManager.tsx`. */
export interface DiscoveredContentReference {
  book: string;
  chapter: number;
  endChapter?: number;
  verse?: number;
  endVerse?: number;
}

export interface DiscoveredContentItem {
  id: string;
  title: string;
  author: string;
  description: string;
  url: string;
  imageUrl: string;
  references: DiscoveredContentReference[];
}

export interface BuildDiscoveredContentListResult {
  items: DiscoveredContentItem[];
  warnings: string[];
}

const REQUIRED_COLUMNS = [
  "Name",
  "Author",
  "Bible Reference",
  "URL",
  "Description",
] as const;

/**
 * A minimal RFC 4180 CSV parser: quoted fields (with embedded commas,
 * newlines, and `""`-escaped quotes) plus bare fields, split on `,` and
 * `\r\n`/`\n`/`\r` row endings. Good enough for a Google Sheets export;
 * doesn't handle exotic dialects (alternate delimiters, etc).
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < len) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (char === ",") {
      pushField();
      i += 1;
      continue;
    }

    if (char === "\r") {
      if (text[i + 1] === "\n") {
        i += 1;
      }
      pushRow();
      i += 1;
      continue;
    }

    if (char === "\n") {
      pushRow();
      i += 1;
      continue;
    }

    field += char;
    i += 1;
  }

  // The last row has no trailing newline to trigger pushRow() above.
  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  return rows;
}

const COMBINING_DIACRITIC_PATTERN = new RegExp("[\\u0300-\\u036f]", "g");

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(COMBINING_DIACRITIC_PATTERN, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "item";
}

function uniqueSlug(value: string, used: Set<string>): string {
  const base = slugify(value);
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

function findColumnIndex(header: string[], column: string): number {
  return header.findIndex(
    (cell) => cell.trim().toLowerCase() === column.toLowerCase()
  );
}

const UTF8_BOM_PATTERN = new RegExp("^\\uFEFF");

/** Fetches a URL's link preview (title/image/etc). Swappable in tests so they don't hit the network. */
export type LinkPreviewFetcher = (
  url: string
) => ReturnType<ReturnType<typeof createRecordsClient>["getLinkPreview"]>;

function defaultFetchLinkPreview(url: string) {
  const client = createRecordsClient("https://auth.ao.bot");
  client.headers["Origin"] = "https://auth.ao.bot";
  return client.getLinkPreview({ url, locale: "en-US" });
}

/**
 * Parses a "Seed Bible Discover Content Master List" CSV export (columns:
 * Name, Author, Bible Reference, URL, Description) into the flat item list
 * the default content extension's discover provider reads. Rows that are
 * missing required data, or whose "Bible Reference" cell can't be resolved
 * to at least one book, are skipped and reported in `warnings` rather than
 * failing the whole run.
 */
export async function buildDiscoveredContentList(
  csvText: string,
  fetchLinkPreview: LinkPreviewFetcher = defaultFetchLinkPreview
): Promise<BuildDiscoveredContentListResult> {
  const rows = parseCsv(csvText.replace(UTF8_BOM_PATTERN, ""));
  const warnings: string[] = [];

  const header = rows[0];
  if (!header) {
    return { items: [], warnings: ["CSV is empty."] };
  }

  const columnIndexes = new Map<string, number>();
  for (const column of REQUIRED_COLUMNS) {
    const index = findColumnIndex(header, column);
    if (index === -1) {
      warnings.push(`Missing required column "${column}"; no items produced.`);
      return { items: [], warnings };
    }
    columnIndexes.set(column, index);
  }

  const cell = (row: string[], column: (typeof REQUIRED_COLUMNS)[number]) =>
    (row[columnIndexes.get(column)!] ?? "").trim();

  const items: DiscoveredContentItem[] = [];
  const usedIds = new Set<string>();

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex]!;
    const isBlankRow = row.every((value) => value.trim() === "");
    if (isBlankRow) {
      continue;
    }

    // Sheet rows are 1-indexed and row 1 is the header, so data starts at
    // sheet row 2 — matches what a user sees when they open the CSV.
    const sheetRow = rowIndex + 1;
    const title = cell(row, "Name");
    if (!title) {
      warnings.push(`Row ${sheetRow}: missing Name; skipped.`);
      continue;
    }

    const referenceCell = cell(row, "Bible Reference");
    if (!referenceCell) {
      warnings.push(
        `Row ${sheetRow} ("${title}"): missing Bible Reference; skipped.`
      );
      continue;
    }

    const references: DiscoveredContentReference[] = [];
    for (const part of referenceCell.split(",")) {
      const trimmedPart = part.trim();
      if (!trimmedPart) {
        continue;
      }

      const parsed = parseVerseReferences(trimmedPart);
      if (parsed.length === 0) {
        warnings.push(
          `Row ${sheetRow} ("${title}"): could not parse Bible reference "${trimmedPart}".`
        );
        continue;
      }

      for (const ref of parsed) {
        references.push({
          book: ref.bookId,
          chapter: ref.chapter,
          ...(ref.endChapter !== undefined
            ? { endChapter: ref.endChapter }
            : {}),
          ...(ref.verse !== undefined ? { verse: ref.verse } : {}),
          ...(ref.endVerse !== undefined ? { endVerse: ref.endVerse } : {}),
        });
      }
    }

    if (references.length === 0) {
      warnings.push(
        `Row ${sheetRow} ("${title}"): no Bible references could be parsed; skipped.`
      );
      continue;
    }

    const url = cell(row, "URL");
    console.log(
      "Fetching link preview for row",
      sheetRow,
      "title",
      title,
      "url",
      url
    );
    const linkPreview = await fetchLinkPreview(url);

    if (!linkPreview.success) {
      console.warn(
        `Row ${sheetRow} ("${title}"): failed to fetch link preview for URL "${url}".`,
        linkPreview
      );
      throw new Error(
        `Failed to fetch link preview for URL "${url}": ${linkPreview.errorMessage}`
      );
    }

    console.log("Got link preview", linkPreview);

    items.push({
      id: uniqueSlug(title, usedIds),
      title,
      author: cell(row, "Author"),
      description: cell(row, "Description"),
      url: cell(row, "URL"),
      imageUrl: linkPreview.meta["og:image"] ?? linkPreview.imageUrl!,
      references,
    });
  }

  return { items, warnings };
}
