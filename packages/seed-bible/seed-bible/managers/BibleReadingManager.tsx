import {
  type AvailableTranslations,
  type ChapterFootnote,
  type ChapterVerse,
  type Translation,
  type TranslationBook,
  type TranslationBookChapter,
  type TranslationBooks,
} from "../managers/FreeUseBibleAPI";
import { type BibleDataManager } from "../managers/BibleDataManager";
import {
  batch,
  computed,
  effect,
  signal,
  type ReadonlySignal,
  type Signal,
} from "@preact/signals";
import type { JSX } from "preact";
import { sortBy } from "es-toolkit";
import type {
  ChapterHighlight,
  ChapterHighlights,
  HighlightsManager,
} from "../managers/HighlightsManager";
import { v4 as uuid } from "uuid";
import type { I18nManager } from "../i18n";
import { LANG_META } from "../i18n/languageMeta";
import type {
  DiscoverContentResult,
  DiscoverCrossReferenceResult,
  DiscoverManager,
  DiscoverReference,
  DiscoverStudyNoteResult,
} from "../managers/DiscoverManager";
import type {
  BibleReadingExtensionManager,
  ReadingExtensionInstance,
  ReadingExtensionRuntime,
  ReadingNavigationOutcome,
} from "../managers/BibleReadingExtensionManager";

export interface DiscoverTypedProviderResults<TResult> {
  providerId: string;
  results: TResult[];
}

type DiscoverReferenceWithBookData = DiscoverReference & {
  bookData: TranslationBook;
};

type DiscoverContentResultWithBookData = Omit<
  DiscoverContentResult,
  "reference"
> & {
  reference: DiscoverReferenceWithBookData;
};

type DiscoverCrossReferenceResultWithBookData = Omit<
  DiscoverCrossReferenceResult,
  "reference" | "crossReference"
> & {
  reference: DiscoverReferenceWithBookData;
  crossReference: DiscoverReferenceWithBookData;
};

type DiscoverStudyNoteResultWithBookData = Omit<
  DiscoverStudyNoteResult,
  "reference"
> & {
  reference: DiscoverReferenceWithBookData;
};

export type DiscoverResultWithBookData =
  | DiscoverCrossReferenceResultWithBookData
  | DiscoverContentResultWithBookData
  | DiscoverStudyNoteResultWithBookData;

export interface BibleSelectedVerse {
  /** Book identifier (for example: GEN, MAT). */
  bookId: string;
  /** 1-based chapter number in the selected book. */
  chapterNumber: number;
  /** Verse payload as returned in chapter content. */
  verse: ChapterVerse;
  /** Active translation ID at selection time. */
  translationId: string | null;
  /** Optional X coordinate for contextual menu/tooltip anchoring. */
  selectionX?: number;
  /** Optional Y coordinate for contextual menu/tooltip anchoring. */
  selectionY?: number;
  /** Epoch timestamp indicating when the verse was selected. */
  selectedAt?: number;
}

export interface SelectedFootnote {
  /** The selected footnote definition. */
  note: ChapterFootnote;
  /** Verse that contains the selected footnote reference, if found. */
  verse: ChapterVerse | null;
  /** Full chapter containing the selected footnote. */
  chapter: TranslationBookChapter;
}

export interface VerseDecoration {
  /** Unique decoration identifier used for removal. */
  id: string;
  /** Translation ID this decoration applies to. Null targets the current translation. */
  translationId: string | null;
  /** Book ID this decoration applies to. */
  bookId: string;
  /** Chapter number this decoration applies to. */
  chapterNumber: number;
  /** One or more verse numbers to decorate. */
  verses: number[];
  /** Optional text fragment to target inside the verse content. */
  targetContent?: string;
  /** Optional character start index for range decorations. */
  startIndex?: number;
  /** Optional character end index for range decorations. */
  endIndex?: number;
  /** Optional CSS class to apply to the decorated verse/range. */
  className?: string;
  /** Optional inline style to apply to the decorated verse/range. */
  style?: JSX.CSSProperties;
  /** Optional delay in milliseconds before this decoration auto-removes itself. */
  removeAfterMs?: number;

  /**
   * Whether to preserve the decoration when the chapter changes.
   */
  preserveOnChapterChange?: boolean;
}

export interface VerseDecorationInput {
  /** Optional text fragment to target inside the verse content. */
  targetContent?: string;
  /** Optional character start index for range decorations. */
  startIndex?: number;
  /** Optional character end index for range decorations. */
  endIndex?: number;
  /** Optional CSS class to apply to the decorated verse/range. */
  className?: string;
  /** Optional inline style to apply to the decorated verse/range. */
  style?: JSX.CSSProperties;
  /** Optional delay in milliseconds before this decoration auto-removes itself. */
  removeAfterMs?: number;

  /**
   * Whether to preserve the decoration when the chapter changes.
   * By default, decorations are cleared when the chapter changes.
   * Setting this to true will keep the decoration until it is explicitly removed.
   */
  preserveOnChapterChange?: boolean;

  /**
   * The ID of the translation that this decoration should be limited to.
   * If null or omitted, then the decoration will apply to all translations.
   *
   * Should only be used when you have a specific need to target a decoration to a specific translation,
   * since decorations may be shared across sessions and users may not all have the same translation selected.
   */
  translationId?: string | null;
}

/**
 * Reactive API for Bible reading navigation, selection, highlighting, and decorations.
 *
 * The state is initialized asynchronously by `createBibleReadingState()`.
 * Consumers should observe `loading`/`error` and read `chapterData`/`translationBooks`
 * signals to know when content is ready.
 */
export interface BibleReadingState {
  /** The default translation for the current language. */
  defaultTranslation: TranslationWithLanguage;
  /** Selected translation ID. Null while unresolved or endpoint-derived during startup. */
  translationId: Signal<string>;
  /** Selected translation metadata derived from `translationBooks`. */
  translation: Signal<Translation | null>;
  /** Selected book ID (for example: GEN, JHN). */
  bookId: Signal<string | null>;
  /** Selected 1-based chapter number. */
  chapterNumber: Signal<number>;
  /** Available translations from the current endpoint. */
  availableTranslations: Signal<AvailableTranslations | null>;
  /** Books metadata for the currently selected translation. */
  translationBooks: Signal<TranslationBooks | null>;
  /** Loaded chapter payload for the current translation/book/chapter. */
  chapterData: Signal<TranslationBookChapter | null>;
  /** Highlights scoped to the active chapter. */
  highlights: ReadonlySignal<ChapterHighlights>;
  /** Active transient verse decorations for rendering. */
  decorations: ReadonlySignal<VerseDecoration[]>;
  /** Current multi-verse selection in the active chapter. */
  selectedVerses: Signal<BibleSelectedVerse[]>;
  /** Currently selected footnote with resolved verse/chapter context. */
  selectedFootnote: ReadonlySignal<SelectedFootnote | null>;
  /** True while async loading/navigation operations are in progress. */
  loading: Signal<boolean>;
  /** Error message from the most recent failed operation, if any. */
  error: Signal<string | null>;
  /**
   * Resolves once chapterData becomes non-null for the first time.
   * Throw this in a component to suspend rendering until initial chapter data is available.
   */
  chapterDataPromise: Promise<void>;
  /** Scroll position snapshot for chapter restoration/UI syncing. */
  scrollPosition: Signal<number>;
  /** Pending verse number to scroll to after chapter content renders. */
  scrollToVerse: Signal<number | null>;

