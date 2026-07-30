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
  const pattern =
    /\b((?:\d+\s?)?[A-Za-z][A-Za-z0-9]*)[\s\.]+(\d+)(?:[:\.](\d+))?(?:[-–—](\d+)(?:[:\.](\d+))?)?/g;

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

    if (!bookStr || !chapterStr) continue;

    const bookId = getBookId(bookStr);
    if (!bookId) continue;

    const chapter = parseInt(chapterStr);
    if (isNaN(chapter)) continue;

    const verse = verseStr !== undefined ? parseInt(verseStr) : undefined;
    if (verse !== undefined && isNaN(verse)) continue;

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
const BOOK_ID_MAP: Map<string, BookId> = new Map([
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
]);

/**
 * Gets the ID of the given book.
 * Returns null if the ID could not be found.
 * @param book The name/ID of the book.
 */
export function getBookId(book: string): BookId | null {
  const bookLower = book.toLowerCase().replaceAll(/\s+/g, "");

  const id = BOOK_ID_MAP.get(bookLower);
  if (id) {
    return id;
  }

  for (const [key, id] of BOOK_ID_MAP) {
    if (bookLower.startsWith(key)) {
      return id;
    }
  }

  return null;
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
