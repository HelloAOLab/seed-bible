import type { VerseIndexEntry } from "ext_AI_Transcript.main.types";

export const HELLOAO_BASE = "https://bible.helloao.org/api";
export const AVAILABLE_TRANSLATIONS_URL = `${HELLOAO_BASE}/available_translations.json`;
export const completeUrl = (translation: string) =>
  `${HELLOAO_BASE}/${translation}/complete.json`;

/** Bump when the shape of VerseIndexEntry changes, to force a rebuild. */
export const CORPUS_VERSION = 1;

// ---- Raw JSON shapes (only the fields we read) -----------------------------

interface RawVerseObject {
  text?: string;
  noteId?: unknown;
  lineBreak?: unknown;
  heading?: unknown;
  [k: string]: unknown;
}
type RawVerseContent = string | RawVerseObject;

interface RawContentItem {
  type?: string;
  number?: number;
  content?: RawVerseContent[];
}
interface RawChapterWrapper {
  chapter?: { number?: number; content?: RawContentItem[] };
}
interface RawBook {
  id?: string;
  name?: string;
  chapters?: RawChapterWrapper[];
}
export interface CompleteJson {
  translation?: unknown;
  books?: RawBook[];
}

export interface TranslationInfo {
  id: string;
  shortName?: string;
  name?: string;
  sha256?: string;
}

// ---- Pure helpers (unit-tested) --------------------------------------------

/**
 * Build a verse's plain text from its content array.
 *
 * Keep plain strings and the `.text` of formatted-text (poetry) objects; SKIP
 * footnote refs (`noteId`), line breaks (`lineBreak`), and inline headings
 * (`heading`). Verse fragments do NOT carry their own surrounding spaces, so we
 * join with a space and then collapse whitespace — otherwise text around a
 * footnote merges (e.g. `light,”and`).
 */
export function verseText(content: RawVerseContent[]): string {
  // Use host-native array methods, not an explicit loop: the AUX interpreter
  // injects an energy-budget check into every for/while body but NOT into native
  // iteration. This runs once per verse (~31k×) during indexing, so an explicit
  // loop here would exhaust the budget. See buildVerseIndex for the rationale.
  return content
    .map((item) => {
      if (typeof item === "string") return item;
      if (!item || typeof item !== "object") return "";
      if ("noteId" in item || "lineBreak" in item || "heading" in item)
        return "";
      return typeof item.text === "string" ? item.text : "";
    })
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalize text for fuzzy matching: lowercase, strip punctuation and quotes,
 * collapse whitespace. Keeps letters/digits across scripts plus apostrophes
 * inside words are dropped to a single token boundary.
 */
export function normalizeText(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      // Replace anything that isn't a letter or number with a space.
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Build the slimmed verse index from a parsed complete.json.
 *
 * IMPORTANT (AUX energy budget): the interpreter resets the per-run energy
 * budget only at the start of a top-level action (e.g. the user's click) and
 * decrements it on every for/while iteration; awaits do NOT refresh it, so the
 * whole transcription shares one budget. Indexing a translation is ~31k verses,
 * which would blow that budget with explicit loops. Host-native array methods
 * (flatMap/map/filter) iterate outside the interpreter and cost no energy, so we
 * build the index entirely with them.
 */
export function buildVerseIndex(complete: CompleteJson): VerseIndexEntry[] {
  const books = complete.books ?? [];
  return books.flatMap((book) => {
    const bookId = book.id;
    if (!bookId) return [];
    return (book.chapters ?? []).flatMap((wrapper) => {
      const chapter = wrapper.chapter;
      if (!chapter) return [];
      const chapterNumber = Number(chapter.number);
      return (chapter.content ?? [])
        .filter(
          (item) =>
            item.type === "verse" && Number.isFinite(Number(item.number))
        )
        .map((item) => ({
          verseNumber: Number(item.number),
          text: verseText(item.content ?? []),
        }))
        .filter((v) => v.text)
        .map((v) => ({
          ref: `${bookId}:${chapterNumber}:${v.verseNumber}`,
          bookId,
          chapter: chapterNumber,
          verse: v.verseNumber,
          text: v.text,
          normalizedText: normalizeText(v.text),
        }));
    });
  });
}

// ---- Network ---------------------------------------------------------------

/** Look up a translation's listing entry (for its sha256 cache key). */
export async function fetchTranslationInfo(
  translation: string
): Promise<TranslationInfo | null> {
  const res = await web.get(AVAILABLE_TRANSLATIONS_URL);
  if (!res.data) throw new Error(`available_translations ${res.status}`);
  const json = (await res.data) as { translations?: TranslationInfo[] };
  const list = json.translations ?? [];
  return list.find((t) => t.id === translation) ?? null;
}

export async function fetchComplete(
  translation: string,
  onProgress?: (fraction: number) => void
): Promise<CompleteJson> {
  onProgress?.(0);
  const res = await web.get(completeUrl(translation));
  if (!res.data) {
    throw new Error(`complete.json ${res.status}`);
  }
  onProgress?.(1);
  return res.data as CompleteJson;
}
