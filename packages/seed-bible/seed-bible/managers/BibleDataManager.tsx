import { signal, effect, type Signal } from "@preact/signals";
import { safeLocalStorage } from "../app/ssrEnv";
import {
  FreeUseBibleAPI,
  type ApiRequestOptions,
  type Translation,
  type TranslationBookChapter,
  type TranslationBooks,
} from "../managers/FreeUseBibleAPI";
import {
  createOfflineTranslationsManager,
  type OfflineTranslationsManager,
} from "../managers/OfflineTranslationsManager";
import type { OfflineTranslationStore } from "../managers/OfflineTranslationStore";

/** How a set of translations should be folded into the known-translations list. */
export interface MergeTranslationsOptions {
  /**
   * When true, translations that are already known are left untouched instead of
   * being replaced.
   *
   * Use this for metadata that may be older than what the app already has — most
   * importantly a downloaded translation's saved copy, whose `sha256` is from
   * download time. Overwriting a freshly fetched hash with that older one would
   * make an available update look like it had already been applied.
   */
  fillOnly?: boolean;
}

export interface BibleDataManager {
  endpoints: Signal<string[]>;
  availableTranslations: Signal<Translation[]>;
  translationBooks: Signal<Map<string, TranslationBooks>>;
  api: FreeUseBibleAPI;

  /**
   * Translations the user has downloaded to their device for offline reading.
   *
   * Every read below checks this first, so a downloaded translation is served
   * from the device rather than the network.
   */
  offline: OfflineTranslationsManager;

  /**
   * Loads an endpoint's translation list and merges it into
   * `availableTranslations`.
   *
   * @param endpoint The endpoint to read. Defaults to the API's own endpoint.
   * @param options Pass `refresh: true` to bypass the API's response cache. Only
   * needed when the caller depends on values that change over time, such as each
   * translation's content hash.
   */
  getTranslations: (
    endpoint?: string,
    options?: { refresh?: boolean }
  ) => Promise<Translation[]>;
  getTranslationBooks: (translationId: string) => Promise<TranslationBooks>;

  /**
   * Returns the already-downloaded book catalog for a translation, or null when
   * it has not been fetched yet. Never hits the network, so callers can answer
   * questions like "which chapter comes next" synchronously.
   *
   * Reads the cache **untracked**, so calling this from inside an `effect()` or
   * `computed()` does not subscribe that reaction to the catalog. Reactive
   * consumers should read the `translationBooks` signal directly instead.
   */
  getCachedTranslationBooks: (translationId: string) => TranslationBooks | null;
  getTranslationBookChapter: (
    translationId: string,
    book: string,
    chapter: number | string,
    options?: ApiRequestOptions
  ) => Promise<TranslationBookChapter>;
  getNextChapter: (
    chapter: TranslationBookChapter,
    options?: ApiRequestOptions
  ) => Promise<TranslationBookChapter | null>;
  getPreviousChapter: (
    chapter: TranslationBookChapter,
    options?: ApiRequestOptions
  ) => Promise<TranslationBookChapter | null>;

  /**
   * Gets the API endpoint associated with a given translation. If the translation is not associated with a specific endpoint, it returns the default endpoint.
   * @param translationId The ID of the translation for which to retrieve the API endpoint.
   * @returns
   */
  getTranslationEndpointInfo: (translationId: string) => {
    translationId: string;
    endpoint: string;
    isDefault: boolean;
  };

  /**
   * Gets a string that can be used in the translation query parameter to load the specified translation.
   * @param translationId The ID of the translation.
   */
  buildTranslationId: (translationId: string) => string;
}

function normalizeEndpoint(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    if (!url.pathname.endsWith("/")) {
      url.pathname = `${url.pathname}/`;
    }
    return url.href;
  } catch {
    return endpoint;
  }
}