  /**
   * Toggles a verse in the current selection.
   * If the verse is already selected, it is removed; otherwise it is added with
   * menu anchor coordinates and a timestamp.
   */
  selectVerse: (
    verse: BibleSelectedVerse,
    selectionX: number,
    selectionY: number
  ) => void;

  /** Selects a chapter footnote by note ID, or clears selection with `null`. */
  selectFootnote: (noteId: number | null) => void;

  /**
   * Applies a highlight style to all currently selected verses in the active chapter.
   * Does nothing if no compatible selected verses exist.
   */
  highlightSelectedVerses: (
    highlightDetails: Omit<ChapterHighlight, "verse">
  ) => Promise<void>;

  /**
   * Removes highlight data from all currently selected verses in the active chapter.
   * Does nothing if no compatible selected verses exist.
   */
  unhighlightSelectedVerses: () => Promise<void>;

  /**
   * Adds a visual decoration to one or more verses and returns a decoration ID.
   *
   * @param bookId Book target for the decoration.
   * @param chapterNumber Chapter target for the decoration.
   * @param verses Single verse number or verse number list.
   * @param decoration Decoration style and targeting details.
   * @param id Optional explicit decoration ID. When omitted, a new unique ID is generated.
   * @returns Unique decoration ID used by `removeDecoration()`.
   */
  decorateVerses: (
    bookId: string,
    chapterNumber: number,
    verses: number | number[],
    decoration: VerseDecorationInput,
    id?: string
  ) => string;

  /** Removes a previously added decoration by ID. */
  removeDecoration: (decorationId: string) => void;

  /** Clears all selected verses. */
  clearSelectedVerses: () => void;

  /**
   * Selects a translation and loads its first available chapter.
   * Accepts either a translation ID or an endpoint URL that resolves translations.
   */
  selectTranslation: (translation: string) => Promise<void>;

  /**
   * Selects translation + book + chapter in one operation.
   * Accepts translation ID or endpoint URL and clamps chapter if out of range.
   */
  selectTranslationAndChapter: (
    translationId: string,
    bookId: string,
    chapterNumber: number,
    options?: SelectTranslationAndChapterOptions
  ) => Promise<void>;

  /** Selects a book and loads its first chapter in the active translation. */
  selectBook: (book: string) => Promise<void>;

  /** Selects and loads an explicit chapter in the active translation. */
  selectChapter: (book: string, chapter: number) => Promise<void>;

  /** Loads the previous chapter relative to `chapterData` when available. */
  loadPreviousChapter: () => Promise<void>;

  /** Loads the next chapter relative to `chapterData` when available. */
  loadNextChapter: () => Promise<void>;
  /** Streaming discovered cross references for the current chapter, grouped by provider. */
  discoveredCrossReferences: ReadonlySignal<
    DiscoverTypedProviderResults<DiscoverCrossReferenceResultWithBookData>[]
  >;
  /** Streaming discovered content for the current chapter, grouped by provider. */
  discoveredContent: ReadonlySignal<
    DiscoverTypedProviderResults<DiscoverContentResultWithBookData>[]
  >;
  /** Streaming discovered study notes for the current chapter, grouped by provider. */
  discoveredStudyNotes: ReadonlySignal<
    DiscoverTypedProviderResults<DiscoverStudyNoteResultWithBookData>[]
  >;

  /**
   * True while this reading state is part of a shared/multiplayer session.
   * `SessionsManager` flips this on when it wraps the state; reading extensions
   * observe it via their activation context.
   */
  isShared: ReadonlySignal<boolean>;

  /** Reading extensions currently enabled on this reading state. */
  enabledExtensions: ReadonlySignal<ReadingExtensionRuntime[]>;

  /** Returns true when the given reading extension is enabled on this state. */
  isExtensionEnabled: (extensionId: string) => boolean;

  /**
   * Enables a registered reading extension for this reading state. Extensions
   * are never enabled by default — this is how you turn one on.
   *
   * If the extension is already enabled, its custom data is updated (when
   * `data` is provided) instead of re-activating. If no extension with the given
   * id is registered, this is a no-op.
   *
   * @param extensionId The id of a registered reading extension.
   * @param data Optional initial (or updated) custom data for the extension.
   */
  enableExtension: (extensionId: string, data?: unknown) => void;

  /** Disables a reading extension for this state, running its cleanup. */
  disableExtension: (extensionId: string) => void;

  /**
   * Gets the query parameters that should be set on this reading state's URL.
   * @param currentUrl The current URL.
   * @returns The query parameters that should be set the URL when this reading state is selected.
   */
  getUrlQueryParams: (currentUrl: URL) => Record<string, string | null>;

  /**
   * Releases all resources held by this reading state: disables every enabled
   * extension, clears pending decoration timers, and stops internal effects.
   * Called when the owning tab is closed.
   */
  dispose: () => void;
}

export interface TranslationWithLanguage {
  id: string;
  language: string;
}

export const DEFAULT_TRANSLATIONS_BY_LANGUAGE = new Map<
  string,
  TranslationWithLanguage
