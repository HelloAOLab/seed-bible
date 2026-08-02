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
import { type ReadonlySignal, type Signal } from "@preact/signals";
import type { JSX } from "preact";
import type {
  ChapterHighlight,
  ChapterHighlights,
  HighlightsManager,
} from "../managers/HighlightsManager";
import type { I18nManager } from "../i18n";
import type {
  DiscoverContentResult,
  DiscoverCrossReferenceResult,
  DiscoverManager,
  DiscoverReference,
  DiscoverStudyNoteResult,
} from "../managers/DiscoverManager";
import type {
  BibleReadingExtensionManager,
  ReadingExtensionRuntime,
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
  /** Optional CSS class to apply to the entire chapter container. */
  containerClassName?: string;
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
  /** Optional CSS class to apply to the entire chapter container. */
  containerClassName?: string;
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
export declare const DEFAULT_TRANSLATIONS_BY_LANGUAGE: Map<
  string,
  TranslationWithLanguage
>;
/**
 * UI locale → ISO 639-3 codes used by the Bible API `translation.language`.
 * Includes aliases so we can match the nearest available text even when the
 * preferred hardcoded ID is missing from the loaded catalog.
 */
export declare const UI_TO_BIBLE_LANGUAGE_CODES: Record<string, string[]>;
/**
 * Picks the nearest Bible translation for a UI language:
 * 1. Hardcoded preferred default for that UI language (always — so Hindi still
 *    resolves to hin_cvb even if the catalog hasn't finished loading)
 * 2. If a catalog is available, prefer that preferred ID when present, otherwise
 *    any translation in a matching Bible-API language code (e.g. German → deu)
 * 3. Walk `LANG_META.fallback` the same way (e.g. Gujarati → Hindi)
 * 4. English (`AAB`) as last resort
 */
export declare function getDefaultTranslationForLanguage(
  language: string,
  visited?: Set<string>,
  availableTranslations?: readonly Translation[] | null
): TranslationWithLanguage;
export type NearestBibleTranslation = {
  translation: TranslationWithLanguage;
  /** UI language whose default we resolved to (same as requested when direct). */
  resolvedUiLanguage: string;
  /** True when we had to use LANG_META.fallback (or English) instead of a direct match. */
  usedFallback: boolean;
};
/** Resolves nearest Bible text and whether a warning modal should be shown. */
export declare function getNearestBibleTranslationForUiLanguage(
  language: string,
  availableTranslations?: readonly Translation[] | null
): NearestBibleTranslation;
export declare const DEFAULT_BOOK_ID = "GEN";
export declare const DEFAULT_CHAPTER_NUMBER = 1;
/**
 * How close together two position changes have to be to count as one gesture
 * for the purposes of the Back button.
 *
 * Long enough to absorb a rapid skim — presses, held arrow keys, repeated
 * swipes — so ten chapters cost one Back press rather than ten. Short enough
 * that reading a chapter and then deliberately moving on gives you a history
 * entry you can go back to.
 */
export declare const NAVIGATION_COALESCE_MS = 400;
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
export declare function positionKey(position: ReadingPosition): string;
export declare function positionsEqual(
  a: ReadingPosition | null,
  b: ReadingPosition | null
): boolean;
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
export declare function resolveChapterInBook(
  book: TranslationBook,
  chapterNumber: number
): number;
/**
 * The chapter after `position`, or null when there is none (the last chapter of
 * the last book). Crossing a book boundary lands on the next book's first
 * chapter. Returns null when the book is not in this translation's catalog.
 */
export declare function nextPosition(
  books: TranslationBooks,
  position: ReadingPosition
): ReadingPosition | null;
/**
 * The chapter before `position`, or null when there is none (the first chapter
 * of the first book). Crossing a book boundary lands on the previous book's
 * last chapter.
 */
export declare function previousPosition(
  books: TranslationBooks,
  position: ReadingPosition
): ReadingPosition | null;
export declare function createBibleReadingState(
  dataManager: BibleDataManager,
  highlightsManager: HighlightsManager,
  i18nManager: I18nManager,
  options?: InitialBibleReadingOptions,
  discoverManager?: DiscoverManager,
  readingExtensionManager?: BibleReadingExtensionManager
): BibleReadingState;
export {};