export type BookId =
  // 'FRT' |
  | "GEN"
  | "EXO"
  | "LEV"
  | "NUM"
  | "DEU"
  | "JOS"
  | "JDG"
  | "RUT"
  | "1SA"
  | "2SA"
  | "1KI"
  | "2KI"
  | "1CH"
  | "2CH"
  | "EZR"
  | "NEH"
  | "EST"
  | "JOB"
  | "PSA"
  | "PRO"
  | "ECC"
  | "SNG"
  | "ISA"
  | "JER"
  | "LAM"
  | "EZK"
  | "DAN"
  | "HOS"
  | "JOL"
  | "AMO"
  | "OBA"
  | "JON"
  | "MIC"
  | "NAM"
  | "HAB"
  | "ZEP"
  | "HAG"
  | "ZEC"
  | "MAL"
  | "MAT"
  | "MRK"
  | "LUK"
  | "JHN"
  | "ACT"
  | "ROM"
  | "1CO"
  | "2CO"
  | "GAL"
  | "EPH"
  | "PHP"
  | "COL"
  | "1TH"
  | "2TH"
  | "1TI"
  | "2TI"
  | "TIT"
  | "PHM"
  | "HEB"
  | "JAS"
  | "1PE"
  | "2PE"
  | "1JN"
  | "2JN"
  | "3JN"
  | "JUD"
  | "REV"
  | "TOB"
  | "JDT"
  | "ESG"
  | "WIS"
  | "SIR"
  | "BAR"
  | "LJE"
  | "S3Y"
  | "SUS"
  | "BEL"
  | "1MA"
  | "2MA"
  | "3MA"
  | "4MA"
  | "1ES"
  | "2ES"
  | "MAN"
  | "PS2"
  | "ODA"
  | "PSS"
  | "EZA"
  | "5EZ"
  | "6EZ"
  | "DAG"
  | "PS3"
  | "2BA"
  | "LBA"
  | "JUB"
  | "ENO"
  | "1MQ"
  | "2MQ"
  | "3MQ"
  | "REP"
  | "4BA"
  | "LAO";

export interface VerseRef {
  book: BookId;
  chapter: number;
  verse?: number;
  /** The text content following the verse reference, e.g. "In the beginning..." in "GEN 1:1 In the beginning..." */
  content?: string;
  /** End chapter for multi-chapter ranges, e.g. 2 in "GEN 1:1-2:3" */
  endChapter?: number;
  /** End verse for multi-verse ranges, e.g. 3 in "GEN 1:1-1:3" */
  endVerse?: number;
}

export interface VerseRefMatch {
  ref: VerseRef;
  /** Inclusive start index of the match within the source text. */
  start: number;
  /** Exclusive end index of the match within the source text. */
  end: number;
}

/**
 * Parses the given verse reference.
 * Formatted like "GEN 1:1".
 *
 * @param text The reference to parse.
 */
export function parseVerseReference(text: string): VerseRef | null {
  // Formats supported:
  //   GEN 1          – chapter only
  //   GEN 1:1        – chapter + verse
  //   GEN 5-7        – chapter range (hyphen, en dash, or em dash)
  //   GEN 5:16-19    – verse range within one chapter
  //   GEN 1:1-2:10   – cross-chapter verse range
  const match = text.match(
    /^\s*([0-9A-Za-z\s]+)[\s\.]+(\d+)(?:[:\.](\d+))?(?:[-–—](\d+)(?:[:\.](\d+))?)?/
  );

  if (!match) {
    return null;
  }

  const [reference, book, chapterStr, verseStr, rangeStartStr, rangeEndStr] =
    match;

  if (!book || !chapterStr) {
    return null;
  }

  const chapter = parseInt(chapterStr);
  if (isNaN(chapter)) {
    return null;
  }

  const verse = verseStr !== undefined ? parseInt(verseStr) : undefined;
  if (verse !== undefined && isNaN(verse)) {
    return null;
  }

  let endChapter: number | undefined;
  let endVerse: number | undefined;

  if (rangeStartStr) {
    if (verse === undefined) {
      // No verse → range is chapter-based: "GEN 5-7"
      endChapter = parseInt(rangeStartStr);
    } else if (rangeEndStr) {
      // Both sides have a colon separator: "GEN 1:1-2:10"
      endChapter = parseInt(rangeStartStr);
      endVerse = parseInt(rangeEndStr);
    } else {
      // Verse present, no colon on range end: "GEN 5:16-19"
      endVerse = parseInt(rangeStartStr);
    }
  }

  const content =
    reference.length !== text.length
      ? text.substring(reference.length).trim() || undefined
      : undefined;

  return {
    book: (getBookId(book) ?? book) as BookId,
    chapter,
    verse,
    content,
    endChapter,
    endVerse,
  };
}

