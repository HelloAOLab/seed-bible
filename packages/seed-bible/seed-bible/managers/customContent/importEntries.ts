import { normalizeContentUrl } from "./normalizeUrl";

/** One link as the owner provided it, before categories and passages are resolved. */
export interface ImportEntry {
  url: string;
  title?: string;
  description?: string;
  author?: string;
  /** Category names, matched to the library's categories by the caller. */
  categories?: string[];
  /** Passages as typed, e.g. "John 10:1-18; Psalm 23". */
  passages?: string;
}

export interface ParsedImport {
  entries: ImportEntry[];
  /** Lines or rows whose link isn't an http(s) URL, as given. */
  invalid: string[];
  /** Links given more than once; only the first is kept. */
  duplicates: number;
}

function dedupe(entries: ImportEntry[], invalid: string[]): ParsedImport {
  const seen = new Set<string>();
  const kept: ImportEntry[] = [];
  let duplicates = 0;
  for (const entry of entries) {
    const key = normalizeContentUrl(entry.url);
    if (!key) {
      invalid.push(entry.url);
      continue;
    }
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    kept.push({ ...entry, url: entry.url.trim() });
  }
  return { entries: kept, invalid, duplicates };
}

/** Links pasted one per line. Blank lines are ignored. */
export function parsePastedLinks(text: string): ParsedImport {
  const entries = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((url) => ({ url }));
  return dedupe(entries, []);
}

/** Rows of an RFC 4180 CSV: quoted fields may hold commas, quotes ("") and line breaks. */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"' && field === "") {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") {
        i++;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** Header names accepted for each column, lowercased. */
const COLUMNS: Record<keyof ImportEntry, string[]> = {
  url: ["url", "link"],
  title: ["title", "name"],
  description: ["description", "summary"],
  author: ["author", "speaker"],
  categories: ["category", "categories"],
  passages: ["passages", "passage", "references", "verses", "scripture"],
};

/**
 * A spreadsheet export with a header row. Only a `url` (or `link`) column is
 * required; `title`, `description`, `author`, `categories` (separated by
 * `;`) and `passages` are used when present. Null when there's no link
 * column to read.
 */
export function parseImportCsv(text: string): ParsedImport | null {
  const [header, ...rows] = parseCsvRows(text.replace(/^\uFEFF/, ""));
  if (!header) {
    return null;
  }
  const names = header.map((name) => name.trim().toLowerCase());
  const index = Object.fromEntries(
    Object.entries(COLUMNS).map(([key, aliases]) => [
      key,
      names.findIndex((name) => aliases.includes(name)),
    ])
  ) as Record<keyof ImportEntry, number>;
  if (index.url < 0) {
    return null;
  }

  const cell = (row: string[], key: keyof ImportEntry) => {
    const value = index[key] >= 0 ? row[index[key]]?.trim() : undefined;
    return value ? value : undefined;
  };
  const entries = rows.map((row): ImportEntry => {
    const categories = cell(row, "categories")
      ?.split(";")
      .map((name) => name.trim())
      .filter(Boolean);
    return {
      url: cell(row, "url") ?? "",
      ...(cell(row, "title") ? { title: cell(row, "title") } : {}),
      ...(cell(row, "description")
        ? { description: cell(row, "description") }
        : {}),
      ...(cell(row, "author") ? { author: cell(row, "author") } : {}),
      ...(categories?.length ? { categories } : {}),
      ...(cell(row, "passages") ? { passages: cell(row, "passages") } : {}),
    };
  });
  return dedupe(entries, []);
}