>([
  ["am", { id: "amh_amh", language: "amh" }], // Amharic NT | መጽሐፍ ቅዱስ
  ["ar", { id: "ARBNAV", language: "arb" }], // New Arabic Version (Book of Life) | كتاب الحياة
  ["bn", { id: "ben_ocv", language: "ben" }], // Open Bengali Contemporary Version Bible | Biblica® মুক্তভাবে বাংলা সমকালীন সংস্করণের
  ["en", { id: "AAB", language: "eng" }], // AAB | Ancients Accessible Bible
  ["es", { id: "spa_onbv", language: "spa" }], // Spanish ONBV | Biblica® Open Nueva Biblia Viva 2008
  ["fa", { id: "pes_opcb", language: "pes" }], // Open Persian Contemporary Bible | Biblica® Open Persian Contemporary Bible 2022
  ["fr", { id: "fra_ncl", language: "fra" }], // French néo-Crampon Libre | Sainte Bible néo-Crampon Libre
  ["hi", { id: "hin_cvb", language: "hin" }], // Hindi Contemporary Version Bible | Biblica® हिंदी समकालीन संस्करण-स्वतंत्र उपलब्धि
  ["ind", { id: "ind_ayt", language: "ind" }], // Indonesian AYT Bible | Alkitab Yang Terbuka
  ["ja", { id: "jpn_loc", language: "jpn" }], // New Japanese NT | 新改訳新約聖書(1965年版)
  ["ko", { id: "kor_old", language: "kor" }], // Korean Bible 1910 | 한국어 성경
  // ['mn', { id: '', language: 'fra' }], // We don't have anything for Mongolian
  ["ne", { id: "npi_ncb", language: "npi" }], // Nepali Contemporary Bible | Biblica® नेपाली समकालीन सर्वसुलभ संस्करण
  // ['ps', { id: 'kor_old', language: 'kor' }], // We don't have anything for Pashto
  ["pt", { id: "por_onbv", language: "por" }], // Portuguese ONBV | Biblica® Open Nova Bíblia Viva 2007
  ["ru", { id: "rus_syn", language: "rus" }], // Russian Synodal Bible | Синодальный перевод
  ["sw", { id: "swh_onmm", language: "swh" }], // Swahili ONMM | Biblica® Toleo Wazi Neno: Maandiko Matakatifu
  // ['ti', { id: '', language: 'ti' }], // We don't have anything for Tigrinya
  ["tr", { id: "tur_ytc", language: "tur" }], // Turkish TVR Bible | Kutsal Kitap Yeni Çeviri
  ["ug", { id: "uig_ara", language: "uig" }], // Uyghur Bible (arabic script) | مۇقېددېس كالام (يەنگى يېزىق)
  ["uk", { id: "ukr_ufb", language: "ukr" }], // Ukrainian Freedom Bible | Біблія свободи
  ["ur", { id: "urd_oucv", language: "urd" }], // Urdu: Biblica® آزادانہ اردو ہم عصر ترجمہ (Bible) | Biblica® آزادانہ اردو ہم عصر ترجمہ
  ["vi", { id: "vie_vcb", language: "vie" }], // Vietnamese Contemporary Bible | Biblica® Thiên Ban Kinh Thánh Hiện Đại™
  ["zh", { id: "cmn_cbt", language: "cmn" }], // Chinese, Mandarin: Biblica® 聖經,當代譯本開放資源 (Bible) | Biblica® 聖經，當代譯本開放資源
]);

const FALLBACK_TRANSLATION: TranslationWithLanguage = {
  id: "AAB",
  language: "eng",
};

/**
 * UI locale → ISO 639-3 codes used by the Bible API `translation.language`.
 * Includes aliases so we can match the nearest available text even when the
 * preferred hardcoded ID is missing from the loaded catalog.
 */
const UI_TO_BIBLE_LANGUAGE_CODES: Record<string, string[]> = {
  am: ["amh"],
  ar: ["arb", "ara"],
  bn: ["ben"],
  en: ["eng"],
  es: ["spa"],
  fa: ["pes", "fas"],
  fr: ["fra"],
  he: ["heb"],
  hi: ["hin"],
  ind: ["ind"],
  iw: ["heb"],
  ja: ["jpn"],
  ko: ["kor"],
  ne: ["npi", "nep"],
  pt: ["por"],
  ru: ["rus"],
  sw: ["swh", "swa"],
  tr: ["tur"],
  ug: ["uig"],
  uk: ["ukr"],
  ur: ["urd"],
  vi: ["vie"],
  zh: ["cmn", "zho"],
  de: ["deu", "ger"],
  it: ["ita"],
  nl: ["nld", "dut"],
  pl: ["pol"],
  sv: ["swe"],
  th: ["tha"],
  ta: ["tam"],
  te: ["tel"],
  gu: ["guj"],
  ml: ["mal"],
  mr: ["mar"],
  kn: ["kan"],
  pa: ["pan"],
  ms: ["zlm", "msa", "may"],
  fil: ["tgl", "fil"],
  tl: ["tgl", "fil"],
  ca: ["cat"],
  ro: ["ron", "rum"],
  cs: ["ces", "cze"],
  sk: ["slk", "slo"],
  el: ["ell", "gre"],
  hu: ["hun"],
  fi: ["fin"],
  da: ["dan"],
  no: ["nor", "nob"],
  nb: ["nob", "nor"],
  is: ["isl", "ice"],
  af: ["afr"],
  zu: ["zul"],
  my: ["mya", "bur"],
  km: ["khm"],
  lo: ["lao"],
  mn: ["mon", "khk"],
};

function bibleLanguageCodesForUi(uiLanguage: string): string[] {
  const mapped = UI_TO_BIBLE_LANGUAGE_CODES[uiLanguage];
  if (mapped?.length) {
    return mapped;
  }
  const preferred = DEFAULT_TRANSLATIONS_BY_LANGUAGE.get(uiLanguage)?.language;
  return preferred ? [preferred] : [];
}

function findAvailableTranslationForUiLanguage(
  uiLanguage: string,
  availableTranslations: readonly Translation[] | null | undefined
): TranslationWithLanguage | null {
  if (!availableTranslations?.length) {
    return null;
  }

  const preferred = DEFAULT_TRANSLATIONS_BY_LANGUAGE.get(uiLanguage);
  if (preferred) {
    const byId = availableTranslations.find((t) => t.id === preferred.id);
    if (byId) {
      return { id: byId.id, language: byId.language };
    }
  }

  const codes = new Set(
    bibleLanguageCodesForUi(uiLanguage).map((code) => code.toLowerCase())
  );
  if (codes.size === 0) {
    return null;
  }

  const byLanguage = availableTranslations.find((t) =>
    codes.has(t.language.toLowerCase())
  );
  if (!byLanguage) {
    return null;
  }

  return { id: byLanguage.id, language: byLanguage.language };
}

/**
 * Picks the nearest Bible translation for a UI language:
 * 1. Hardcoded preferred default for that UI language (always — so Hindi still
 *    resolves to hin_cvb even if the catalog hasn't finished loading)
 * 2. If a catalog is available, prefer that preferred ID when present, otherwise
 *    any translation in a matching Bible-API language code (e.g. German → deu)
 * 3. Walk `LANG_META.fallback` the same way (e.g. Gujarati → Hindi)
 * 4. English (`AAB`) as last resort
 */
export function getDefaultTranslationForLanguage(
  language: string,
  visited: Set<string> = new Set(),
  availableTranslations?: readonly Translation[] | null
): TranslationWithLanguage {
  return resolveNearestBibleTranslation(
    language,
    visited,
    availableTranslations
  ).translation;
}

export type NearestBibleTranslation = {
  translation: TranslationWithLanguage;
  /** UI language whose default we resolved to (same as requested when direct). */
  resolvedUiLanguage: string;
  /** True when we had to use LANG_META.fallback (or English) instead of a direct match. */
  usedFallback: boolean;
};