/**
 * Finds and parses all verse references in the given text, returning each
 * with its character offsets (start inclusive, end exclusive).
 */
export function parseVerseReferences(text: string): VerseRefMatch[] {
  const results: VerseRefMatch[] = [];
  // Book name patterns:
  //   (?:\d+\s?)? — optional leading digit (with optional space) for "1SA", "1 Kings"
  //   [A-Za-z][A-Za-z0-9]* — word starting with a letter, e.g. "GEN", "John", "Kings"
  //   (?:\s+[Oo][Ff]\s+[A-Za-z][A-Za-z0-9]*)? — optional "of …" for "Song of Solomon"
  const pattern =
    /\b((?:\d+\s?)?[A-Za-z][A-Za-z0-9]*(?:\s+[Oo][Ff]\s+[A-Za-z][A-Za-z0-9]*)?)[\s\.]+(\d+)(?:[:\.](\d+))?(?:[-–—](\d+)(?:[:\.](\d+))?)?/g;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const [
      fullMatch,
      bookStr,
      chapterStr,
      verseStr,
      rangeStartStr,
      rangeEndStr,
    ] = match;

    // Rejected candidates must retry one character later. Otherwise a false
    // hit like "See 1" consumes the leading digit of "1 Corinthians" and the
    // real numbered-book reference is never found.
    const retryFromNextChar = () => {
      pattern.lastIndex = match!.index + 1;
    };

    if (!bookStr || !chapterStr) {
      retryFromNextChar();
      continue;
    }

    const bookId = getBookId(bookStr);
    if (!bookId) {
      retryFromNextChar();
      continue;
    }

    const chapter = parseInt(chapterStr);
    if (isNaN(chapter)) {
      retryFromNextChar();
      continue;
    }

    const verse = verseStr !== undefined ? parseInt(verseStr) : undefined;
    if (verse !== undefined && isNaN(verse)) {
      retryFromNextChar();
      continue;
    }

    let endChapter: number | undefined;
    let endVerse: number | undefined;

    if (rangeStartStr) {
      if (verse === undefined) {
        endChapter = parseInt(rangeStartStr);
      } else if (rangeEndStr) {
        endChapter = parseInt(rangeStartStr);
        endVerse = parseInt(rangeEndStr);
      } else {
        endVerse = parseInt(rangeStartStr);
      }
    }

    results.push({
      ref: {
        book: bookId as BookId,
        chapter,
        verse,
        endChapter,
        endVerse,
      },
      start: match.index,
      end: match.index + fullMatch.length,
    });
  }

  return results;
}

/**
 * Defines a map that maps the book ID to the USFM Book identifier.
 */
