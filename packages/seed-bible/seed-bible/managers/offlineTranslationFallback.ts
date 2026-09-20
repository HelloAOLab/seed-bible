import type { Translation } from "./FreeUseBibleAPI";
import {
  bibleLanguageCodesForUi,
  bibleLanguageToUiLocale,
  DEFAULT_TRANSLATIONS_BY_LANGUAGE,
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
 * When several downloads qualify they are all returned, with the hardcoded
 * default for that language first if it is among them, otherwise newest first.
 */
export function findOfflineTranslationFallbacks(params: {
  currentTranslationId: string | null | undefined;
  currentTranslationLanguage: string | null | undefined;
  uiLanguage: string;
  downloaded: readonly OfflineFallbackCandidate[];
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
  if (matches.length === 0) {
    return [];
  }

  const preferredId = preferredTranslationId(
    requestedLanguage,
    params.uiLanguage
  );
  matches.sort((left, right) => {
    if (preferredId) {
      if (left.translation.id === preferredId) return -1;
      if (right.translation.id === preferredId) return 1;
    }
    if (right.downloadedAt !== left.downloadedAt) {
      return right.downloadedAt - left.downloadedAt;
    }
    return left.translation.id.localeCompare(right.translation.id);
  });
  return matches.map((entry) => entry.translation);
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