function resolveNearestBibleTranslation(
  language: string,
  visited: Set<string> = new Set(),
  availableTranslations?: readonly Translation[] | null
): NearestBibleTranslation {
  if (visited.has(language)) {
    return {
      translation: FALLBACK_TRANSLATION,
      resolvedUiLanguage: "en",
      usedFallback: true,
    };
  }
  visited.add(language);

  const preferred = DEFAULT_TRANSLATIONS_BY_LANGUAGE.get(language);
  if (preferred) {
    if (availableTranslations?.length) {
      const fromCatalog = findAvailableTranslationForUiLanguage(
        language,
        availableTranslations
      );
      return {
        translation: fromCatalog ?? preferred,
        resolvedUiLanguage: language,
        usedFallback: false,
      };
    }
    return {
      translation: preferred,
      resolvedUiLanguage: language,
      usedFallback: false,
    };
  }

  if (availableTranslations?.length) {
    const fromCatalog = findAvailableTranslationForUiLanguage(
      language,
      availableTranslations
    );
    if (fromCatalog) {
      return {
        translation: fromCatalog,
        resolvedUiLanguage: language,
        usedFallback: false,
      };
    }
  }

  const fallbackLanguage = LANG_META[language]?.fallback;
  if (fallbackLanguage) {
    const resolved = resolveNearestBibleTranslation(
      fallbackLanguage,
      visited,
      availableTranslations
    );
    return {
      ...resolved,
      usedFallback: true,
    };
  }

  return {
    translation: FALLBACK_TRANSLATION,
    resolvedUiLanguage: "en",
    usedFallback: true,
  };
}

/** Resolves nearest Bible text and whether a warning modal should be shown. */
export function getNearestBibleTranslationForUiLanguage(
  language: string,
  availableTranslations?: readonly Translation[] | null
): NearestBibleTranslation {
  return resolveNearestBibleTranslation(
    language,
    new Set(),
    availableTranslations
  );
}

export const DEFAULT_BOOK_ID = "GEN";
export const DEFAULT_CHAPTER_NUMBER = 1;

export interface InitialBibleReadingOptions {
  initialTranslationId?: string | null;
  initialBookId?: string | null;
  initialChapterNumber?: number | null;

  /**
   * The verse to scroll to after the initial chapter loads. Should be a valid verse number within the initial chapter, otherwise it will be ignored.
   */
  scrollToVerse?: number;

  /**
   * Whether this reading state is part of a shared/multiplayer session.
   * `SessionsManager` sets this when it creates the session's reading state so
   * reading extensions can observe it via `isShared`. Defaults to `false`.
   */
  isShared?: boolean;
}

export interface SelectTranslationAndChapterOptions {
  /**
   * The verse to scroll to after the chapter loads. Should be a valid verse number within the chapter, otherwise it will be ignored.
   */
  scrollToVerse?: number;
}

function normalizeDecorationVerses(verses: number | number[]): number[] {
  const verseNumbers = Array.isArray(verses) ? verses : [verses];
  const normalized = Array.from(
    new Set(
      verseNumbers.filter(
        (verseNumber) => Number.isInteger(verseNumber) && verseNumber > 0
      )
    )
  ).sort((left, right) => left - right);

  if (normalized.length === 0) {
    throw new Error("At least one valid verse number is required.");
  }

  return normalized;
}

const AVAILABLE_TRANSLATIONS_PATH = "/api/available_translations.json";

interface ParsedTranslationInput {
  endpoint: string | null;
  translationId: string | null;
  preferFirstAvailableTranslation: boolean;
  fallbackToFirstAvailableWhenMissing: boolean;
}

function parseTranslationInput(value?: string | null): ParsedTranslationInput {
  if (!value) {
    return {
      endpoint: null,
      translationId: null,
      preferFirstAvailableTranslation: false,
      fallbackToFirstAvailableWhenMissing: false,
    };
  }

  try {
    const url = new URL(value);
    const normalizedPathname = url.pathname.replace(/\/+$/, "");

    if (!normalizedPathname.endsWith(AVAILABLE_TRANSLATIONS_PATH)) {
      const booksPathMatch = normalizedPathname.match(
        /^(.*)\/api\/([^/]+)\/books\.json$/
      );
      if (!booksPathMatch) {
        return {
          endpoint: null,
          translationId: value,
          preferFirstAvailableTranslation: false,
          fallbackToFirstAvailableWhenMissing: false,
        };
      }

      const endpointPath = booksPathMatch[1] || "";
      const translationIdSegment = booksPathMatch[2];
      if (!translationIdSegment) {
        return {
          endpoint: null,
          translationId: value,
          preferFirstAvailableTranslation: false,
          fallbackToFirstAvailableWhenMissing: false,
        };
      }

      const translationIdFromUrl = decodeURIComponent(translationIdSegment);
      return {
        endpoint: `${url.protocol}//${url.host}${endpointPath}/`,
        translationId: translationIdFromUrl,
        preferFirstAvailableTranslation: false,
        fallbackToFirstAvailableWhenMissing: true,
      };
    }

    const endpointPath = normalizedPathname.slice(
      0,
      -AVAILABLE_TRANSLATIONS_PATH.length
    );
    return {
      endpoint: `${url.protocol}//${url.host}${endpointPath}/`,
      translationId: null,
      preferFirstAvailableTranslation: true,
      fallbackToFirstAvailableWhenMissing: true,
    };
  } catch {
    return {
      endpoint: null,
      translationId: value,
      preferFirstAvailableTranslation: false,
      fallbackToFirstAvailableWhenMissing: false,
    };
  }
}