export const BOOK_ID_MAP: Map<string, BookId> = new Map([
  ["gen", "GEN"],
  ["genesis", "GEN"],
  ["exo", "EXO"],
  ["exodus", "EXO"],
  ["lev", "LEV"],
  ["lev", "LEV"],
  ["laviticus", "LEV"],
  ["num", "NUM"],
  ["numbers", "NUM"],
  ["deu", "DEU"],
  ["deuteronomy", "DEU"],
  ["jos", "JOS"],
  ["joshua", "JOS"],
  ["jdg", "JDG"],
  ["judges", "JDG"],
  ["rut", "RUT"],
  ["ruth", "RUT"],
  ["1sa", "1SA"],
  ["1samuel", "1SA"],
  ["2sa", "2SA"],
  ["2samuel", "2SA"],
  ["1ki", "1KI"],
  ["1kings", "1KI"],
  ["1kgs", "1KI"],
  ["2ki", "2KI"],
  ["2kings", "2KI"],
  ["2kgs", "2KI"],
  ["1ch", "1CH"],
  ["1chronicles", "1CH"],
  ["chronicles1", "1CH"],
  ["2ch", "2CH"],
  ["2chronicles", "2CH"],
  ["chronicles2", "2CH"],
  ["ezr", "EZR"],
  ["ezra", "EZR"],
  ["neh", "NEH"],
  ["nehemiah", "NEH"],
  ["est", "EST"],
  ["ester", "EST"],
  ["job", "JOB"],
  ["ps", "PSA"],
  ["psa", "PSA"],
  ["psalms", "PSA"],
  ["psalm", "PSA"],
  ["pr", "PRO"],
  ["pro", "PRO"],
  ["proverbs", "PRO"],
  ["ecc", "ECC"],
  ["ecclesiastes", "ECC"],
  ["eccl", "ECC"],
  ["sng", "SNG"],
  ["song", "SNG"],
  ["songofsolomon", "SNG"],
  ["songofsongs", "SNG"],
  ["isa", "ISA"],
  ["isaiah", "ISA"],
  ["jer", "JER"],
  ["jeremiah", "JER"],
  ["lam", "LAM"],
  ["lamentations", "LAM"],
  ["ezk", "EZK"],
  ["ezekiel", "EZK"],
  ["ezek", "EZK"],
  ["dan", "DAN"],
  ["daniel", "DAN"],
  ["hos", "HOS"],
  ["hosea", "HOS"],
  ["jol", "JOL"],
  ["joel", "JOL"],
  ["amo", "AMO"],
  ["amos", "AMO"],
  ["oba", "OBA"],
  ["obadiah", "OBA"],
  ["jon", "JON"],
  ["jonah", "JON"],
  ["mic", "MIC"],
  ["micah", "MIC"],
  ["nam", "NAM"],
  ["nahum", "NAM"],
  ["nah", "NAM"],
  ["hab", "HAB"],
  ["habakkuk", "HAB"],
  ["zep", "ZEP"],
  ["zepaniah", "ZEP"],
  ["hag", "HAG"],
  ["haggai", "HAG"],
  ["zec", "ZEC"],
  ["zechariah", "ZEC"],
  ["mal", "MAL"],
  ["malachi", "MAL"],
  ["mat", "MAT"],
  ["matthew", "MAT"],
  ["mrk", "MRK"],
  ["mark", "MRK"],
  ["luk", "LUK"],
  ["luke", "LUK"],
  ["jhn", "JHN"],
  ["john", "JHN"],
  ["act", "ACT"],
  ["acts", "ACT"],
  ["rom", "ROM"],
  ["romans", "ROM"],
  ["1co", "1CO"],
  ["1corinthians", "1CO"],
  ["2co", "2CO"],
  ["2corinthians", "2CO"],
  ["gal", "GAL"],
  ["galatians", "GAL"],
  ["eph", "EPH"],
  ["ephesians", "EPH"],
  ["php", "PHP"],
  ["philippians", "PHP"],
  ["phil", "PHP"],
  ["col", "COL"],
  ["colossians", "COL"],
  ["1th", "1TH"],
  ["1thessalonians", "1TH"],
  ["2th", "2TH"],
  ["2thessalonians", "2TH"],
  ["1ti", "1TI"],
  ["1timothy", "1TI"],
  ["2ti", "2TI"],
  ["2timothy", "2TI"],
  ["tit", "TIT"],
  ["titus", "TIT"],
  ["phm", "PHM"],
  ["philemon", "PHM"],
  ["phlm", "PHM"],
  ["heb", "HEB"],
  ["hebrews", "HEB"],
  ["jas", "JAS"],
  ["james", "JAS"],
  ["1pe", "1PE"],
  ["1peter", "1PE"],
  ["2pe", "2PE"],
  ["2peter", "2PE"],
  ["1jn", "1JN"],
  ["1john", "1JN"],
  ["2jn", "2JN"],
  ["2john", "2JN"],
  ["3jn", "3JN"],
  ["3john", "3JN"],
  ["jud", "JUD"],
  ["jude", "JUD"],
  ["rev", "REV"],
  ["revelation", "REV"],
  ["tob", "TOB"],
  ["jdt", "JDT"],
  // Spelled out because the prefix fallback below would otherwise hand
  // "judith" to Jude ("jud") and "ecclesiasticus" to Ecclesiastes ("ecc").
  // Exact lookups run before that fallback, so position here doesn't matter.
  ["judith", "JDT"],
  ["esg", "ESG"],
  ["wis", "WIS"],
  ["sir", "SIR"],
  ["ecclesiasticus", "SIR"],
  ["bar", "BAR"],
  ["lje", "LJE"],
  ["s3y", "S3Y"],
  ["sus", "SUS"],
  ["bel", "BEL"],
  ["1ma", "1MA"],
  ["2ma", "2MA"],
  ["3ma", "3MA"],
  ["4ma", "4MA"],
  ["1es", "1ES"],
  ["2es", "2ES"],
  ["man", "MAN"],
  ["ps2", "PS2"],
  ["oda", "ODA"],
  ["pss", "PSS"],
  ["eza", "EZA"],
  ["5ez", "5EZ"],
  ["6ez", "6EZ"],
  ["dag", "DAG"],
  ["ps3", "PS3"],
  ["2ba", "2BA"],
  ["lba", "LBA"],
  ["jub", "JUB"],
  ["eno", "ENO"],
  ["1mq", "1MQ"],
  ["2mq", "2MQ"],
  ["3mq", "3MQ"],
  ["rep", "REP"],
  ["4ba", "4BA"],
  ["lao", "LAO"],
]);

