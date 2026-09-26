import type { AIProviderFunctionTool } from "./AIManager";
import { generateFunctionTool } from "./AIManager";
import {
  DEFAULT_TRANSLATIONS_BY_LANGUAGE,
  UI_TO_BIBLE_LANGUAGE_CODES,
  type BibleReadingState,
} from "./BibleReadingManager";
import type { Translation, TranslationBooks } from "./FreeUseBibleAPI";
import { z } from "zod";

/** How many translations a search returns unless the agent asks for more. */
const DEFAULT_SEARCH_LIMIT = 8;
/** Hard cap so a broad query (every English Bible) cannot flood the model. */
const MAX_SEARCH_LIMIT = 20;
/** Buttons on one choice card. More than this is a wall of options, not a choice. */
const MAX_SUGGESTED_TRANSLATIONS = 8;
/**
 * How many translations to name in a prompt for an agent that cannot call
 * tools. Past this, the note says the list is incomplete instead of pretending
 * it is the whole catalog.
 */
const MAX_PROMPT_LISTED = 24;

export interface TranslationSearchHit {
  id: string;
  name: string;
  englishName: string;
  shortName: string;
  language: string;
  languageName: string | null;
  languageEnglishName: string | null;
  numberOfBooks: number;
}

export interface TranslationSearchResult {
  query: string;
  /** How many catalog rows matched, before the limit. */
  total: number;
  translations: TranslationSearchHit[];
}

export interface ResolvedTranslationSuggestions {
  shown: Translation[];
  rejected: string[];
}

function primaryUiLanguage(language: string): string {
  const primary = language.trim().toLowerCase().split(/[-_]/)[0];
  return primary || language.trim().toLowerCase();
}

/**
 * Bible-API language codes a UI locale (or a code the agent typed) refers to.
 * "fr" and "fra" both need to find French rows, whose `language` is `fra`.
 */
function languageCodesForQuery(query: string): Set<string> {
  const q = query.trim().toLowerCase();
  const codes = new Set<string>();
  if (!q) {
    return codes;
  }
  codes.add(q);
  const primary = primaryUiLanguage(q);
  codes.add(primary);
  const mapped = UI_TO_BIBLE_LANGUAGE_CODES[primary];
  if (mapped) {
    for (const code of mapped) {
      codes.add(code.toLowerCase());
    }
  }
  const preferred = DEFAULT_TRANSLATIONS_BY_LANGUAGE.get(primary)?.language;
  if (preferred) {
    codes.add(preferred.toLowerCase());
  }
  return codes;
}

function scoreTranslation(translation: Translation, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) {
    return 0;
  }

  const id = translation.id.toLowerCase();
  const shortName = translation.shortName.toLowerCase();
  const name = translation.name.toLowerCase();
  const englishName = translation.englishName.toLowerCase();
  const language = translation.language.toLowerCase();
  const languageName = translation.languageName?.toLowerCase() ?? "";
  const languageEnglishName =
    translation.languageEnglishName?.toLowerCase() ?? "";

  let score = 0;
  const bump = (value: number) => {
    if (value > score) {
      score = value;
    }
  };

  if (id === q || shortName === q) {
    bump(100);
  }
  if (
    language === q ||
    (languageName && languageName === q) ||
    (languageEnglishName && languageEnglishName === q)
  ) {
    bump(90);
  }
  if (languageCodesForQuery(q).has(language)) {
    bump(80);
  }

  // Single letters match hundreds of names. Substring matching starts at two
  // characters; exact id / short name / language still match above.
  if (q.length >= 2) {
    if (shortName.startsWith(q) || id.startsWith(q)) {
      bump(60);
    }
    if (
      name.includes(q) ||
      englishName.includes(q) ||
      shortName.includes(q) ||
      id.includes(q)
    ) {
      bump(40);
    }
    if (
      (languageName && languageName.includes(q)) ||
      (languageEnglishName && languageEnglishName.includes(q))
    ) {
      bump(30);
    }
  }

  return score;
}

function toSearchHit(translation: Translation): TranslationSearchHit {
  return {
    id: translation.id,
    name: translation.name,
    englishName: translation.englishName,
    shortName: translation.shortName,
    language: translation.language,
    languageName: translation.languageName ?? null,
    languageEnglishName: translation.languageEnglishName ?? null,
    numberOfBooks: translation.numberOfBooks,
  };
}

/**
 * Finds catalog translations by language, name, or short name.
 *
 * Short names are not unique (`WBT` is used by hundreds of translations, and
 * `KJV` in the catalog is Thai). Each hit includes its language so the agent
 * can tell those apart instead of guessing a translation we do not have.
 */
