import type { Translation } from "./FreeUseBibleAPI";

/**
 * Translations for one language, as shown in the translation picker.
 */
export interface TranslationLanguageGroup {
  language: string;
  languageEnglishName: string;
  languageName: string;
  translations: Translation[];
}

/**
 * Which slice of the catalog the picker shows:
 * - "complete" — only translations with the full 66 books (plus whatever is
 *   already selected, so the current pick never disappears from the list).
 * - "popular" — only the widely-read languages in `popularLanguages`.
 * - "all" — everything.
 */
export type TranslationViewMode = "complete" | "all" | "popular";

/** Languages treated as "popular" by the picker's default filter. */
export const DEFAULT_POPULAR_LANGUAGES = [
  "eng",
  "spa",
  "arb",
  "hin",
  "heb",
  "grc",
];

/** Best available human-readable name for a translation's language. */
export function translationLanguageLabel(translation: Translation): string {
  return (
    translation.languageEnglishName ||
    translation.languageName ||
    translation.language
  );
}

/**
 * Folds a flat translation list into one group per language, preserving the
 * order languages are first seen and dropping duplicate translation ids.
 */
export function groupTranslationsByLanguage(
  translations: Translation[]
): TranslationLanguageGroup[] {
  const normalized = translations.map((item) => ({
    ...item,
    languageEnglishName: translationLanguageLabel(item),
  }));
  const grouped = new Map<string, TranslationLanguageGroup>();

  normalized.forEach((translation) => {
    const languageCode = translation.language;
    const existing = grouped.get(languageCode);

    if (existing) {
      if (
        !existing.translations.some(
          (existingTranslation) => existingTranslation.id === translation.id
        )
      ) {
        existing.translations.push(translation);
      }
      return;
    }

    grouped.set(languageCode, {
      language: languageCode,
      languageEnglishName: translation.languageEnglishName || languageCode,
      languageName:
        translation.languageName ||
        translation.languageEnglishName ||
        languageCode,
      translations: [translation],
    });
  });

  return Array.from(grouped.values());
}

export interface FilterTranslationGroupsOptions {
  /** Every language group, unfiltered (see `groupTranslationsByLanguage`). */
  groups: TranslationLanguageGroup[];
  /** Free-text search over language and translation names. */
  query: string;
  /** Which slice of the catalog to show. */
  viewMode: TranslationViewMode;
  /** Maximum number of language groups to return. */
  limit: number;
  /**
   * The translation currently chosen, if any. Kept visible in "complete" mode
   * even when it is a partial translation, and its language sorts first.
   */
  selectedTranslation?: Translation | null;
  /** Languages counted as popular. Defaults to `DEFAULT_POPULAR_LANGUAGES`. */
  popularLanguages?: string[];
}

export interface FilteredTranslationGroups {
  /** The page of language groups to render, after sorting and the limit. */
  groups: TranslationLanguageGroup[];
  /**
   * How many groups matched the search and view mode *before* the limit was
   * applied — i.e. how many the reader could reach by paging.
   *
   * This is what "show more" must be judged against, not the size of the whole
   * catalog. Most languages have no complete translation, so in "complete" mode
   * the catalog's ~1000 languages collapse to a little over a hundred; comparing
   * the limit to the catalog total left a "show more" control on screen that
   * could never reveal anything.
   */
  totalMatching: number;
}

/**
 * Applies the picker's search, view-mode and limit rules to the language
 * groups, sorting the selected translation's language to the top.
 *
 * Shared by the reader's translation modal and any other surface that offers a
 * translation picker, so they search and filter identically.
 */
export function filterTranslationGroups(
  options: FilterTranslationGroupsOptions
): FilteredTranslationGroups {
  const {
    groups,
    query,
    viewMode,
    limit,
    selectedTranslation = null,
    popularLanguages = DEFAULT_POPULAR_LANGUAGES,
  } = options;

  const selectedLanguageCode = selectedTranslation?.language?.toLowerCase();
  const selectedLanguageName =
    selectedTranslation?.languageEnglishName?.toLowerCase();

  const filterByMode = (
    input: TranslationLanguageGroup[]
  ): TranslationLanguageGroup[] => {
    if (viewMode === "all") {
      return input.map((group) => ({
        ...group,
        translations: [...group.translations],
      }));
    }

    const next: TranslationLanguageGroup[] = [];

    input.forEach((group) => {
      if (
        viewMode === "popular" &&
        !popularLanguages.includes(group.language) &&
        !group.translations.some((translation) =>
          popularLanguages.includes(translation.language)
        )
      ) {
        return;
      }

      if (viewMode === "complete") {
        const filteredTranslations = group.translations.filter(
          (translation) =>
            !(
              translation.numberOfBooks < 66 &&
              translation.id !== selectedTranslation?.id
            )
        );

        if (filteredTranslations.length > 0) {
          next.push({
            ...group,
            translations: filteredTranslations,
          });
        }

        return;
      }

      next.push({
        ...group,
        translations: [...group.translations],
      });
    });

    return next;
  };

  const filterByQuery = (
    input: TranslationLanguageGroup[],
    lowercaseQuery: string
  ): TranslationLanguageGroup[] => {
    const next: TranslationLanguageGroup[] = [];

    input.forEach((group) => {
      const languageMatch =
        group.language.toLowerCase().includes(lowercaseQuery) ||
        group.languageEnglishName.toLowerCase().includes(lowercaseQuery) ||
        group.languageName.toLowerCase().includes(lowercaseQuery) ||
        group.translations.some((translation) => {
          const languageEnglishName =
            translation.languageEnglishName?.toLowerCase() ||
            translation.englishName.toLowerCase();
          const languageName = translation.languageName?.toLowerCase();

          return (
            languageEnglishName.includes(lowercaseQuery) ||
            Boolean(languageName?.includes(lowercaseQuery))
          );
        });

      if (languageMatch) {
        next.push({
          ...group,
          translations: [...group.translations],
        });
        return;
      }

      const matchedTranslations = group.translations.filter((translation) => {
        const shortName = translation.shortName.toLowerCase();

        if (
          shortName.includes(lowercaseQuery) ||
          translation?.name?.toLowerCase().includes(lowercaseQuery) ||
          translation?.languageEnglishName
            ?.toLowerCase()
            .includes(lowercaseQuery) ||
          translation?.languageName?.toLowerCase().includes(lowercaseQuery)
        ) {
          return true;
        }

        return false;
      });

      if (matchedTranslations.length > 0) {
        next.push({
          ...group,
          translations: matchedTranslations,
        });
      }
    });

    return next;
  };

  const sortFn = (
    a: TranslationLanguageGroup,
    b: TranslationLanguageGroup
  ): number => {
    if (
      a.language === selectedLanguageCode ||
      a.language.toLowerCase() === selectedLanguageName
    ) {
      return -1;
    }

    if (
      b.language === selectedLanguageCode ||
      b.language.toLowerCase() === selectedLanguageName
    ) {
      return 1;
    }

    return a.language.localeCompare(b.language);
  };

  // Everything that matches, before the limit — the denominator for paging.
  const matching =
    query !== ""
      ? filterByMode(filterByQuery(groups, query.toLowerCase()))
      : filterByMode(groups);

  // Slice-then-sort when searching, sort-then-slice otherwise: preserved from
  // the reader's original filter so result sets stay identical.
  const paged =
    query !== ""
      ? matching.slice(0, limit).sort(sortFn)
      : [...matching].sort(sortFn).slice(0, limit);

  return { groups: paged, totalMatching: matching.length };
}