/**
 * Gets the ID of the given book.
 * Returns null if the ID could not be found.
 * @param book The name/ID of the book. Whitespace and hyphens are ignored, so
 * both "Song of Solomon" and the URL slug "song-of-solomon" resolve.
 */
export function getBookId(book: string): BookId | null {
  const hadSpaces = /\s/.test(book.trim());
  const bookLower = book.toLowerCase().replaceAll(/[\s-]+/g, "");

  const id = BOOK_ID_MAP.get(bookLower);
  if (id) {
    return id;
  }

  // Loose prefix fallback is for single-token inputs (e.g. "Leviticus" → lev)
  // and numbered-book abbreviations (e.g. "1 chron" → 1ch). Multi-word phrases
  // that aren't numbered — like "Song of Moses" — must match a book name
  // exactly, or not at all.
  if (!hadSpaces || /^\d/.test(bookLower)) {
    for (const [key, mappedId] of BOOK_ID_MAP) {
      if (bookLower.startsWith(key)) {
        return mappedId;
      }
    }
  }

  return null;
}

/**
 * Canonical, human-readable URL slug for each book, used for path-based
 * routing (e.g. "/genesis/1"). Apocrypha books fall back to their lowercase
 * USFM code since they have no full-name entry in `BOOK_ID_MAP`.
 */