export function createBibleReadingState(
  dataManager: BibleDataManager,
  highlightsManager: HighlightsManager,
  i18nManager: I18nManager,
  options: InitialBibleReadingOptions = {},
  discoverManager?: DiscoverManager,
  readingExtensionManager?: BibleReadingExtensionManager
): BibleReadingState {
  const isSameSelectedVerse = (
    left: BibleSelectedVerse,
    right: BibleSelectedVerse
  ) => {
    return (
      left.bookId === right.bookId &&
      left.chapterNumber === right.chapterNumber &&
      left.verse.number === right.verse.number
    );
  };

  const initialTranslationInput = parseTranslationInput(
    options.initialTranslationId
  );
  const initialEndpointOverride = initialTranslationInput.endpoint;
  const shouldUseFirstAvailableTranslation =
    initialTranslationInput.preferFirstAvailableTranslation;
  const shouldFallbackToFirstAvailableTranslation =
    initialTranslationInput.fallbackToFirstAvailableWhenMissing;

  const normalizedInitialChapterNumber =
    typeof options.initialChapterNumber === "number" &&
    Number.isFinite(options.initialChapterNumber) &&
    options.initialChapterNumber > 0
      ? Math.floor(options.initialChapterNumber)
      : 1;

  const defaultTranslation =
    getDefaultTranslationForLanguage(i18nManager.defaultLanguage) ??
    FALLBACK_TRANSLATION;

  const translationId = signal<string>(
    initialTranslationInput.translationId ?? defaultTranslation.id
  );
  const useFirstAvailableTranslation = signal<boolean>(
    shouldUseFirstAvailableTranslation
  );
  const endpointOverride = signal<string | null>(initialEndpointOverride);
  const bookId = signal<string | null>(options.initialBookId ?? null);
  const chapterNumber = signal<number>(normalizedInitialChapterNumber);
  const availableTranslations = signal<AvailableTranslations | null>(null);
  const translationBooks = signal<TranslationBooks | null>(null);
  const chapterData = signal<TranslationBookChapter | null>(null);
  const chapterDataPromise = new Promise<void>((resolve) => {
    const cleanup = effect(() => {
      if (chapterData.value !== null) {
        cleanup();
        resolve();
      }
    });
  });
  const selectedVerses = signal<BibleSelectedVerse[]>([]);
  const selectedFootnoteId = signal<number | null>(null);
  const activeChapterHighlights = signal<Signal<ChapterHighlights>>(
    signal<ChapterHighlights>({
      highlights: [],
    })
  );
  const highlights = computed<ChapterHighlights>(
    () => activeChapterHighlights.value.value
  );
  const decorations = signal<VerseDecoration[]>([]);
  const decorationRemovalTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  const loading = signal<boolean>(true);
  const error = signal<string | null>(null);
  const scrollPosition = signal<number>(0);
  const scrollToVerse = signal<number | null>(null);

  // Reading-extension enablement (per reading state). Extensions are registered
  // globally on the BibleReadingExtensionManager but never enabled by default;
  // `enableExtension` turns one on for this state only.
  const isShared = signal<boolean>(options.isShared ?? false);
  const enabledRuntimes = signal<Map<string, ReadingExtensionRuntime>>(
    new Map()
  );
  const enabledExtensions = computed<ReadingExtensionRuntime[]>(() =>
    Array.from(enabledRuntimes.value.values())
  );
  const orderedEnabledRuntimes = computed<ReadingExtensionRuntime[]>(() =>
    sortBy(enabledExtensions.value, [
      (runtime) => -(runtime.definition.priority ?? 0),
    ])
  );

  // Disposers for internal effects, released by `dispose()`.
  const effectDisposers: Array<() => void> = [];

  // Forward reference to the object returned by this factory. It is assigned
  // just before `return`, so it is always set by the time any public method
  // (which is what triggers extension activation) is invoked.
  let readingStateRef!: BibleReadingState;

  const enableExtension = (extensionId: string, data?: unknown) => {
    const existing = enabledRuntimes.value.get(extensionId);
    if (existing) {
      if (data !== undefined) {
        existing.data.value = data;
      }
      return;
    }

    const definition =
      readingExtensionManager?.getReadingExtension(extensionId);
    if (!definition) {
      console.warn(
        `Cannot enable reading extension "${extensionId}": it is not registered.`
      );
      return;
    }

    const dataSignal = signal<unknown>(data);
    const instance: ReadingExtensionInstance = definition.activate({
      readingState: readingStateRef,
      data: dataSignal,
      isShared,
    });

    const runtime: ReadingExtensionRuntime = {
      id: extensionId,
      definition,
      instance,
      data: dataSignal,
    };

    const nextRuntimes = new Map(enabledRuntimes.value);
    nextRuntimes.set(extensionId, runtime);
    enabledRuntimes.value = nextRuntimes;
  };

  const disableExtension = (extensionId: string) => {
    const runtime = enabledRuntimes.value.get(extensionId);
    if (!runtime) {
      return;
    }

    try {
      runtime.instance.dispose?.();
    } catch (err) {
      console.error(`Error disposing reading extension "${extensionId}":`, err);
    }

    const nextRuntimes = new Map(enabledRuntimes.value);
    nextRuntimes.delete(extensionId);
    enabledRuntimes.value = nextRuntimes;
  };

  const isExtensionEnabled = (extensionId: string) =>
    enabledRuntimes.value.has(extensionId);

  /**
   * Runs the enabled extensions' navigation hooks in priority order, returning
   * the first non-`default` outcome (or `default` when none intervene).
   */
  const runNavigationHooks = async (
    direction: "next" | "previous"
  ): Promise<ReadingNavigationOutcome> => {
    const currentChapter = chapterData.value;
    if (!currentChapter) {
      return { type: "default" };
    }

    for (const runtime of orderedEnabledRuntimes.value) {
      const hook =
        direction === "next"
          ? runtime.instance.navigateNext
          : runtime.instance.navigatePrevious;
      if (!hook) {
        continue;
      }

      const outcome = await hook({
        readingState: readingStateRef,
        currentChapter,
        data: runtime.data,
      });
      if (outcome.type !== "default") {
        return outcome;
      }
    }

    return { type: "default" };
  };

  const disposeReadingState = () => {
    for (const extensionId of Array.from(enabledRuntimes.value.keys())) {
      disableExtension(extensionId);
    }
    for (const timer of decorationRemovalTimers.values()) {
      clearTimeout(timer);
    }
    decorationRemovalTimers.clear();
    for (const dispose of effectDisposers.splice(0)) {
      dispose();
    }
  };

  const translation = computed(
    () => translationBooks.value?.translation ?? null
  );

  const selectedFootnote = computed<SelectedFootnote | null>(() => {
    const chapter = chapterData.value;
    if (!chapter || selectedFootnoteId.value === null) {
      return null;
    }

    const note =
      chapter.chapter.footnotes.find(
        (note) => note.noteId === selectedFootnoteId.value
      ) ?? null;

    if (!note) {
      return null;
    }

    return {
      note,
      chapter,
      verse:
        chapter.chapter.content.find(
          (item): item is ChapterVerse =>
            item.type === "verse" &&
            item.content.some(
              (contentPart) =>
                typeof contentPart === "object" &&
                "noteId" in contentPart &&
                contentPart.noteId === selectedFootnoteId.value
            )
        ) ?? null,
    };
  });

  const decorationMatchesState = (decoration: VerseDecoration): boolean => {
    if (
      decoration.translationId &&
      decoration.translationId !== translationId.value
    ) {
      return false;
    }
    return (
      decoration.bookId === bookId.value &&
      decoration.chapterNumber === chapterNumber.value
    );
  };

  const selectVerse = (
    verse: BibleSelectedVerse,
    selectionX: number,
    selectionY: number
  ) => {
    const isSelected = selectedVerses.value.some((item) =>
      isSameSelectedVerse(item, verse)
    );

    if (isSelected) {
      selectedVerses.value = selectedVerses.value.filter(
        (item) => !isSameSelectedVerse(item, verse)
      );
      return;
    }

    const selectedVerse: BibleSelectedVerse = {
      ...verse,
      selectionX,
      selectionY,
      selectedAt: Date.now(),
    };

    selectedVerses.value = sortBy(
      [...selectedVerses.value, selectedVerse],
      [(v: BibleSelectedVerse) => v.verse.number]
    );
  };

  const clearSelectedVerses = () => {
    selectedVerses.value = [];
  };

  const getActiveEndpoint = () => endpointOverride.value ?? undefined;

  const toAvailableTranslations = (
    translationsList: BibleDataManager["availableTranslations"]["value"]
  ): AvailableTranslations => {
    return {
      translations: translationsList,
    };
  };

  const resolveTranslationInput = async (input: string): Promise<string> => {
    const parsedInput = parseTranslationInput(input);
    if (!parsedInput.endpoint) {
      return parsedInput.translationId ?? input;
    }

    endpointOverride.value = parsedInput.endpoint;

    const endpointTranslations = await dataManager.getTranslations(
      parsedInput.endpoint
    );
    availableTranslations.value = toAvailableTranslations(
      dataManager.availableTranslations.value
    );

    const firstTranslation = endpointTranslations[0];
    if (!firstTranslation) {
      throw new Error("No available translations found for endpoint.");
    }

    if (parsedInput.preferFirstAvailableTranslation) {
      return firstTranslation.id;
    }

    if (!parsedInput.translationId) {
      return firstTranslation.id;
    }

    const requestedTranslation = endpointTranslations.find(
      (translation) => translation.id === parsedInput.translationId
    );
    if (requestedTranslation) {
      return requestedTranslation.id;
    }

    if (parsedInput.fallbackToFirstAvailableWhenMissing) {
      return firstTranslation.id;
    }

    throw new Error(
      `Translation with ID "${parsedInput.translationId}" not available.`
    );
  };

  const syncStateFromChapter = async (
    chapter: TranslationBookChapter,
    options?: SelectTranslationAndChapterOptions
  ) => {
    const nextTranslationId = chapter.translation.id;
    const nextBookId = chapter.book.id;
    const nextChapterNumber = chapter.chapter.number;
    const nextScrollToVerse = options?.scrollToVerse ?? null;

    batch(() => {
      const didChapterChange =
        bookId.value !== nextBookId ||
        chapterNumber.value !== nextChapterNumber;
      if (didChapterChange) {
        scrollPosition.value = 0;
      }

      translationId.value = nextTranslationId;
      bookId.value = nextBookId;
      chapterNumber.value = nextChapterNumber;
      chapterData.value = chapter;
      scrollToVerse.value = nextScrollToVerse;
      selectedFootnoteId.value = null;
      const removedDecorationIds = decorations.value
        .filter(
          (decoration) =>
            !(
              decoration.preserveOnChapterChange ||
              decorationMatchesState(decoration)
            )
        )
        .map((decoration) => decoration.id);
      decorations.value = decorations.value.filter(
        (decoration) =>
          decoration.preserveOnChapterChange ||
          decorationMatchesState(decoration)
      );
      for (const decorationId of removedDecorationIds) {
        const timer = decorationRemovalTimers.get(decorationId);
        if (timer) {
          clearTimeout(timer);
          decorationRemovalTimers.delete(decorationId);
        }
      }
      clearSelectedVerses();
    });

    if (translationBooks.value?.translation.id !== nextTranslationId) {
      const books = await dataManager.getTranslationBooks(nextTranslationId);
      translationBooks.value = books;
      availableTranslations.value = toAvailableTranslations(
        dataManager.availableTranslations.value
      );
    }

    activeChapterHighlights.value = highlightsManager.getChapterHighlights(
      nextTranslationId,
      nextBookId,
      nextChapterNumber
    );
  };

  const highlightSelectedVerses = async (
    highlightDetails: Omit<ChapterHighlight, "verse">
  ): Promise<void> => {
    const activeTranslationId = translationId.value;
    const activeBookId = bookId.value;
    const activeChapterNumber = chapterNumber.value;

    if (!activeTranslationId || !activeBookId) {
      return;
    }

    const verseNumbers = Array.from(
      new Set(
        selectedVerses.value
          .filter(
            (verse) =>
              verse.translationId === activeTranslationId &&
              verse.bookId === activeBookId &&
              verse.chapterNumber === activeChapterNumber
          )
          .map((verse) => verse.verse.number)
      )
    );

    if (verseNumbers.length === 0) {
      return;
    }

    await highlightsManager.highlightVerses(
      activeTranslationId,
      activeBookId,
      activeChapterNumber,
      verseNumbers,
      highlightDetails
    );
  };

  const unhighlightSelectedVerses = async (): Promise<void> => {
    const activeTranslationId = translationId.value;
    const activeBookId = bookId.value;
    const activeChapterNumber = chapterNumber.value;

    if (!activeTranslationId || !activeBookId) {
      return;
    }

    const verseNumbers = Array.from(
      new Set(
        selectedVerses.value
          .filter(
            (verse) =>
              verse.translationId === activeTranslationId &&
              verse.bookId === activeBookId &&
              verse.chapterNumber === activeChapterNumber
          )
          .map((verse) => verse.verse.number)
      )
    );

    if (verseNumbers.length === 0) {
      return;
    }

    await highlightsManager.unhighlightVerses(
      activeTranslationId,
      activeBookId,
      activeChapterNumber,
      verseNumbers
    );
  };

  const decorateVerses = (
    bookId: string,
    chapterNumber: number,
    verses: number | number[],
    decoration: VerseDecorationInput,
    id: string = `decoration-${uuid()}`
  ): string => {
    const existingTimer = decorationRemovalTimers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      decorationRemovalTimers.delete(id);
    }

    const existingDecorationIndex = decorations
      .peek()
      .findIndex((currentDecoration) => currentDecoration.id === id);

    const nextDecoration: VerseDecoration = {
      id,
      bookId,
      chapterNumber,
      verses: normalizeDecorationVerses(verses),
      ...decoration,
      translationId: decoration.translationId ?? null,
    };

    if (existingDecorationIndex >= 0) {
      decorations.value = decorations
        .peek()
        .map((currentDecoration, index) =>
          index === existingDecorationIndex ? nextDecoration : currentDecoration
        );
    } else {
      decorations.value = [...decorations.peek(), nextDecoration];
    }

    if (
      typeof nextDecoration.removeAfterMs === "number" &&
      Number.isFinite(nextDecoration.removeAfterMs) &&
      nextDecoration.removeAfterMs > 0
    ) {
      const timer = setTimeout(() => {
        removeDecoration(nextDecoration.id);
      }, nextDecoration.removeAfterMs);
      decorationRemovalTimers.set(nextDecoration.id, timer);
    }

    return nextDecoration.id;
  };

  const removeDecoration = (decorationId: string) => {
    const timer = decorationRemovalTimers.get(decorationId);
    if (timer) {
      clearTimeout(timer);
      decorationRemovalTimers.delete(decorationId);
    }

    decorations.value = decorations
      .peek()
      .filter((decoration) => decoration.id !== decorationId);
  };

  const loadPreviousChapter = async () => {
    if (!chapterData.value) {
      return;
    }

    const outcome = await runNavigationHooks("previous");
    if (outcome.type === "prevent" || outcome.type === "handled") {
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const chapter =
        outcome.type === "navigate"
          ? outcome.chapter
          : await dataManager.getPreviousChapter(chapterData.value);
      if (!chapter) {
        return;
      }
      await syncStateFromChapter(chapter);
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to load previous chapter.";
    } finally {
      loading.value = false;
    }
  };

  const selectTranslation = async (translation: string) => {
    loading.value = true;
    error.value = null;

    try {
      const nextTranslationId = await resolveTranslationInput(translation);

      const books = await dataManager.getTranslationBooks(nextTranslationId);
      const firstBook = books.books[0];
      if (!firstBook) {
        throw new Error("No books available for selected translation.");
      }

      const firstChapterNumber = firstBook.firstChapterNumber ?? 1;
      const chapter = await dataManager.getTranslationBookChapter(
        nextTranslationId,
        firstBook.id,
        firstChapterNumber
      );

      await batch(async () => {
        availableTranslations.value = toAvailableTranslations(
          dataManager.availableTranslations.value
        );
        await syncStateFromChapter(chapter);
      });
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to select translation.";
    } finally {
      loading.value = false;
    }
  };

  const selectBook = async (book: string) => {
    if (!translationBooks.value) {
      return;
    }

    const selectedBook = translationBooks.value.books.find(
      (entry) => entry.id === book
    );
    if (!selectedBook) {
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const nextChapterNumber = selectedBook.firstChapterNumber ?? 1;
      const chapter = await dataManager.getTranslationBookChapter(
        translationId.value,
        book,
        nextChapterNumber
      );

      await syncStateFromChapter(chapter);
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to select book.";
    } finally {
      loading.value = false;
    }
  };

  const selectTranslationAndChapter = async (
    nextTranslationIdOrUrl: string,
    nextBookId: string,
    nextChapterNumber: number,
    options?: SelectTranslationAndChapterOptions
  ) => {
    loading.value = true;
    error.value = null;

    try {
      const nextTranslationId = await resolveTranslationInput(
        nextTranslationIdOrUrl
      );

      const books = await dataManager.getTranslationBooks(nextTranslationId);
      const selectedBook = books.books.find((book) => book.id === nextBookId);
      if (!selectedBook) {
        throw new Error(
          `Book with ID "${nextBookId}" not available for translation "${nextTranslationId}".`
        );
      }

      const firstChapterNumber = selectedBook.firstChapterNumber ?? 1;
      const maxChapterNumber =
        firstChapterNumber + selectedBook.numberOfChapters - 1;
      const clampedChapterNumber =
        nextChapterNumber >= firstChapterNumber &&
        nextChapterNumber <= maxChapterNumber
          ? nextChapterNumber
          : firstChapterNumber;

      const chapter = await dataManager.getTranslationBookChapter(
        nextTranslationId,
        selectedBook.id,
        clampedChapterNumber
      );

      await batch(async () => {
        availableTranslations.value = toAvailableTranslations(
          dataManager.availableTranslations.value
        );
        await syncStateFromChapter(chapter, options);
      });
    } catch (err) {
      error.value =
        err instanceof Error
          ? err.message
          : "Failed to select translation and chapter.";
    } finally {
      loading.value = false;
    }
  };

  const selectChapter = async (book: string, chapter: number) => {
    loading.value = true;
    error.value = null;

    try {
      const nextChapterData = await dataManager.getTranslationBookChapter(
        translationId.value,
        book,
        chapter
      );

      await syncStateFromChapter(nextChapterData);
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to select chapter.";
    } finally {
      loading.value = false;
    }
  };

  const loadNextChapter = async () => {
    if (!chapterData.value) {
      return;
    }

    const outcome = await runNavigationHooks("next");
    if (outcome.type === "prevent" || outcome.type === "handled") {
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const chapter =
        outcome.type === "navigate"
          ? outcome.chapter
          : await dataManager.getNextChapter(chapterData.value);
      if (!chapter) {
        return;
      }
      await syncStateFromChapter(chapter);
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to load next chapter.";
    } finally {
      loading.value = false;
    }
  };

  const loadInitialData = async () => {
    loading.value = true;
    error.value = null;

    try {
      const loadedTranslations =
        await dataManager.getTranslations(getActiveEndpoint());
      availableTranslations.value = toAvailableTranslations(
        dataManager.availableTranslations.value
      );

      const firstAvailableTranslation = loadedTranslations[0];
      const currentTranslation = useFirstAvailableTranslation.value
        ? firstAvailableTranslation
        : (availableTranslations.value.translations.find(
            (translation) => translation.id === translationId.value
          ) ??
          (shouldFallbackToFirstAvailableTranslation
            ? firstAvailableTranslation
            : undefined));
      if (!currentTranslation) {
        throw new Error(
          useFirstAvailableTranslation.value
            ? "No available translations found for endpoint."
            : `Translation with ID "${translationId.value}" not available.`
        );
      }

      const nextTranslationId = currentTranslation.id;
      translationId.value = nextTranslationId;
      useFirstAvailableTranslation.value = false;

      const books = await dataManager.getTranslationBooks(nextTranslationId);
      translationBooks.value = books;
      const firstBook = books.books[0];
      if (!firstBook) {
        throw new Error("No books available for selected translation.");
      }

      const requestedBookId = bookId.value;
      const selectedBook = requestedBookId
        ? (books.books.find((book) => book.id === requestedBookId) ?? firstBook)
        : firstBook;

      const nextBookId = selectedBook.id;
      const firstChapterNumber = selectedBook.firstChapterNumber ?? 1;
      const maxChapterNumber =
        firstChapterNumber + selectedBook.numberOfChapters - 1;
      const requestedChapterNumber = chapterNumber.value;
      const nextChapterNumber =
        requestedChapterNumber >= firstChapterNumber &&
        requestedChapterNumber <= maxChapterNumber
          ? requestedChapterNumber
          : firstChapterNumber;

      bookId.value = nextBookId;
      chapterNumber.value = nextChapterNumber;

      const chapter = await dataManager.getTranslationBookChapter(
        nextTranslationId,
        nextBookId,
        nextChapterNumber
      );

      await syncStateFromChapter(chapter, {
        scrollToVerse: options.scrollToVerse,
      });
    } catch (err) {
      console.error("Error loading initial Bible data:", err);
      error.value =
        err instanceof Error ? err.message : "Failed to load Bible data.";
    } finally {
      loading.value = false;
    }
  };

  const selectFootnote = (noteId: number | null) => {
    selectedFootnoteId.value = noteId;
  };

  const hasMatchingReference = (
    result: { reference: DiscoverReference },
    currentBookId: string,
    currentChapterNumber: number
  ) => {
    return (
      result.reference.book === currentBookId &&
      result.reference.chapter === currentChapterNumber
    );
  };

  const withBookData = (
    reference: DiscoverReference,
    bookData: TranslationBook
  ): DiscoverReferenceWithBookData => {
    return {
      ...reference,
      bookData,
    };
  };

  const discoveredResults = signal<
    DiscoverTypedProviderResults<DiscoverResultWithBookData>[]
  >([]);

  const discoveredResultsFiltered = computed<
    DiscoverTypedProviderResults<DiscoverResultWithBookData>[]
  >(() => {
    const chapter = chapterData.value;
    if (!chapter) {
      return [];
    }

    const currentBookId = chapter.book.id;
    const currentChapterNumber = chapter.chapter.number;
    return discoveredResults.value
      .map((providerResults) => ({
        providerId: providerResults.providerId,
        results: providerResults.results.filter((entry) =>
          hasMatchingReference(entry, currentBookId, currentChapterNumber)
        ),
      }))
      .filter((providerResults) => providerResults.results.length > 0);
  });

  // Discovered content shown to the user: the chapter-filtered provider results
  // passed through each enabled extension's `transformDiscoveredContent` hook in
  // priority order. Extensions can add content, filter it, or return `[]` to
  // suppress everything. The three by-type computeds below read this.
  const discoveredResultsForDisplay = computed<
    DiscoverTypedProviderResults<DiscoverResultWithBookData>[]
  >(() => {
    let results = discoveredResultsFiltered.value;
    for (const runtime of orderedEnabledRuntimes.value) {
      const transform = runtime.instance.transformDiscoveredContent;
      if (!transform) {
        continue;
      }
      results = transform({
        readingState: readingStateRef,
        data: runtime.data,
        results,
      });
    }
    return results;
  });

  const discoveredCrossReferences = computed<
    DiscoverTypedProviderResults<DiscoverCrossReferenceResultWithBookData>[]
  >(() => {
    return discoveredResultsForDisplay.value
      .map((providerResults) => ({
        providerId: providerResults.providerId,
        results: providerResults.results.filter(
          (entry): entry is DiscoverCrossReferenceResultWithBookData =>
            entry.type === "cross-reference"
        ),
      }))
      .filter((providerResults) => providerResults.results.length > 0);
  });

  const discoveredContent = computed<
    DiscoverTypedProviderResults<DiscoverContentResultWithBookData>[]
  >(() => {
    return discoveredResultsForDisplay.value
      .map((providerResults) => ({
        providerId: providerResults.providerId,
        results: providerResults.results.filter(
          (entry): entry is DiscoverContentResultWithBookData =>
            entry.type === "content"
        ),
      }))
      .filter((providerResults) => providerResults.results.length > 0);
  });

  const discoveredStudyNotes = computed<
    DiscoverTypedProviderResults<DiscoverStudyNoteResultWithBookData>[]
  >(() => {
    return discoveredResultsForDisplay.value
      .map((providerResults) => ({
        providerId: providerResults.providerId,
        results: providerResults.results.filter(
          (entry): entry is DiscoverStudyNoteResultWithBookData =>
            entry.type === "study-note"
        ),
      }))
      .filter((providerResults) => providerResults.results.length > 0);
  });

  if (discoverManager) {
    let discoverGeneration = 0;

    const stopDiscoverEffect = effect(() => {
      const chapter = chapterData.value;
      if (!chapter) {
        discoveredResults.value = [];
        return;
      }

      const generation = ++discoverGeneration;
      discoveredResults.value = [];

      const context = {
        translationId: chapter.translation.id,
        book: chapter.book.id,
        chapter: chapter.chapter.number,
        language: chapter.translation.language,
      };
      const currentBookData = chapter.book;

      void (async () => {
        for await (const result of discoverManager.discover(context)) {
          if (generation !== discoverGeneration) return;

          const enrichedResults: DiscoverResultWithBookData[] =
            result.results.map((entry) => {
              const refBookData =
                translationBooks.value?.books.find(
                  (b) => b.id === entry.reference.book
                ) ?? currentBookData;

              if (entry.type === "cross-reference") {
                const crossRefBookData =
                  translationBooks.value?.books.find(
                    (b) => b.id === entry.crossReference.book
                  ) ?? currentBookData;

                return {
                  ...entry,
                  reference: withBookData(entry.reference, refBookData),
                  crossReference: withBookData(
                    entry.crossReference,
                    crossRefBookData
                  ),
                };
              }

              return {
                ...entry,
                reference: withBookData(entry.reference, refBookData),
              };
            });

          if (enrichedResults.length > 0) {
            discoveredResults.value = [
              ...discoveredResults.value,
              {
                providerId: result.providerId,
                results: enrichedResults,
              },
            ];
          }
        }
      })();
    });
    effectDisposers.push(stopDiscoverEffect);
  }

  /**
   * Gets the URL query parameters for the current reading state.
   * @param currentUrl The current URL.
   * @returns An object representing the query parameters.
   */
  const getUrlQueryParams = (currentUrl: URL) => {
    const selectedBookId = bookId.value;
    const selectedChapter = chapterNumber.value;
    const selectedTranslation = translationId.value;

    let query: Record<string, string | null> = {};

    const url = currentUrl;

    query.book = selectedBookId ?? null;
    query.chapter = selectedChapter ? String(selectedChapter) : null;

    if (selectedTranslation) {
      const translationId = dataManager.buildTranslationId(selectedTranslation);

      if (url.searchParams.has("translationId")) {
        query.translationId = translationId;
        // navigation.updateQueryParam("translationId", translationId);
      } else if (
        url.searchParams.has("translation") ||
        translationId !== defaultTranslation.id
      ) {
        query.translation = translationId;
      }
    }

    for (const extension of enabledExtensions.value) {
      if (extension.instance.transformQueryParams) {
        query = extension.instance.transformQueryParams({
          readingState: readingStateRef,
          data: extension.data,
          queryParams: query,
        });
      }
    }

    // const verseNumbers = selectedVerses.value
    //   .filter(
    //     (verse) =>
    //       verse.bookId === selectedBookId &&
    //       verse.chapterNumber === selectedChapter
    //   )
    //   .map((verse) => verse.verse.number);

    // const formatted = verseNumbers ? formatVerseSelection(verseNumbers) : null;
    // query.verse = formatted;
    // // navigation.updateQueryParam("verse", formatted);

    return query;
  };

  loadInitialData();

  readingStateRef = {
    defaultTranslation,
    translationId,
    translation,
    bookId,
    chapterNumber,
    availableTranslations,
    translationBooks,
    chapterData,
    chapterDataPromise,
    highlights,
    decorations,
    selectedVerses,
    selectedFootnote,
    loading,
    error,
    scrollPosition,
    scrollToVerse,
    selectVerse,
    selectFootnote,
    highlightSelectedVerses,
    unhighlightSelectedVerses,
    decorateVerses,
    removeDecoration,
    clearSelectedVerses,
    selectTranslation,
    selectTranslationAndChapter,
    selectBook,
    selectChapter,
    loadPreviousChapter,
    loadNextChapter,
    discoveredCrossReferences,
    discoveredContent,
    discoveredStudyNotes,
    isShared: computed(() => isShared.value),
    enabledExtensions,
    isExtensionEnabled,
    enableExtension,
    disableExtension,
    dispose: disposeReadingState,
    getUrlQueryParams,
  };

  return readingStateRef;
}