export function searchTranslationCatalog(
  catalog: readonly Translation[],
  query: string,
  limit = DEFAULT_SEARCH_LIMIT
): TranslationSearchResult {
  const trimmed = query.trim();
  const capped = Math.min(
    MAX_SEARCH_LIMIT,
    Math.max(1, Math.floor(limit) || DEFAULT_SEARCH_LIMIT)
  );
  if (!trimmed) {
    return { query: trimmed, total: 0, translations: [] };
  }

  const ranked = catalog
    .map((translation) => ({
      translation,
      score: scoreTranslation(translation, trimmed),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const byShort = a.translation.shortName.localeCompare(
        b.translation.shortName
      );
      if (byShort !== 0) {
        return byShort;
      }
      return a.translation.id.localeCompare(b.translation.id);
    });

  return {
    query: trimmed,
    total: ranked.length,
    translations: ranked
      .slice(0, capped)
      .map((entry) => toSearchHit(entry.translation)),
  };
}

function findById(
  catalog: readonly Translation[],
  token: string
): Translation | undefined {
  const q = token.trim().toLowerCase();
  if (!q) {
    return undefined;
  }
  return catalog.find((translation) => translation.id.toLowerCase() === q);
}

function findUniqueByShortName(
  catalog: readonly Translation[],
  token: string
): Translation | undefined {
  const q = token.trim().toLowerCase();
  if (!q) {
    return undefined;
  }
  const matches = catalog.filter(
    (translation) => translation.shortName.toLowerCase() === q
  );
  return matches.length === 1 ? matches[0] : undefined;
}

/**
 * Keeps only translations the catalog actually contains, in the order the
 * agent asked for. A short name is accepted when exactly one translation uses
 * it; a shared short name is rejected so the agent has to pass a real id.
 */
export function resolveSuggestedTranslations(
  catalog: readonly Translation[],
  requested: readonly string[],
  limit = MAX_SUGGESTED_TRANSLATIONS
): ResolvedTranslationSuggestions {
  const capped = Math.min(
    MAX_SUGGESTED_TRANSLATIONS,
    Math.max(1, Math.floor(limit) || MAX_SUGGESTED_TRANSLATIONS)
  );
  const shown: Translation[] = [];
  const rejected: string[] = [];
  const seen = new Set<string>();

  for (const token of requested) {
    if (shown.length >= capped) {
      break;
    }
    const match =
      findById(catalog, token) ?? findUniqueByShortName(catalog, token);
    if (!match) {
      const trimmed = token.trim();
      if (trimmed) {
        rejected.push(trimmed);
      }
      continue;
    }
    if (seen.has(match.id)) {
      continue;
    }
    seen.add(match.id);
    shown.push(match);
  }

  return { shown, rejected };
}

/** Button label: "LSG (Louis Segond)". The short name alone when it is the name. */
export function translationChoiceLabel(translation: Translation): string {
  const title = translation.englishName || translation.name || translation.id;
  const shortName = translation.shortName || translation.id;
  if (title.toLowerCase() === shortName.toLowerCase()) {
    return shortName;
  }
  return `${shortName} (${title})`;
}

function summarizeTranslations(translations: readonly Translation[]): {
  list: string;
  truncated: boolean;
} {
  const sorted = [...translations].sort((a, b) => {
    const aComplete = a.numberOfBooks >= 66 ? 0 : 1;
    const bComplete = b.numberOfBooks >= 66 ? 0 : 1;
    if (aComplete !== bComplete) {
      return aComplete - bComplete;
    }
    const byShort = a.shortName.localeCompare(b.shortName);
    if (byShort !== 0) {
      return byShort;
    }
    return a.id.localeCompare(b.id);
  });
  const shown = sorted.slice(0, MAX_PROMPT_LISTED);
  const extra = sorted.length - shown.length;
  const list = shown
    .map((translation) => `${translation.shortName} (${translation.id})`)
    .join(", ");
  if (extra > 0) {
    return { list: `${list}, and ${extra} more`, truncated: true };
  }
  return { list, truncated: false };
}

function languageLabel(translations: readonly Translation[]): string {
  const first = translations[0];
  return (
    first?.languageEnglishName ||
    first?.languageName ||
    first?.language ||
    "this language"
  );
}

/**
 * A short catalog note for agents that cannot call tools. Names the
 * translations in the reader's UI language, and in the open tab's language
 * when that is different, so the agent does not invent an NIV we do not have.
 */
export function formatAvailableTranslationsNote(
  catalog: readonly Translation[],
  uiLanguage: string,
  activeTranslationLanguage?: string | null
): string | null {
  const sections: string[] = [];
  const uiCodes = languageCodesForQuery(uiLanguage);
  const uiMatches = catalog.filter((translation) =>
    uiCodes.has(translation.language.toLowerCase())
  );
  if (uiMatches.length > 0) {
    const summary = summarizeTranslations(uiMatches);
    const advice = summary.truncated
      ? "More translations exist in this language than are listed. Do not invent a name that is not listed here."
      : "Only recommend translations from this list.";
    sections.push(
      `Translations available in ${languageLabel(uiMatches)}: ${summary.list}. ${advice}`
    );
  }

  const active = activeTranslationLanguage?.trim().toLowerCase();
  if (active && !uiCodes.has(active)) {
    const activeMatches = catalog.filter(
      (translation) => translation.language.toLowerCase() === active
    );
    if (activeMatches.length > 0) {
      const summary = summarizeTranslations(activeMatches);
      const advice = summary.truncated
        ? "More translations exist in this language than are listed. Do not invent a name that is not listed here."
        : "Only recommend translations from this list.";
      sections.push(
        `Translations available in ${languageLabel(activeMatches)} (the open tab): ${summary.list}. ${advice}`
      );
    }
  }

  return sections.length > 0 ? sections.join(" ") : null;
}

/**
 * Switches the open tab to `translationId`, staying on the current chapter
 * when that translation includes the book. A New Testament-only translation
 * does not contain Genesis, so that case opens the translation's first book
 * instead of failing the tap.
 *
 * Returns whether the tab is on the requested translation afterwards.
 */
export async function switchReaderToTranslation(options: {
  readingState: BibleReadingState;
  getTranslationBooks: (translationId: string) => Promise<TranslationBooks>;
  translationId: string;
}): Promise<boolean> {
  const { readingState, getTranslationBooks, translationId } = options;
  if (readingState.translationId.peek() === translationId) {
    return true;
  }

  const bookId = readingState.bookId.peek();
  const chapterNumber = readingState.chapterNumber.peek();
  if (!bookId) {
    await readingState.selectTranslation(translationId);
    return readingState.translationId.peek() === translationId;
  }

  let books: TranslationBooks;
  try {
    books = await getTranslationBooks(translationId);
  } catch {
    return false;
  }

  const book = books.books.find((entry) => entry.id === bookId);
  if (!book) {
    await readingState.selectTranslation(translationId);
    return readingState.translationId.peek() === translationId;
  }

  await readingState.selectTranslationAndChapter(
    translationId,
    bookId,
    chapterNumber
  );
  return readingState.translationId.peek() === translationId;
}

const searchTranslationsParameters = z.object({
  query: z
    .string()
    .describe(
      "Language name (French), UI code (fr), Bible-API language code (fra), translation name, or short name (LSG). Short names are not unique."
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_SEARCH_LIMIT)
    .optional()
    .describe(
      `Maximum hits to return (default ${DEFAULT_SEARCH_LIMIT}, max ${MAX_SEARCH_LIMIT}). The result's total may be higher; narrow the query when it is.`
    ),
});

const suggestTranslationsParameters = z.object({
  translationIds: z
    .array(z.string().min(1))
    .min(1)
    .max(MAX_SUGGESTED_TRANSLATIONS)
    .describe(
      "Translation ids from searchTranslations, in the order to show them. Unknown ids are dropped. A short name is accepted only when exactly one translation uses it."
    ),
});

/**
 * Core agent tools for looking up the real translation catalog and offering
 * the reader buttons that switch the open tab.
 */
export function createTranslationAgentTools(deps: {
  loadCatalog: () => Promise<readonly Translation[]>;
  /**
   * Posts the choice card into the open chat. Throw when there is no chat
   * to post into; the tool reports that to the agent instead of claiming the
   * buttons were shown.
   */
  postTranslationChoices: (choices: { id: string; label: string }[]) => void;
}): AIProviderFunctionTool[] {
  const searchTranslations = generateFunctionTool({
    name: "searchTranslations",
    description:
      "Looks up Bible translations this app can actually open, by language or name. Call this before recommending a translation. Each hit includes its id, shortName, and language. Only these translations exist. Do not invent others (for example NIV) when they are absent. Short names are not unique, so read the language on each hit.",
    parameters: searchTranslationsParameters,
    function: async (args) => {
      let catalog: readonly Translation[];
      try {
        catalog = await deps.loadCatalog();
      } catch (err) {
        return `error: ${err instanceof Error ? err.message : String(err)}`;
      }
      return searchTranslationCatalog(catalog, args.query, args.limit);
    },
  });

  const suggestTranslations = generateFunctionTool({
    name: "suggestTranslations",
    description:
      "Shows the reader buttons for translations to switch the open Bible tab to. Pass ids from searchTranslations. Tapping a button stays on the same chapter when that translation includes it. Unknown ids are ignored and reported back. Call this when you want the reader to switch, instead of only naming translations in prose.",
    parameters: suggestTranslationsParameters,
    function: async (args) => {
      let catalog: readonly Translation[];
      try {
        catalog = await deps.loadCatalog();
      } catch (err) {
        return `error: ${err instanceof Error ? err.message : String(err)}`;
      }

      const { shown, rejected } = resolveSuggestedTranslations(
        catalog,
        args.translationIds
      );
      if (shown.length === 0) {
        return {
          shown: [],
          rejected,
          error:
            "None of those translations are in the catalog. Call searchTranslations and pass the ids it returns.",
        };
      }

      const choices = shown.map((translation) => ({
        id: translation.id,
        label: translationChoiceLabel(translation),
      }));
      try {
        deps.postTranslationChoices(choices);
      } catch (err) {
        return `error: ${err instanceof Error ? err.message : String(err)}`;
      }

      return { shown: choices, rejected };
    },
  });

  return [searchTranslations.tool, suggestTranslations.tool];
}