export const BOOK_SLUGS: Record<BookId, string> = {
  GEN: "genesis",
  EXO: "exodus",
  LEV: "leviticus",
  NUM: "numbers",
  DEU: "deuteronomy",
  JOS: "joshua",
  JDG: "judges",
  RUT: "ruth",
  "1SA": "1-samuel",
  "2SA": "2-samuel",
  "1KI": "1-kings",
  "2KI": "2-kings",
  "1CH": "1-chronicles",
  "2CH": "2-chronicles",
  EZR: "ezra",
  NEH: "nehemiah",
  EST: "esther",
  JOB: "job",
  PSA: "psalms",
  PRO: "proverbs",
  ECC: "ecclesiastes",
  SNG: "song-of-solomon",
  ISA: "isaiah",
  JER: "jeremiah",
  LAM: "lamentations",
  EZK: "ezekiel",
  DAN: "daniel",
  HOS: "hosea",
  JOL: "joel",
  AMO: "amos",
  OBA: "obadiah",
  JON: "jonah",
  MIC: "micah",
  NAM: "nahum",
  HAB: "habakkuk",
  ZEP: "zephaniah",
  HAG: "haggai",
  ZEC: "zechariah",
  MAL: "malachi",
  MAT: "matthew",
  MRK: "mark",
  LUK: "luke",
  JHN: "john",
  ACT: "acts",
  ROM: "romans",
  "1CO": "1-corinthians",
  "2CO": "2-corinthians",
  GAL: "galatians",
  EPH: "ephesians",
  PHP: "philippians",
  COL: "colossians",
  "1TH": "1-thessalonians",
  "2TH": "2-thessalonians",
  "1TI": "1-timothy",
  "2TI": "2-timothy",
  TIT: "titus",
  PHM: "philemon",
  HEB: "hebrews",
  JAS: "james",
  "1PE": "1-peter",
  "2PE": "2-peter",
  "1JN": "1-john",
  "2JN": "2-john",
  "3JN": "3-john",
  JUD: "jude",
  REV: "revelation",
  TOB: "tob",
  JDT: "jdt",
  ESG: "esg",
  WIS: "wis",
  SIR: "sir",
  BAR: "bar",
  LJE: "lje",
  S3Y: "s3y",
  SUS: "sus",
  BEL: "bel",
  "1MA": "1ma",
  "2MA": "2ma",
  "3MA": "3ma",
  "4MA": "4ma",
  "1ES": "1es",
  "2ES": "2es",
  MAN: "man",
  PS2: "ps2",
  ODA: "oda",
  PSS: "pss",
  EZA: "eza",
  "5EZ": "5ez",
  "6EZ": "6ez",
  DAG: "dag",
  PS3: "ps3",
  "2BA": "2ba",
  LBA: "lba",
  JUB: "jub",
  ENO: "eno",
  "1MQ": "1mq",
  "2MQ": "2mq",
  "3MQ": "3mq",
  REP: "rep",
  "4BA": "4ba",
  LAO: "lao",
};

/**
 * Gets the canonical URL slug for a book (e.g. "GEN" -> "genesis"), used to
 * build path-based routes and the canonical URL. Falls back to a lowercased
 * version of the id itself for an unrecognized value (e.g. a malformed
 * `?book=` from an old link) rather than emitting "undefined" as a path
 * segment.
 */
export function getBookSlug(bookId: BookId): string {
  return BOOK_SLUGS[bookId] ?? String(bookId).toLowerCase();
}

/** Classic Levenshtein (single-character insert/delete/substitute) edit distance. */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previousRow = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const currentRow = [i];
    for (let j = 1; j <= b.length; j++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      currentRow.push(
        Math.min(
          currentRow[j - 1]! + 1, // insertion
          previousRow[j]! + 1, // deletion
          previousRow[j - 1]! + substitutionCost // substitution
        )
      );
    }
    previousRow = currentRow;
  }

  return previousRow[b.length]!;
}

/**
 * Finds the book whose alias/abbreviation or URL slug is closest to `input`
 * by edit distance, for correcting a close typo (e.g. "genesys" -> "GEN").
 * Returns null when there's no confident, unambiguous match — a wrong
 * redirect is worse than falling through to a "book not found" response, so
 * this is deliberately conservative: `input` must be long enough to judge,
 * the best match's distance must be small relative to the candidate's
 * length, and it must not tie with a different book at the same distance.
 */
export function findClosestBookId(input: string): BookId | null {
  const normalized = input.toLowerCase().replaceAll(/[\s-]+/g, "");
  if (normalized.length < 3) {
    return null;
  }

  const candidates = new Map<string, BookId>(BOOK_ID_MAP);
  for (const bookId of Object.keys(BOOK_SLUGS) as BookId[]) {
    candidates.set(BOOK_SLUGS[bookId].replaceAll("-", ""), bookId);
  }

  let bestDistance = Infinity;
  let bestId: BookId | null = null;
  let bestIsAmbiguous = false;

  for (const [candidate, id] of candidates) {
    const distance = levenshteinDistance(normalized, candidate);
    const maxAllowedDistance = Math.min(2, Math.ceil(candidate.length * 0.3));
    if (distance > maxAllowedDistance) {
      continue;
    }

    if (distance < bestDistance) {
      bestDistance = distance;
      bestId = id;
      bestIsAmbiguous = false;
    } else if (distance === bestDistance && id !== bestId) {
      bestIsAmbiguous = true;
    }
  }

  return bestIsAmbiguous ? null : bestId;
}

