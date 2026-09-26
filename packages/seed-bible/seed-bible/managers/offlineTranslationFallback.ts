import type { Translation, TranslationBook } from "./FreeUseBibleAPI";
import {
  bibleLanguageCodesForUi,
  bibleLanguageToUiLocale,
  DEFAULT_TRANSLATIONS_BY_LANGUAGE,
  resolveChapterInBook,
} from "./BibleReadingManager";

/** A downloaded translation's metadata, as needed to pick a load-failure fallback. */
export interface OfflineFallbackCandidate {
  translation: Translation;
  downloadedAt: number;
}

/**
 * Downloaded translations the reader can switch to when a chapter fails to load.
 *
 * Only a download already on this device is eligible, and it must be a
 * different translation from the one that failed. Language matching is:
 *
 * - Same Bible-API language as the requested translation, when that language
 *   is known (including codes that share a UI locale, so `arb` and `ara` both
 *   count as Arabic).
 * - Otherwise the UI language, so a failed load of an unknown-language
 *   translation can still recover to a download the reader can actually read.
 *
 * A match also has to contain the chapter that failed. The download summary
 * does not include a book list, so the caller looks each candidate up (the
 * cached catalog, or the books stored with the download) and passes that
 * here. A candidate with no catalog, or whose catalog lacks this book, or
 * whose copy of the book does not include this chapter, is dropped. An
 * out-of-range chapter would otherwise be quietly rewritten to the book's
 * first chapter. When nothing survives, the caller should not offer a switch.
 *
 * When several downloads qualify they are all returned, with the hardcoded
 * default for that language first if it is among them, otherwise newest first.
 */
export function findOfflineTranslationFallbacks(params: {
  currentTranslationId: string | null | undefined;
  currentTranslationLanguage: string | null | undefined;
  uiLanguage: string;
  downloaded: readonly OfflineFallbackCandidate[];
  /** The book the reader is on. Without one, nothing is offered. */
  bookId: string | null | undefined;
  /** The chapter the reader is on. Omitted means "the book is enough". */
  chapterNumber: number | null | undefined;
  /**
   * Book catalog for a candidate, or null when it isn't known locally.
   * Never fetched over the network: a chapter load just failed, and a
   * catalog we can't confirm must not be offered.
   */
  booksFor: (translationId: string) => readonly TranslationBook[] | null;
}): Translation[] {
  const currentId = params.currentTranslationId ?? "";
  const others = params.downloaded.filter(
    (entry) => entry.translation.id !== currentId
  );
  if (others.length === 0) {
    return [];
  }

  const requestedLanguage = nonemptyLanguage(params.currentTranslationLanguage);
  const matches = requestedLanguage
    ? others.filter((entry) =>
        sameBibleLanguage(entry.translation.language, requestedLanguage)
      )
    : others.filter((entry) =>
        matchesUiLanguage(entry.translation.language, params.uiLanguage)
      );
  const containing = matches.filter((entry) =>
    catalogContainsPassage(
      params.booksFor(entry.translation.id),
      params.bookId,
      params.chapterNumber
    )
  );
  if (containing.length === 0) {
    return [];
  }

  const preferredId = preferredTranslationId(
    requestedLanguage,
    params.uiLanguage
  );
  containing.sort((left, right) => {
    if (preferredId) {
      if (left.translation.id === preferredId) return -1;
      if (right.translation.id === preferredId) return 1;
    }
    if (right.downloadedAt !== left.downloadedAt) {
      return right.downloadedAt - left.downloadedAt;
    }
    return left.translation.id.localeCompare(right.translation.id);
  });
  return containing.map((entry) => entry.translation);
}

/**
 * Whether this catalog can open `bookId` at `chapterNumber` without
 * `resolveChapterInBook` substituting a different chapter.
 */
function catalogContainsPassage(
  books: readonly TranslationBook[] | null,
  bookId: string | null | undefined,
  chapterNumber: number | null | undefined
): boolean {
  const requestedBookId = bookId?.trim();
  if (!requestedBookId || !books) {
    return false;
  }
  const book = books.find((entry) => entry.id === requestedBookId);
  if (!book) {
    return false;
  }
  if (chapterNumber == null || !Number.isFinite(chapterNumber)) {
    return true;
  }
  return resolveChapterInBook(book, chapterNumber) === chapterNumber;
}

function nonemptyLanguage(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeUiLanguage(uiLanguage: string): string {
  const primary = uiLanguage
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .split("-")[0];
  return primary ?? "";
}

function sameBibleLanguage(left: string, right: string): boolean {
  const a = left.toLowerCase();
  const b = right.toLowerCase();
  if (a === b) {
    return true;
  }
  const leftUi = bibleLanguageToUiLocale(a);
  const rightUi = bibleLanguageToUiLocale(b);
  return leftUi !== null && leftUi === rightUi;
}

function matchesUiLanguage(bibleLanguage: string, uiLanguage: string): boolean {
  const ui = normalizeUiLanguage(uiLanguage);
  if (!ui) {
    return false;
  }
  if (bibleLanguageToUiLocale(bibleLanguage) === ui) {
    return true;
  }
  return bibleLanguageCodesForUi(ui).some(
    (code) => code.toLowerCase() === bibleLanguage.toLowerCase()
  );
}

function preferredTranslationId(
  requestedLanguage: string | null,
  uiLanguage: string
): string | null {
  if (requestedLanguage) {
    const ui = bibleLanguageToUiLocale(requestedLanguage);
    return (ui && DEFAULT_TRANSLATIONS_BY_LANGUAGE.get(ui)?.id) || null;
  }
  const ui = normalizeUiLanguage(uiLanguage);
  return DEFAULT_TRANSLATIONS_BY_LANGUAGE.get(ui)?.id ?? null;
}
