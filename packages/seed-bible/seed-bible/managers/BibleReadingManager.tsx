import {
  type ApiRequestOptions,
  type AvailableTranslations,
  type ChapterFootnote,
  type ChapterVerse,
  type Translation,
  type TranslationBook,
  type TranslationBookChapter,
  type TranslationBooks,
} from "../managers/FreeUseBibleAPI";
import {
  type BibleDataManager,
  type VerseRef,
} from "../managers/BibleDataManager";
import {
  batch,
  computed,
  effect,
  signal,
  untracked,
  type ReadonlySignal,
  type Signal,
} from "@preact/signals";
import type { JSX } from "preact";
import { range, sortBy } from "es-toolkit";
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
import {
  annotationVerseNumbers,
  type Annotation,
  type AnnotationsManager,
} from "../managers/AnnotationsManager";

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
  /** Optional CSS class to apply to the entire chapter container. */
  containerClassName?: string;
  /** Optional inline style to apply to the decorated verse/range. */
  style?: JSX.CSSProperties;
  /** Renders the decorated verses as a highlight. See `VerseDecorationInput`. */
  highlight?: Omit<ChapterHighlight, "verse">;
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
  /** Optional CSS class to apply to the entire chapter container. */
  containerClassName?: string;

  /** Optional inline style to apply to the decorated verse/range. */
  style?: JSX.CSSProperties;

  /**
   * Renders the decorated verses as a highlight, drawn by the same SVG ribbon
   * layer as the reader's own highlights — so a preset `colorId` resolves
   * against each viewer's active theme rather than a colour baked in here.
   *
   * Prefer this over hand-writing `className`/`style`: the reader paints
   * highlight backgrounds in the ribbon layer, not in CSS, so a
   * `sb-highlight-<id>` class alone sets only the font colour.
   *
   * Takes precedence over a saved highlight on the same verse.
   */
  highlight?: Omit<ChapterHighlight, "verse">;

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
  /**
   * Books metadata for the currently selected translation, or null when that
   * translation's catalog has not been downloaded yet. Derived from the data
   * manager's cache, so it always agrees with `translationId`.
   */
  translationBooks: ReadonlySignal<TranslationBooks | null>;
  /** Loaded chapter payload for the current translation/book/chapter. */
  chapterData: Signal<TranslationBookChapter | null>;
  /** Highlights scoped to the active chapter. */
  highlights: ReadonlySignal<ChapterHighlights>;
  /** Active transient verse decorations for rendering. */
  decorations: ReadonlySignal<VerseDecoration[]>;
  /** Current multi-verse selection in the active chapter. */
  selectedVerses: Signal<BibleSelectedVerse[]>;
  /**
   * Annotations covering any of the currently selected verses, scoped to the
   * active chapter. A whole-chapter annotation (no verse targeting) never
   * matches here, since `annotationVerseNumbers` resolves it to `[]`. Empty
   * when this reading state was created without an `AnnotationsManager`
   * (e.g. a shared session's reading state).
   */
  selectionAnnotations: ReadonlySignal<Annotation[]>;
  /** Currently selected footnote with resolved verse/chapter context. */
  selectedFootnote: ReadonlySignal<SelectedFootnote | null>;
  /**
   * True while this reading state is waiting on a request.
   *
   * Note this does *not* gate navigation — the position signals move
   * immediately whether or not a request is outstanding. To ask "is the text on
   * screen the text for where I am?", use `isChapterContentStale`.
   */
  loading: ReadonlySignal<boolean>;
  /**
   * True when `chapterData` is not the chapter for the current position —
   * either nothing has loaded yet, or the reader has moved on and the new
   * chapter's text has not arrived. This is what a loading placeholder should
   * key off.
   */
  isChapterContentStale: ReadonlySignal<boolean>;
  /** Error message from the most recent failed operation, if any. */
  error: Signal<string | null>;
  /**
   * Re-runs the most recent load operation — initial load, translation/book/
   * chapter selection, or next/previous navigation — so a failed load can be
   * retried without the user losing their place. Falls back to reloading the
   * initial data when no load has been attempted yet.
   */
  retryLoad: () => Promise<void>;
  /**
   * Resolves once the first chapter load reaches a terminal outcome: content
   * arrived, the load failed, or (during SSR only) it exceeded a deadline.
   * Throw this in a component to suspend rendering until then.
   *
   * Never rejects — a rejected promise thrown during `renderToStringAsync`
   * becomes a render exception and loses the whole document.
   *
   * Always pair a throw with `initialChapterLoadSettled`, or a load that
   * finishes without content will suspend, resume, and suspend again in a loop.
   */
  chapterDataPromise: Promise<void>;
  /**
   * True once the first chapter load has finished, whether or not it produced
   * content. Distinguishes "still loading" from "finished with nothing", which
   * `chapterData === null` on its own cannot.
   */
  initialChapterLoadSettled: ReadonlySignal<boolean>;
  /** Scroll position snapshot for chapter restoration/UI syncing. */
  scrollPosition: Signal<number>;
  /** Pending verse number to scroll to after chapter content renders. */
  scrollToVerse: Signal<number | null>;
  /**
   * Set when an annotated verse number is clicked; consumed once by whichever
   * surface renders that verse's annotation (the mobile verse toolbar) to
   * expand and scroll to it, then cleared.
   */
  pendingAnnotationScrollVerse: Signal<number | null>;

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

  /**
   * True when a next chapter is available to navigate to. Reflects the
   * highest-priority enabled extension's `hasNext` override when one is
   * provided; otherwise falls back to whether the current chapter has a
   * `nextChapterApiLink`.
   */
  hasNext: ReadonlySignal<boolean>;

  /**
   * True when a previous chapter is available to navigate to. Reflects the
   * highest-priority enabled extension's `hasPrevious` override when one is
   * provided; otherwise falls back to whether the current chapter has a
   * `previousChapterApiLink`.
   */
  hasPrevious: ReadonlySignal<boolean>;

  /**
   * The chapter `loadNextChapter`/`loadPreviousChapter` would move to, resolved
   * without moving there — for callers that render the neighbouring chapter
   * ahead of time, like the mobile swipe preview. Enabled extensions answer
   * first (so playback previews its own queue), falling back to the current
   * chapter's next/previous link. `null` when there is nothing to show.
   */
  getAdjacentChapter: (
    direction: "next" | "previous",
    options?: ApiRequestOptions
  ) => Promise<TranslationBookChapter | null>;

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

  /**
   * Human-readable title for this reading state ("Genesis 1" by default);
   * reading extensions can override it via `transformTitle`.
   */
  title: ReadonlySignal<string>;

  /**
   * Compact title for tight spaces ("GEN 1" by default); reading extensions
   * can override it via `transformShortTitle`.
   */
  shortTitle: ReadonlySignal<string>;

  /**
   * Secondary title line (the translation name by default); reading extensions
   * can override it via `transformSubTitle`.
   */
  subTitle: ReadonlySignal<string>;

  /**
   * Compact secondary title for tight spaces (the translation short name by
   * default); reading extensions can override it via `transformShortSubTitle`.
   */
  shortSubTitle: ReadonlySignal<string>;

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
   * Subscribes to navigation events for this reading state. The listener is
   * invoked once per completed navigation (chapter/book/translation change,
   * extension toggle, etc.), which lets the owner prescriptively update the URL
   * exactly once per navigation instead of reacting to each underlying signal.
   * @param listener Called with the navigation's URL intent (push vs replace).
   * @returns An unsubscribe function.
   */
  onNavigate: (
    listener: (options: ReadingNavigationOptions) => void
  ) => () => void;

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
export const UI_TO_BIBLE_LANGUAGE_CODES: Record<string, string[]> = {
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

/**
 * Builds the inverse of `UI_TO_BIBLE_LANGUAGE_CODES`: a map from a Bible-API
 * language code (ISO 639-3, e.g. "spa") to the single UI locale that should
 * wrap it (e.g. "es").
 *
 * Some UI locales share a Bible language (e.g. `he`/`iw` both map to `heb`,
 * `fil`/`tl` to `tgl`, `no`/`nb` to `nob`/`nor`). Ties are broken by insertion
 * order in `UI_TO_BIBLE_LANGUAGE_CODES`: the first locale listed for a code
 * wins, which is the canonical two-letter code (`he` over `iw`, `fil` over
 * `tl`, `no` over `nb`).
 */
export function buildBibleLanguageToUiLocale(): Map<string, string> {
  const map = new Map<string, string>();

  for (const [ui, codes] of Object.entries(UI_TO_BIBLE_LANGUAGE_CODES)) {
    for (const code of codes) {
      const key = code.toLowerCase();
      if (!map.has(key)) {
        map.set(key, ui);
      }
    }
  }

  return map;
}

const BIBLE_LANGUAGE_TO_UI_LOCALE = buildBibleLanguageToUiLocale();

/**
 * Resolves the UI locale that maps to a translation's Bible language, or
 * `null` when no supported UI locale covers that language.
 *
 * Shared by the sitemap generator (`script/lib/sitemap.ts`) and the app's own
 * `canonicalUrl`, which must agree on the language segment or the sitemap
 * would advertise URLs whose pages disown them.
 */
export function bibleLanguageToUiLocale(
  bibleLanguage: string | null | undefined
): string | null {
  if (!bibleLanguage) {
    return null;
  }
  return BIBLE_LANGUAGE_TO_UI_LOCALE.get(bibleLanguage.toLowerCase()) ?? null;
}

const UI_LOCALE_BY_DEFAULT_TRANSLATION_ID = new Map<string, string>(
  Array.from(DEFAULT_TRANSLATIONS_BY_LANGUAGE, ([ui, translation]) => [
    translation.id,
    ui,
  ])
);

/**
 * The UI locale a translation is the hardcoded default for, or `null` if it
 * isn't one.
 *
 * A static lookup, unlike `bibleLanguageToUiLocale`, which needs the
 * translation's `language` from the catalog. That matters on the server, where
 * the catalog may not have arrived (or may have failed) but the URL still names
 * a translation we need a canonical language for.
 */
export function uiLocaleForDefaultTranslation(
  translationId: string | null | undefined
): string | null {
  if (!translationId) {
    return null;
  }
  return UI_LOCALE_BY_DEFAULT_TRANSLATION_ID.get(translationId) ?? null;
}

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

/**
 * How close together two position changes have to be to count as one gesture
 * for the purposes of the Back button.
 *
 * Long enough to absorb a rapid skim — presses, held arrow keys, repeated
 * swipes — so ten chapters cost one Back press rather than ten. Short enough
 * that reading a chapter and then deliberately moving on gives you a history
 * entry you can go back to.
 */
export const NAVIGATION_COALESCE_MS = 400;

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

  /**
   * Whether this navigation should update the URL (emit a navigation event).
   * Defaults to `true`. Pass `false` when the navigation is itself being
   * driven _from_ the URL (deep link / back-forward sync) so it does not push
   * a redundant history entry back onto the stack.
   */
  updateUrl?: boolean;
}