export interface CreateBibleDataManagerOptions {
  /**
   * Where downloaded translations are stored. Defaults to IndexedDB; tests pass
   * an in-memory store, and null disables offline downloads entirely.
   */
  offlineStore?: OfflineTranslationStore | null;
}

export function createBibleDataManager(
  api: FreeUseBibleAPI,
  options: CreateBibleDataManagerOptions = {}
): BibleDataManager {
  const defaultEndpoint = normalizeEndpoint(api.endpoint);
  const endpoints = signal<string[]>([defaultEndpoint]);
  const availableTranslations = signal<Translation[]>([]);
  const translationBooks = signal<Map<string, TranslationBooks>>(new Map());
  const translationEndpoints = signal<Map<string, string>>(new Map());

  const getTranslationEndpointInfo = (translationId: string) => {
    const endpoint = getEndpointForTranslation(translationId);
    return {
      translationId,
      endpoint,
      isDefault: endpoint === defaultEndpoint,
    };
  };

  const getEndpointForTranslation = (translationId: string): string => {
    return translationEndpoints.value.get(translationId) ?? defaultEndpoint;
  };

  const ensureEndpointTracked = (endpoint: string) => {
    if (endpoints.value.includes(endpoint)) {
      return;
    }
    endpoints.value = [...endpoints.value, endpoint];
  };

  const mergeTranslations = (
    endpoint: string,
    nextTranslations: Translation[],
    options?: MergeTranslationsOptions
  ) => {
    const merged = new Map(
      availableTranslations.value.map((translation) => [
        translation.id,
        translation,
      ])
    );

    const nextTranslationEndpoints = new Map(translationEndpoints.value);
    for (const translation of nextTranslations) {
      if (options?.fillOnly && merged.has(translation.id)) {
        // Something already knows about this translation, and what it knows may
        // be newer than what we were handed — leave it alone. The endpoint is
        // still filled in below if it's missing, since that never goes stale.
        if (!nextTranslationEndpoints.has(translation.id)) {
          nextTranslationEndpoints.set(translation.id, endpoint);
        }
        continue;
      }
      merged.set(translation.id, translation);
      nextTranslationEndpoints.set(translation.id, endpoint);
    }

    availableTranslations.value = Array.from(merged.values());
    translationEndpoints.value = nextTranslationEndpoints;
  };

  const getTranslations = async (
    endpoint?: string,
    options?: { refresh?: boolean }
  ): Promise<Translation[]> => {
    const normalizedEndpoint = normalizeEndpoint(endpoint ?? defaultEndpoint);
    ensureEndpointTracked(normalizedEndpoint);

    const result = await api.getAvailableTranslations(
      normalizedEndpoint,
      options
    );
    mergeTranslations(normalizedEndpoint, result.translations);
    return result.translations;
  };

  // Created here (rather than by the caller) so it can share this manager's
  // endpoint resolution and translation list. It must come after
  // `getTranslations` because the update check calls it.
  const offline = createOfflineTranslationsManager({
    api,
    store: options.offlineStore,
    availableTranslations,
    getEndpointForTranslation,
    // `refresh` matters here: the update check exists to notice a changed
    // content hash, which the API's response cache would otherwise hide.
    refreshTranslations: (endpoint) =>
      getTranslations(endpoint, { refresh: true }),
    mergeTranslations,
  });

  const getTranslationBooks = async (
    translationId: string,
    options?: ApiRequestOptions
  ): Promise<TranslationBooks> => {
    const existing = translationBooks.value.get(translationId);
    if (existing) {
      return existing;
    }

    const cacheBooks = (
      endpoint: string,
      books: TranslationBooks,
      options?: MergeTranslationsOptions
    ) => {
      const nextBooksMap = new Map(translationBooks.value);
      nextBooksMap.set(translationId, books);
      translationBooks.value = nextBooksMap;
      mergeTranslations(endpoint, [books.translation], options);
    };

    const downloadedBooks = offline.supported
      ? await offline.getTranslationBooks(translationId)
      : null;
    if (downloadedBooks) {
      // `fillOnly` because these books come from storage: the translation
      // metadata saved with them is from download time, so it must not overwrite
      // whatever the app has since learned from the API.
      cacheBooks(getEndpointForTranslation(translationId), downloadedBooks, {
        fillOnly: true,
      });
      return downloadedBooks;
    }

    const endpoint = getEndpointForTranslation(translationId);
    const books = await api.getTranslationBooks(
      translationId,
      endpoint,
      options
    );
    cacheBooks(endpoint, books);
    return books;
  };

  const getCachedTranslationBooks = (
    translationId: string
  ): TranslationBooks | null => {
    return translationBooks.peek().get(translationId) ?? null;
  };

  const getTranslationBookChapter = async (
    translationId: string,
    book: string,
    chapter: number | string,
    options?: ApiRequestOptions
  ): Promise<TranslationBookChapter> => {
    const chapterNumber = Number(chapter);
    if (Number.isFinite(chapterNumber) && offline.supported) {
      const downloaded = await offline.getTranslationBookChapter(
        translationId,
        book,
        chapterNumber
      );
      if (downloaded) {
        return downloaded;
      }
    }

    const endpoint = getEndpointForTranslation(translationId);
    return await api.getTranslationBookChapter(
      translationId,
      book,
      chapter,
      endpoint,
      options
    );
  };

  const getNextChapter = async (
    chapter: TranslationBookChapter,
    options?: ApiRequestOptions
  ) => {
    const downloaded = offline.supported
      ? await offline.getAdjacentChapter(chapter, "next")
      : null;
    if (downloaded) {
      return downloaded;
    }

    // Reaching here for a downloaded translation means the chapter genuinely
    // isn't stored, so the network is the right next stop. It costs nothing at
    // the end of the Bible: a chapter read from a download has no
    // `nextChapterApiLink` there, and `api.getNextChapter` answers null without
    // making a request.
    const endpoint = getEndpointForTranslation(chapter.translation.id);
    return await api.getNextChapter(chapter, endpoint, options);
  };

  const getPreviousChapter = async (
    chapter: TranslationBookChapter,
    options?: ApiRequestOptions
  ) => {
    const downloaded = offline.supported
      ? await offline.getAdjacentChapter(chapter, "previous")
      : null;
    if (downloaded) {
      return downloaded;
    }

    // As above — at Genesis 1 there is no previous link to follow, so this
    // resolves to null locally.
    const endpoint = getEndpointForTranslation(chapter.translation.id);
    return await api.getPreviousChapter(chapter, endpoint, options);
  };

  const buildTranslationId = (translationId: string) => {
    const endpoint = getTranslationEndpointInfo(translationId);
    if (endpoint.isDefault) {
      return translationId;
    } else {
      const translationUrl = new URL(
        `api/${translationId}/books.json`,
        endpoint.endpoint
      );
      return translationUrl.href;
    }
  };

  effect(() => {
    if (availableTranslations.value.length > 0) {
      safeLocalStorage.setItem(
        "availableTranslations",
        JSON.stringify(availableTranslations.value)
      );
    }
  });

  effect(() => {
    const stored = safeLocalStorage.getItem("availableTranslations");
    if (stored) {
      const parsed: Translation[] = JSON.parse(stored);
      availableTranslations.value = parsed;
    }
  });

  effect(() => {
    if (translationEndpoints.value.size > 0) {
      safeLocalStorage.setItem(
        "endpoints",
        JSON.stringify(Array.from(translationEndpoints.value.entries()))
      );
    }
  });

  effect(() => {
    const stored = safeLocalStorage.getItem("endpoints");
    if (stored) {
      const parsed: [string, string][] = JSON.parse(stored);
      translationEndpoints.value = new Map(parsed);
    }
  });

  return {
    endpoints,
    availableTranslations,
    translationBooks,
    api,
    offline,
    getTranslations,
    getTranslationBooks,
    getCachedTranslationBooks,
    getTranslationBookChapter,
    getNextChapter,
    getPreviousChapter,
    getTranslationEndpointInfo,
    buildTranslationId,
  };
}