/** Options describing how a reading-state navigation should affect the URL. */
export interface ReadingNavigationOptions {
  /**
   * When `true`, the URL should be updated with `replaceState` (no new history
   * entry). When `false`/omitted, a new history entry is pushed.
   */
  replace?: boolean;
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

/**
 * Where the reader is, independent of whether that chapter's text has been
 * downloaded yet. Kept deliberately separate from `TranslationBookChapter` so
 * navigation can be answered from book metadata alone, with no network call.
 */
export interface ReadingPosition {
  translationId: string;
  bookId: string;
  chapterNumber: number;
}

/** Stable string form of a position, for use as a Map key. */
export function positionKey(position: ReadingPosition): string {
  return `${position.translationId}/${position.bookId}/${position.chapterNumber}`;
}

export function positionsEqual(
  a: ReadingPosition | null,
  b: ReadingPosition | null
): boolean {
  if (!a || !b) {
    return a === b;
  }
  return (
    a.translationId === b.translationId &&
    a.bookId === b.bookId &&
    a.chapterNumber === b.chapterNumber
  );
}

/**
 * The book's first chapter number, which is not always 1. Defaults defensively,
 * matching how the existing navigation code has always read this field.
 */
function firstChapterOf(book: TranslationBook): number {
  return book.firstChapterNumber ?? 1;
}

/**
 * The book's last chapter number, derived from `firstChapterNumber` plus
 * `numberOfChapters` rather than read from `lastChapterNumber`.
 *
 * Both fields describe the same thing, but the app has always clamped using the
 * arithmetic form, so deriving it keeps `resolveChapterInBook` and
 * `nextPosition` in agreement even if a catalog reports the two inconsistently.
 * `lastChapterNumber` is only used as a fallback when the chapter count is
 * missing or nonsensical.
 */
function lastChapterOf(book: TranslationBook): number {
  const first = firstChapterOf(book);
  const count = book.numberOfChapters;
  if (Number.isFinite(count) && count > 0) {
    return first + count - 1;
  }
  const last = book.lastChapterNumber;
  return Number.isFinite(last) && last >= first ? last : first;
}

/**
 * Resolves a requested chapter number against a book: the request is honoured
 * when it falls inside the book, and otherwise falls back to the book's first
 * chapter.
 *
 * Note this is a fallback rather than a true clamp — asking for chapter 99999
 * of Genesis lands on Genesis 1, not Genesis 50. That is the app's existing
 * behaviour, previously duplicated in `selectTranslationAndChapter` and
 * `loadInitialData`; this is the single home for it.
 */
export function resolveChapterInBook(
  book: TranslationBook,
  chapterNumber: number
): number {
  const first = firstChapterOf(book);
  const last = lastChapterOf(book);
  return chapterNumber >= first && chapterNumber <= last
    ? chapterNumber
    : first;
}

/**
 * The book immediately before or after `currentBookId` in canonical order.
 *
 * `order` is the canonical sequence, and it is neither contiguous (a translation
 * that omits books leaves gaps — the test catalog jumps 1, 2, 40) nor guaranteed
 * to match the array's own ordering. So this picks the nearest `order` in the
 * requested direction rather than indexing into the array.
 */
function adjacentBook(
  books: TranslationBooks,
  currentBookId: string,
  direction: 1 | -1
): TranslationBook | null {
  const current = books.books.find((book) => book.id === currentBookId);
  if (!current) {
    return null;
  }

  let nearest: TranslationBook | null = null;
  for (const book of books.books) {
    if (book.id === current.id) {
      continue;
    }
    const isAhead =
      direction === 1 ? book.order > current.order : book.order < current.order;
    if (!isAhead) {
      continue;
    }
    const isNearer =
      !nearest ||
      (direction === 1
        ? book.order < nearest.order
        : book.order > nearest.order);
    if (isNearer) {
      nearest = book;
    }
  }
  return nearest;
}

/**
 * The chapter after `position`, or null when there is none (the last chapter of
 * the last book). Crossing a book boundary lands on the next book's first
 * chapter. Returns null when the book is not in this translation's catalog.
 */
export function nextPosition(
  books: TranslationBooks,
  position: ReadingPosition
): ReadingPosition | null {
  const book = books.books.find((entry) => entry.id === position.bookId);
  if (!book) {
    return null;
  }

  if (position.chapterNumber < lastChapterOf(book)) {
    return { ...position, chapterNumber: position.chapterNumber + 1 };
  }

  const next = adjacentBook(books, position.bookId, 1);
  if (!next) {
    return null;
  }
  return {
    ...position,
    bookId: next.id,
    chapterNumber: firstChapterOf(next),
  };
}

/**
 * The chapter before `position`, or null when there is none (the first chapter
 * of the first book). Crossing a book boundary lands on the previous book's
 * last chapter.
 */
export function previousPosition(
  books: TranslationBooks,
  position: ReadingPosition
): ReadingPosition | null {
  const book = books.books.find((entry) => entry.id === position.bookId);
  if (!book) {
    return null;
  }

  if (position.chapterNumber > firstChapterOf(book)) {
    return { ...position, chapterNumber: position.chapterNumber - 1 };
  }

  const previous = adjacentBook(books, position.bookId, -1);
  if (!previous) {
    return null;
  }
  return {
    ...position,
    bookId: previous.id,
    chapterNumber: lastChapterOf(previous),
  };
}

/**
 * Highlights `ref`'s verse range in `tab`, diminishing after 3s.
 *
 * `toEndOfChapter` fragments (from `expandCrossChapterItem`) don't know the
 * chapter's actual verse count until it's loaded; resolve it here, guarding
 * against stale chapter data left over from a failed fetch
 * (`selectTranslationAndChapter` doesn't clear `chapterData` on error).
 *
 * `verseNumbers`, when given, is used verbatim instead of expanding
 * `ref.verse`..`ref.endVerse` into a contiguous range - callers whose source
 * data can be non-contiguous (e.g. an annotation's gapped verse selection)
 * should pass the exact set to highlight.
 */
export function emphasizeVerses(
  readingState: BibleReadingState,
  ref: VerseRef,
  verseNumbers?: number[]
): string | null {
  if (!ref.verse) {
    return null;
  }

  const endVerse = ref.endVerse;
  const verses =
    verseNumbers ?? (endVerse ? range(ref.verse, endVerse + 1) : [ref.verse]);

  return readingState.decorateVerses(ref.book, ref.chapter, verses, {
    className: "sb-verse-decoration-diminish",
    containerClassName: "sb-chapter-decoration-diminish",
    removeAfterMs: 3000,
  });
}

export function createBibleReadingState(
  dataManager: BibleDataManager,
  highlightsManager: HighlightsManager,
  i18nManager: I18nManager,
  options: InitialBibleReadingOptions = {},
  discoverManager?: DiscoverManager,
  readingExtensionManager?: BibleReadingExtensionManager,
  /**
   * Lazily resolved rather than passed directly: `AnnotationsManager` itself
   * depends on `TabsManager`, which is what constructs the *first* tab's
   * reading state — a direct reference would be a construction-order cycle.
   * By the time anything actually reads `selectionAnnotations.value`, the
   * caller's `AnnotationsManager` already exists.
   */
  getAnnotationsManager?: () => AnnotationsManager | undefined
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
  // Derived from the data manager's cache rather than stored locally, so the
  // catalog always matches `translationId` — including the instant it changes.
  // A locally stored copy was only refreshed after a chapter finished loading,
  // which left it describing the *previous* translation in between (wrong
  // chapter counts, and a stale text direction for RTL translations).
  const translationBooks = computed<TranslationBooks | null>(
    () => dataManager.translationBooks.value.get(translationId.value) ?? null
  );
  const chapterData = signal<TranslationBookChapter | null>(null);
  /**
   * Latches true once the first attempt to load chapter content reaches a
   * terminal outcome — content arrived, the load failed, or (during SSR) it took
   * too long. Consumers that suspend on `chapterDataPromise` use this to know
   * the difference between "still coming" and "not coming", so they suspend once
   * rather than repeatedly.
   */
  const initialChapterLoadSettled = signal<boolean>(false);
  const selectedVerses = signal<BibleSelectedVerse[]>([]);
  const selectedFootnoteId = signal<number | null>(null);
  const activeChapterHighlights = signal<ReadonlySignal<ChapterHighlights>>(
    signal<ChapterHighlights>({
      highlights: [],
    })
  );
  const highlights = computed<ChapterHighlights>(
    () => activeChapterHighlights.value.value
  );
  const activeChapterAnnotations = signal<ReadonlySignal<Annotation[]>>(
    signal<Annotation[]>([])
  );
  const chapterAnnotations = computed<Annotation[]>(
    () => activeChapterAnnotations.value.value
  );
  const selectionAnnotations = computed<Annotation[]>(() => {
    const verseNumbers = selectedVerses.value.map((v) => v.verse.number);
    if (verseNumbers.length === 0) return [];
    return chapterAnnotations.value.filter((annotation) =>
      annotationVerseNumbers(annotation).some((n) => verseNumbers.includes(n))
    );
  });
  const decorations = signal<VerseDecoration[]>([]);
  const decorationRemovalTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  /**
   * How many requests this reading state is currently waiting on.
   *
   * `loading` is derived from this rather than assigned, so overlapping
   * navigations can't have one finishing request clear the flag while another is
   * still in the air.
   */
  const inFlightCount = signal<number>(0);
  const beginRequest = () => {
    inFlightCount.value = inFlightCount.peek() + 1;
  };
  const endRequest = () => {
    inFlightCount.value = inFlightCount.peek() - 1;
  };
  const loading = computed<boolean>(() => inFlightCount.value > 0);
  const error = signal<string | null>(null);
  const scrollPosition = signal<number>(0);
  const scrollToVerse = signal<number | null>(null);
  const pendingAnnotationScrollVerse = signal<number | null>(null);

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

  let resolveChapterDataPromise: () => void = () => {};
  const chapterDataPromise = new Promise<void>((resolve) => {
    resolveChapterDataPromise = resolve;
  });

  /**
   * During SSR the render blocks on `chapterDataPromise`, so an upstream that
   * never answers would hold the request open indefinitely. Past this deadline
   * we give up waiting and serve the shell instead.
   *
   * Not armed on the client: there the promise only gates a Suspense boundary,
   * and a genuinely slow connection deserves to keep waiting rather than have
   * the reading area emptied out from under it.
   */
  const SSR_INITIAL_CHAPTER_TIMEOUT_MS = 5000;
  const initialChapterLoadTimer = import.meta.env.SSR
    ? setTimeout(() => {
        initialChapterLoadSettled.value = true;
      }, SSR_INITIAL_CHAPTER_TIMEOUT_MS)
    : null;
  const clearInitialChapterLoadTimer = () => {
    if (initialChapterLoadTimer !== null) {
      clearTimeout(initialChapterLoadTimer);
    }
  };
  effectDisposers.push(clearInitialChapterLoadTimer);

  // Resolves — never rejects. A rejected promise thrown during
  // `renderToStringAsync` surfaces as a render exception and takes down the
  // whole document; resolving lets the already-rendered error branch explain
  // what went wrong instead. Depends only on the latch, so it settles once.
  effectDisposers.push(
    effect(() => {
      if (!initialChapterLoadSettled.value) {
        return;
      }
      clearInitialChapterLoadTimer();
      resolveChapterDataPromise();
    })
  );

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

    // Enabling an extension can add query params (via transformQueryParams),
    // but it is not a chapter navigation, so update the URL in place.
    emitNavigate({ replace: true });
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

    // Disabling drops the extension's query params; update the URL in place.
    emitNavigate({ replace: true });
  };

  const isExtensionEnabled = (extensionId: string) =>
    enabledRuntimes.value.has(extensionId);

  /**
   * Runs the enabled extensions' navigation hooks in priority order, returning
   * the first non-`default` outcome (or `default` when none intervene).
   */
  const runNavigationHooks = (
    direction: "next" | "previous"
  ): ReadingNavigationOutcome | Promise<ReadingNavigationOutcome> => {
    const currentChapter = chapterData.peek();
    if (!currentChapter) {
      return { type: "default" };
    }

    const runtimes = orderedEnabledRuntimes.peek();

    // Returns synchronously whenever the hooks do, so a hook that declines to
    // intervene (the common case) does not put a microtask in front of the
    // position write — which would let two rapid presses compute their targets
    // from the same starting point.
    const runFrom = (
      startIndex: number
    ): ReadingNavigationOutcome | Promise<ReadingNavigationOutcome> => {
      for (let index = startIndex; index < runtimes.length; index++) {
        const runtime = runtimes[index]!;
        const hook =
          direction === "next"
            ? runtime.instance.navigateNext
            : runtime.instance.navigatePrevious;
        if (!hook) {
          continue;
        }

        const outcome = hook({
          readingState: readingStateRef,
          currentChapter,
          data: runtime.data,
        });
        if (outcome instanceof Promise) {
          return outcome.then((resolved) =>
            resolved.type === "default" ? runFrom(index + 1) : resolved
          );
        }
        if (outcome.type !== "default") {
          return outcome;
        }
      }

      return { type: "default" };
    };

    return runFrom(0);
  };

  const navigationListeners = new Set<
    (options: ReadingNavigationOptions) => void
  >();

  const onNavigate = (
    listener: (options: ReadingNavigationOptions) => void
  ) => {
    navigationListeners.add(listener);
    return () => {
      navigationListeners.delete(listener);
    };
  };

  const emitNavigate = (options: ReadingNavigationOptions = {}) => {
    for (const listener of Array.from(navigationListeners)) {
      listener(options);
    }
  };

  /**
   * When the last position change was published to the URL, on a monotonic
   * clock. Null until the first one.
   *
   * `performance.now()` rather than `Date.now()` because this measures an
   * elapsed interval: a wall-clock adjustment mid-skim would otherwise decide
   * how many history entries the reader gets.
   */
  let lastNavigateAt: number | null = null;

  /**
   * Publishes a position change for the URL, collapsing a burst into a single
   * history entry.
   *
   * Navigation is instant now, so skimming ten chapters is ten position changes
   * in about a second — and ten Back presses to undo. Anything following
   * closely enough on the last one is treated as a continuation of the same
   * gesture and replaces its history entry instead of adding one, so a skim
   * costs one Back press and lands the reader where the skim started. A
   * deliberate, paced navigation is still its own entry.
   *
   * Callers that already know they are correcting rather than navigating (a
   * clamped chapter, an extension toggle) pass `replace` explicitly and are not
   * subject to the timing rule.
   */
  const emitPositionNavigate = (explicitReplace?: boolean) => {
    const now = performance.now();
    const isContinuationOfGesture =
      lastNavigateAt !== null && now - lastNavigateAt < NAVIGATION_COALESCE_MS;
    lastNavigateAt = now;
    emitNavigate({ replace: explicitReplace ?? isContinuationOfGesture });
  };

  const disposeReadingState = () => {
    // Stops the content loader from committing anything that resolves after
    // teardown, and releases anyone still awaiting a navigation.
    disposed = true;
    // Nothing will read the result, so stop paying for it. Matters most when a
    // tab is closed mid-load on a slow connection.
    abortOpenContentRequest();
    for (const key of Array.from(contentWaiters.keys())) {
      settleContentWaiters(key);
    }

    // Clear listeners first so extension teardown below cannot emit navigation
    // events into an owner that is being torn down.
    navigationListeners.clear();
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

  // Resolves the current book's display record from the books catalog by id,
  // falling back to the loaded chapter while that catalog is missing.
  //
  // Catalog-first, not content-first: the catalog is keyed on `bookId`, which
  // moves the instant the reader navigates, whereas `chapterData` still
  // describes the chapter they left until its replacement downloads. Reading
  // the chapter first left every title a chapter behind the header for the
  // whole of a fast skim.
  const resolveCurrentBook = () => {
    const catalogBook = translationBooks.value?.books.find(
      (b) => b.id === bookId.value
    );
    if (catalogBook) {
      return catalogBook;
    }
    return chapterData.value?.book;
  };

  // Default title ("Genesis 1"), using the app-wide `name ?? commonName ?? id`
  // idiom. Empty while no book is resolvable yet.
  const baseTitle = computed<string>(() => {
    const book = resolveCurrentBook();
    const bookName = book?.name ?? book?.commonName ?? bookId.value;
    if (!bookName) {
      return "";
    }
    return `${bookName} ${chapterNumber.value}`;
  });

  // Default short title ("GEN 1"): the compact book id + chapter form used by
  // the collapsed tab strip. Empty while no book is selected.
  const baseShortTitle = computed<string>(() => {
    const id = bookId.value;
    if (!id) {
      return "";
    }
    return `${id} ${chapterNumber.value}`;
  });

  // Default subtitle: the name of the current translation. Catalog first, for
  // the same reason as `resolveCurrentBook` — it tracks `translationId`, while
  // the loaded chapter names whichever translation was on screen last.
  const baseSubTitle = computed<string>(() => {
    return translation.value?.name ?? chapterData.value?.translation.name ?? "";
  });

  // Default compact subtitle: the current translation's short name (e.g.
  // "AAB"). Empty while it is not yet resolvable.
  const baseShortSubTitle = computed<string>(() => {
    return (
      translation.value?.shortName ??
      chapterData.value?.translation.shortName ??
      ""
    );
  });

  // Folds a base string through each enabled extension's transform hook in
  // priority order. Mirrors `discoveredResultsForDisplay` / `getUrlQueryParams`.
  const applyTitleTransforms = (
    base: string,
    pick: (
      instance: ReadingExtensionInstance
    ) => ReadingExtensionInstance["transformTitle"]
  ): string => {
    let current = base;
    for (const runtime of orderedEnabledRuntimes.value) {
      const transform = pick(runtime.instance);
      if (!transform) {
        continue;
      }
      current = transform({
        readingState: readingStateRef,
        data: runtime.data,
        label: current,
      });
    }
    return current;
  };

  // Titles surfaced to consumers: the defaults passed through each enabled
  // extension's matching transform hook in priority order.
  const title = computed<string>(() =>
    applyTitleTransforms(baseTitle.value, (i) => i.transformTitle)
  );
  const shortTitle = computed<string>(() =>
    applyTitleTransforms(baseShortTitle.value, (i) => i.transformShortTitle)
  );
  const subTitle = computed<string>(() =>
    applyTitleTransforms(baseSubTitle.value, (i) => i.transformSubTitle)
  );
  const shortSubTitle = computed<string>(() =>
    applyTitleTransforms(
      baseShortSubTitle.value,
      (i) => i.transformShortSubTitle
    )
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

  /**
   * A verse to scroll to once content for a specific position arrives.
   *
   * Held here rather than published straight to `scrollToVerse` because the
   * request is made when navigation *starts* but is only meaningful once the
   * matching chapter has rendered. Publishing it early would scroll into
   * whichever chapter is currently on screen and consume the target before the
   * intended one appears.
   *
   * Seeded from `options.scrollToVerse` so a `?verse=` deep link is recorded
   * before anything can arrive. The content loader starts on the initial
   * position immediately — one round trip — while `loadInitialData` needs two
   * (translations, then the book catalog) before it can record the target
   * itself, so the text reliably lands first. Waiting for that would drop the
   * scroll, and since the position doesn't change afterwards nothing would ever
   * publish it. `loadInitialData` still re-records it against the position it
   * settles on, which is what covers a corrected translation or chapter.
   */
  let pendingScrollTarget: (ReadingPosition & { verse: number }) | null = (():
    | (ReadingPosition & { verse: number })
    | null => {
    const initialBookId = bookId.peek();
    const verse = options.scrollToVerse;
    if (!initialBookId || verse === undefined) {
      return null;
    }
    return {
      translationId: translationId.peek(),
      bookId: initialBookId,
      chapterNumber: chapterNumber.peek(),
      verse,
    };
  })();

  /**
   * Bumped for every content request. Only the newest generation is allowed to
   * write `chapterData`, so a slow request for a chapter the reader has already
   * skimmed past can never overwrite where they actually are.
   */
  let loadGeneration = 0;
  let disposed = false;

  /**
   * Bumped to make the loader effect re-run for a position that has *not*
   * changed.
   *
   * Re-applying the same position writes no new signal value, so on its own the
   * effect would never notice. That makes a failed load unretryable: picking the
   * same chapter again would issue no request, and anyone awaiting the
   * navigation would be waiting on content nothing was fetching.
   */
  const contentRetryNonce = signal(0);

  /** Callers waiting for content to arrive, keyed by `positionKey`. */
  const contentWaiters = new Map<string, Array<() => void>>();

  /** Where the reader is right now, or null before a book has been resolved. */
  const currentPosition = (): ReadingPosition | null => {
    const currentBookId = bookId.peek();
    if (!currentBookId) {
      return null;
    }
    return {
      translationId: translationId.peek(),
      bookId: currentBookId,
      chapterNumber: chapterNumber.peek(),
    };
  };

  const chapterMatchesPosition = (
    chapter: TranslationBookChapter | null,
    position: ReadingPosition
  ): boolean =>
    !!chapter &&
    chapter.translation.id === position.translationId &&
    chapter.book.id === position.bookId &&
    chapter.chapter.number === position.chapterNumber;

  const isChapterContentStale = computed<boolean>(() => {
    const currentBookId = bookId.value;
    if (!currentBookId) {
      return true;
    }
    return !chapterMatchesPosition(chapterData.value, {
      translationId: translationId.value,
      bookId: currentBookId,
      chapterNumber: chapterNumber.value,
    });
  });

  const settleContentWaiters = (key: string) => {
    const waiters = contentWaiters.get(key);
    if (!waiters) {
      return;
    }
    contentWaiters.delete(key);
    for (const resolve of waiters) {
      resolve();
    }
  };

  /**
   * Resolves once the given position has its content — or as soon as it is
   * clear it never will, because the reader has already moved somewhere else.
   *
   * This is what keeps the navigation methods' promises meaning what they
   * always meant ("the chapter is ready"), even though the signals themselves
   * now move immediately. Callers that await a navigation and then read
   * `chapterData` continue to work unchanged.
   */
  const whenContentSettled = (position: ReadingPosition): Promise<void> => {
    if (chapterMatchesPosition(chapterData.peek(), position)) {
      return Promise.resolve();
    }
    if (!positionsEqual(position, currentPosition())) {
      return Promise.resolve();
    }
    const key = positionKey(position);
    return new Promise<void>((resolve) => {
      const waiters = contentWaiters.get(key);
      if (waiters) {
        waiters.push(resolve);
      } else {
        contentWaiters.set(key, [resolve]);
      }
    });
  };

  /**
   * Commits where the reader is: the position signals plus everything keyed to
   * a position (scroll reset, decorations, selection, highlights).
   *
   * Deliberately synchronous and free of any content dependency, so it can run
   * the moment navigation is requested rather than after a chapter downloads.
   */
  const applyPosition = (
    next: ReadingPosition,
    options?: {
      scrollToVerse?: number | null;
      /** Defaults to true. False when the navigation came *from* the URL. */
      updateUrl?: boolean;
      /** Replace the current history entry instead of pushing a new one. */
      replace?: boolean;
      /**
       * Content already in hand for this position, committed alongside it so
       * the loader has nothing to fetch. Used by extension navigation hooks,
       * which hand over a whole chapter rather than a reference.
       */
      content?: TranslationBookChapter;
    }
  ) => {
    const didPositionChange =
      translationId.peek() !== next.translationId ||
      bookId.peek() !== next.bookId ||
      chapterNumber.peek() !== next.chapterNumber;
    const scrollToVerseRequest = options?.scrollToVerse ?? null;

    batch(() => {
      const didChapterChange =
        bookId.value !== next.bookId ||
        chapterNumber.value !== next.chapterNumber;
      if (didChapterChange) {
        scrollPosition.value = 0;
      }

      translationId.value = next.translationId;
      bookId.value = next.bookId;
      chapterNumber.value = next.chapterNumber;
      selectedFootnoteId.value = null;

      // Pruning reads the position signals through `decorationMatchesState`, so
      // it has to come after the writes above to be judged against the new
      // position.
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

      pendingScrollTarget =
        scrollToVerseRequest === null
          ? null
          : { ...next, verse: scrollToVerseRequest };

      activeChapterHighlights.value = highlightsManager.getChapterHighlights(
        next.translationId,
        next.bookId,
        next.chapterNumber
      );
      const annotationsManager = getAnnotationsManager?.();
      activeChapterAnnotations.value = annotationsManager
        ? annotationsManager.getAnnotationsForChapter(
            next.bookId,
            next.chapterNumber
          )
        : signal<Annotation[]>([]);

      if (options?.content) {
        // Supersede any request already in the air before committing, so a
        // slower fetch can't land on top of the content we were handed.
        loadGeneration += 1;
        applyChapterContent(options.content);
      } else if (
        !didPositionChange &&
        chapterMatchesPosition(chapterData.peek(), next)
      ) {
        // Already showing this chapter, so the position-driven loader effect
        // has nothing to fetch and will never call `applyChapterContent` —
        // which is normally what hands `pendingScrollTarget` off to
        // `scrollToVerse`. Publish it directly, or a scroll request against a
        // chapter that's already loaded would be silently dropped.
        if (scrollToVerseRequest !== null) {
          pendingScrollTarget = null;
          scrollToVerse.value = scrollToVerseRequest;
        }
      } else if (
        !didPositionChange &&
        !positionsEqual(openContentRequestPosition, next)
      ) {
        // The position is where it already was, but its text is missing — the
        // last attempt failed, and nothing is trying again. The signals hold no
        // news for the loader effect, so say so explicitly. Skipped while a
        // request for this position is already open, so re-picking the chapter
        // you are waiting on doesn't restart the download from scratch.
        contentRetryNonce.value = contentRetryNonce.peek() + 1;
      }
    });

    // Anything still waiting on a different position is never going to get
    // content now — release those callers rather than leaving them hanging.
    const nextKey = positionKey(next);
    for (const key of Array.from(contentWaiters.keys())) {
      if (key !== nextKey) {
        settleContentWaiters(key);
      }
    }

    if (options?.updateUrl === false) {
      return;
    }
    if (!didPositionChange && scrollToVerseRequest === null) {
      // Nothing moved, so this must not cost a Back entry. The URL is still
      // rewritten rather than skipped, because it can be out of step with the
      // position for reasons other than a move — a `verse` param to drop, an
      // extension's params to re-derive. And because this is not part of a
      // gesture, it goes straight to `emitNavigate`: letting it stamp the
      // coalescing clock would make the reader's *next* real navigation look
      // like a continuation of a press that never happened.
      emitNavigate({ replace: true });
      return;
    }
    emitPositionNavigate(options?.replace);
  };

  /**
   * Commits the chapter text for a position that has already been applied.
   *
   * `scrollToVerse` is published here, in the same batch as `chapterData`, so a
   * consumer never observes a scroll target against the wrong chapter — and
   * only when the arriving chapter is the one the target was requested for.
   */
  const applyChapterContent = (chapter: TranslationBookChapter) => {
    batch(() => {
      chapterData.value = chapter;
      initialChapterLoadSettled.value = true;
      error.value = null;

      const target = pendingScrollTarget;
      const targetMatchesChapter =
        !!target &&
        target.translationId === chapter.translation.id &&
        target.bookId === chapter.book.id &&
        target.chapterNumber === chapter.chapter.number;
      scrollToVerse.value = targetMatchesChapter ? target.verse : null;
      pendingScrollTarget = null;
    });
  };

  /**
   * Cancels the chapter request this reading state currently has open, if any.
   *
   * The generation counter already stops a superseded response being displayed;
   * this is what stops it being *downloaded*. On a slow connection, skimming
   * ten chapters otherwise leaves nine unwanted downloads queued ahead of the
   * one the reader is actually waiting for.
   */
  let contentRequestController: AbortController | null = null;
  /**
   * The position the open request is for, so a re-apply of that same position
   * can tell "nothing is fetching this" from "this is already on its way".
   */
  let openContentRequestPosition: ReadingPosition | null = null;
  const abortOpenContentRequest = () => {
    contentRequestController?.abort();
    contentRequestController = null;
    openContentRequestPosition = null;
  };

  /** True for the rejection a caller gets back from its own cancellation. */
  const isAbortError = (err: unknown): boolean =>
    err instanceof Error && err.name === "AbortError";

  /**
   * Fetches the chapter for a position and commits it — but only if it is still
   * the newest request when it lands.
   */
  const requestContent = async (
    position: ReadingPosition,
    generation: number
  ) => {
    beginRequest();

    // Warm this translation's catalog without blocking the text on it. The
    // catalog supplies the book name and next/previous availability; a position
    // reached by a direct signal write (shared sessions, deep links) may be the
    // first time we have seen this translation at all.
    //
    // Deliberately not cancellable: it is one small request per translation,
    // every position needs it, and letting it finish is what makes the *next*
    // press instant.
    void dataManager.getTranslationBooks(position.translationId).catch(() => {
      // The chapter request below surfaces the failure; nothing to add here.
    });

    abortOpenContentRequest();
    const controller = new AbortController();
    contentRequestController = controller;
    openContentRequestPosition = position;

    try {
      const chapter = await dataManager.getTranslationBookChapter(
        position.translationId,
        position.bookId,
        position.chapterNumber,
        { signal: controller.signal }
      );
      if (disposed || generation !== loadGeneration) {
        return;
      }
      applyChapterContent(chapter);
    } catch (err) {
      if (disposed || generation !== loadGeneration) {
        return;
      }
      // Our own cancellation, which only ever happens because a newer request
      // replaced this one. Surfacing it would put an error on screen for a
      // chapter the reader has already moved off.
      if (isAbortError(err)) {
        return;
      }
      error.value =
        err instanceof Error ? err.message : "Failed to load chapter.";
    } finally {
      if (contentRequestController === controller) {
        contentRequestController = null;
        openContentRequestPosition = null;
      }
      endRequest();
      settleContentWaiters(positionKey(position));
    }
  };

  // The single owner of chapter loading. Navigation writes a position and
  // returns; this notices and fetches the matching text.
  //
  // Centralising it here means *every* route into a new position gets content,
  // including direct writes to the position signals (shared sessions do this),
  // and gives one place to enforce that only the newest request may commit.
  effectDisposers.push(
    effect(() => {
      // The only tracked reads in this effect. Everything else goes through
      // `.peek()` inside `untracked` — subscribing to the catalog here would
      // make it re-run when the catalog lands and abort the request it just
      // started, refetching on every translation switch.
      const nextTranslationId = translationId.value;
      const nextBookId = bookId.value;
      const nextChapterNumber = chapterNumber.value;
      // Subscribed but unused: this is how a retry of the position we are
      // already on gets us to run again (see `contentRetryNonce`).
      void contentRetryNonce.value;

      untracked(() => {
        if (disposed || !nextBookId) {
          return;
        }
        const position: ReadingPosition = {
          translationId: nextTranslationId,
          bookId: nextBookId,
          chapterNumber: nextChapterNumber,
        };

        // The reader is moving somewhere (or explicitly retrying), so whatever
        // failed before is not what they are looking at any more. Navigation
        // itself no longer clears this, and `BibleReader` renders the banner in
        // place of *any* content — so a stale error hides both the loading
        // placeholder and, on the branch below, a chapter already in hand.
        // Cleared here rather than in `requestContent` precisely because that
        // branch issues no request: offline on a chapter that failed, pressing
        // back to the one still on screen otherwise looked like it failed too.
        error.value = null;

        if (chapterMatchesPosition(chapterData.peek(), position)) {
          // Already showing this chapter — nothing to fetch, but anyone
          // awaiting this position is done.
          settleContentWaiters(positionKey(position));
          return;
        }
        loadGeneration += 1;
        void requestContent(position, loadGeneration);
      });
    })
  );

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

  /**
   * The load that is currently in flight (or was the last one to run), kept so
   * `retryLoad()` can repeat exactly what failed. Every direct navigation entry
   * point records itself here — except the navigation-hook step of
   * next/previous navigation, so that retrying never re-runs a hook that may
   * have already acted (see `navigateAdjacent`).
   */
  let lastLoadAttempt: (() => Promise<void>) | null = null;

  /**
   * Moves one chapter forward or back.
   *
   * The position write is synchronous — no `await` runs before it in the common
   * case — so pressing next repeatedly advances a chapter per press instead of
   * recomputing the same target while a request is in flight. The target comes
   * from the book catalog rather than the loaded chapter's next/previous link,
   * which is what used to tie navigation to the download.
   */
  /**
   * Degraded-path navigation for when this translation's book catalog hasn't
   * downloaded: follows the loaded chapter's own next/previous link instead of
   * computing the target from metadata.
   *
   * Slower by design — the position can only be written once the request lands,
   * because nothing on hand says where "next" is. But `hasNext`/`hasPrevious`
   * fall back to these same links in exactly this case, so without this the
   * chevron would be enabled and do nothing at all. Reachable whenever content
   * is committed without the loader warming the catalog (an extension handing
   * over a chapter for a translation we have never opened), or when a catalog
   * request failed while the chapter's succeeded.
   */
  const navigateByChapterLink = async (
    direction: "next" | "previous",
    from: ReadingPosition
  ) => {
    const chapter = chapterData.peek();
    // Links from a chapter the reader has already left would send them
    // somewhere they never asked for.
    if (!chapterMatchesPosition(chapter, from) || !chapter) {
      return;
    }

    // Recorded here, not at the top of `navigateAdjacent`: the hooks already
    // ran and declined to act, so a retry must resume from this fetch rather
    // than ask them again.
    lastLoadAttempt = () => navigateByChapterLink(direction, from);

    beginRequest();
    // Captured, not bumped: superseding here would strand the request already
    // fetching the current position if this one fails.
    const generation = loadGeneration;
    try {
      const adjacent =
        direction === "next"
          ? await dataManager.getNextChapter(chapter)
          : await dataManager.getPreviousChapter(chapter);
      if (disposed || generation !== loadGeneration || !adjacent) {
        return;
      }
      applyPosition(
        {
          translationId: adjacent.translation.id,
          bookId: adjacent.book.id,
          chapterNumber: adjacent.chapter.number,
        },
        { content: adjacent }
      );
    } catch (err) {
      if (disposed || generation !== loadGeneration) {
        return;
      }
      error.value =
        err instanceof Error ? err.message : "Failed to load chapter.";
    } finally {
      endRequest();
    }
  };

  const navigateAdjacent = async (direction: "next" | "previous") => {
    const hookOutcome = runNavigationHooks(direction);
    const outcome =
      hookOutcome instanceof Promise ? await hookOutcome : hookOutcome;

    if (outcome.type === "handled") {
      emitNavigate({ replace: false });
      return;
    }
    if (outcome.type === "prevent") {
      return;
    }

    if (outcome.type === "navigate") {
      const chapter = outcome.chapter;
      applyPosition(
        {
          translationId: chapter.translation.id,
          bookId: chapter.book.id,
          chapterNumber: chapter.chapter.number,
        },
        { content: chapter }
      );
      return;
    }

    const from = currentPosition();
    if (!from) {
      return;
    }
    const books = dataManager.getCachedTranslationBooks(from.translationId);
    if (!books) {
      await navigateByChapterLink(direction, from);
      return;
    }

    const target =
      direction === "next"
        ? nextPosition(books, from)
        : previousPosition(books, from);
    if (!target) {
      // Either end of the canon, or a book this translation does not have.
      return;
    }

    // Recorded here, not at the top of `navigateAdjacent`, for the same reason
    // as `navigateByChapterLink`: the hooks already ran, so retrying must not
    // ask them again — just re-apply the same target, which is what makes the
    // loader retry its fetch.
    lastLoadAttempt = () => {
      applyPosition(target);
      return whenContentSettled(target);
    };
    applyPosition(target);
    await whenContentSettled(target);
  };

  const loadPreviousChapter = () => navigateAdjacent("previous");

  const selectTranslation = async (translation: string) => {
    lastLoadAttempt = () => selectTranslation(translation);
    beginRequest();
    try {
      const nextTranslationId = await resolveTranslationInput(translation);

      const books = await dataManager.getTranslationBooks(nextTranslationId);
      const firstBook = books.books[0];
      if (!firstBook) {
        throw new Error("No books available for selected translation.");
      }

      availableTranslations.value = toAvailableTranslations(
        dataManager.availableTranslations.value
      );

      // The position is written only once the catalog has resolved, because
      // until then there is no way to know which book this translation starts
      // with — writing the translation alone would send the loader after a
      // chapter that may not exist in it.
      const target: ReadingPosition = {
        translationId: nextTranslationId,
        bookId: firstBook.id,
        chapterNumber: firstBook.firstChapterNumber ?? 1,
      };
      applyPosition(target);
      await whenContentSettled(target);
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to select translation.";
    } finally {
      endRequest();
    }
  };

  const selectBook = async (book: string) => {
    const activeTranslationId = translationId.peek();
    const books = dataManager.getCachedTranslationBooks(activeTranslationId);
    if (!books) {
      return;
    }

    const selectedBook = books.books.find((entry) => entry.id === book);
    if (!selectedBook) {
      return;
    }

    lastLoadAttempt = () => selectBook(book);
    const target: ReadingPosition = {
      translationId: activeTranslationId,
      bookId: book,
      chapterNumber: selectedBook.firstChapterNumber ?? 1,
    };
    applyPosition(target);
    await whenContentSettled(target);
  };

  const selectTranslationAndChapter = async (
    nextTranslationIdOrUrl: string,
    nextBookId: string,
    nextChapterNumber: number,
    options?: SelectTranslationAndChapterOptions
  ) => {
    lastLoadAttempt = () =>
      selectTranslationAndChapter(
        nextTranslationIdOrUrl,
        nextBookId,
        nextChapterNumber,
        options
      );
    beginRequest();
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

      availableTranslations.value = toAvailableTranslations(
        dataManager.availableTranslations.value
      );

      const target: ReadingPosition = {
        translationId: nextTranslationId,
        bookId: selectedBook.id,
        chapterNumber: resolveChapterInBook(selectedBook, nextChapterNumber),
      };
      applyPosition(target, {
        scrollToVerse: options?.scrollToVerse ?? null,
        updateUrl: options?.updateUrl,
      });
      await whenContentSettled(target);
    } catch (err) {
      error.value =
        err instanceof Error
          ? err.message
          : "Failed to select translation and chapter.";
    } finally {
      endRequest();
    }
  };

  const selectChapter = async (book: string, chapter: number) => {
    lastLoadAttempt = () => selectChapter(book, chapter);
    const target: ReadingPosition = {
      translationId: translationId.peek(),
      bookId: book,
      chapterNumber: chapter,
    };
    applyPosition(target);
    await whenContentSettled(target);
  };

  const loadNextChapter = () => navigateAdjacent("next");

  const loadInitialData = async () => {
    lastLoadAttempt = loadInitialData;
    beginRequest();
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
      useFirstAvailableTranslation.value = false;

      const books = await dataManager.getTranslationBooks(nextTranslationId);
      const firstBook = books.books[0];
      if (!firstBook) {
        throw new Error("No books available for selected translation.");
      }

      const requestedBookId = bookId.value;
      const selectedBook = requestedBookId
        ? books.books.find((book) => book.id === requestedBookId)
        : firstBook;

      if (!selectedBook) {
        // The requested book isn't in this translation's book list — either
        // a genuinely unrecognized book/name, or a book simply absent from
        // this specific translation. Don't silently substitute a different
        // book's content at this URL: leave bookId/chapterNumber exactly as
        // requested so the UI can detect "book not found" (BibleReader's
        // `currentBook` lookup naturally comes back null) and offer to load
        // the translation's first book instead.
        //
        // The reactive content-loading effect fires off the raw position
        // signals as soon as they exist, before this catalog-backed check
        // completes — so a bad book id may already have a doomed request in
        // flight (or land later with a fetch error). Bump the generation and
        // abort it so that request's `error.value` write never lands.
        loadGeneration += 1;
        abortOpenContentRequest();
        error.value = null;
        return;
      }

      const target: ReadingPosition = {
        translationId: nextTranslationId,
        bookId: selectedBook.id,
        chapterNumber: resolveChapterInBook(selectedBook, chapterNumber.peek()),
      };

      // Whether the position we settled on differs from the one asked for.
      // Only meaningful when something *was* asked for — with no starting book
      // there is nothing in the URL to correct.
      const requested = currentPosition();
      const wasCorrected = !!requested && !positionsEqual(requested, target);

      // The loader picks this up and fetches the text. Normally no URL write:
      // the app is already at this address, and pushing it again would add a
      // redundant history entry on first paint. But a corrected position does
      // need writing — `?chapter=99999` would otherwise leave the URL
      // advertising a chapter the reader is not on, so Back would take them
      // straight back to the bad address and bounce. `replace`, so the
      // correction itself costs no history entry.
      applyPosition(target, {
        scrollToVerse: options.scrollToVerse ?? null,
        updateUrl: wasCorrected,
        replace: true,
      });
      await whenContentSettled(target);
    } catch (err) {
      console.error("Error loading initial Bible data:", err);
      error.value =
        err instanceof Error ? err.message : "Failed to load Bible data.";
    } finally {
      endRequest();
      // Terminal either way. Without this a failed first load leaves anything
      // suspended on `chapterDataPromise` waiting forever — which on the server
      // means the HTTP request never completes.
      initialChapterLoadSettled.value = true;
    }
  };

  const retryLoad = async () => {
    await (lastLoadAttempt ?? loadInitialData)();
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

  /**
   * Availability surfaced to consumers: the highest-priority enabled
   * extension's override wins, then the book catalog, and only then the loaded
   * chapter's next/previous link.
   *
   * The catalog answers this for wherever the reader currently *is*, rather
   * than for whichever chapter happens to be loaded — so the chevrons stay
   * correct while a chapter is still downloading. The link fallback covers the
   * window before a translation's catalog has arrived, so they don't flash
   * disabled on first paint or mid-translation-switch.
   */
  const resolveAvailability = (
    pick: (
      instance: ReadingExtensionInstance
    ) => ReadonlySignal<boolean> | undefined,
    step: (
      books: TranslationBooks,
      position: ReadingPosition
    ) => ReadingPosition | null,
    chapterLink: (chapter: TranslationBookChapter) => string | null | undefined
  ): boolean => {
    for (const runtime of orderedEnabledRuntimes.value) {
      const override = pick(runtime.instance);
      if (override) {
        return override.value;
      }
    }

    const books = translationBooks.value;
    const currentBookId = bookId.value;
    if (books && currentBookId) {
      return (
        step(books, {
          translationId: translationId.value,
          bookId: currentBookId,
          chapterNumber: chapterNumber.value,
        }) !== null
      );
    }

    const chapter = chapterData.value;
    return !!(chapter && chapterLink(chapter));
  };

  const hasNext = computed<boolean>(() =>
    resolveAvailability(
      (instance) => instance.hasNext,
      nextPosition,
      (chapter) => chapter.nextChapterApiLink
    )
  );

  const hasPrevious = computed<boolean>(() =>
    resolveAvailability(
      (instance) => instance.hasPrevious,
      previousPosition,
      (chapter) => chapter.previousChapterApiLink
    )
  );

  /**
   * The chapter that `loadNextChapter`/`loadPreviousChapter` would move to,
   * resolved without moving there. Enabled extensions get first say (in
   * priority order), so a caller that renders the neighbouring chapter ahead of
   * time — the mobile swipe preview — shows the chapter navigation will actually
   * land on rather than the canonical next one. Falls back to the chapter's own
   * next/previous link when no extension answers.
   */
  const getAdjacentChapter = async (
    direction: "next" | "previous",
    options?: ApiRequestOptions
  ): Promise<TranslationBookChapter | null> => {
    const currentChapter = chapterData.value;
    if (!currentChapter) {
      return null;
    }

    for (const runtime of orderedEnabledRuntimes.value) {
      const hook = runtime.instance.getAdjacentChapter;
      if (!hook) {
        continue;
      }
      const target = await hook({
        readingState: readingStateRef,
        currentChapter,
        direction,
        data: runtime.data,
        options,
      });
      // `undefined` defers to the next extension; `null` means "no neighbour".
      if (target === null) {
        return null;
      }
      if (target) {
        return await dataManager.getTranslationBookChapter(
          target.translationId ?? currentChapter.translation.id,
          target.bookId,
          target.chapter,
          options
        );
      }
    }

    return (
      (direction === "next"
        ? await dataManager.getNextChapter(currentChapter, options)
        : await dataManager.getPreviousChapter(currentChapter, options)) ?? null
    );
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
    initialChapterLoadSettled,
    isChapterContentStale,
    highlights,
    decorations,
    selectedVerses,
    selectionAnnotations,
    pendingAnnotationScrollVerse,
    selectedFootnote,
    loading,
    error,
    retryLoad,
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
    hasNext,
    hasPrevious,
    getAdjacentChapter,
    discoveredCrossReferences,
    discoveredContent,
    discoveredStudyNotes,
    title,
    shortTitle,
    subTitle,
    shortSubTitle,
    isShared: computed(() => isShared.value),
    enabledExtensions,
    isExtensionEnabled,
    enableExtension,
    disableExtension,
    dispose: disposeReadingState,
    getUrlQueryParams,
    onNavigate,
  };

  return readingStateRef;
}
