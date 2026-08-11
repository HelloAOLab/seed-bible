import {
  computed,
  effect,
  signal,
  untracked,
  type Signal,
} from "@preact/signals";
import type { BibleDataManager, BookId } from "./BibleDataManager";
import {
  DEFAULT_UI_LANGUAGE,
  buildReadingPath,
  parseReadingPath,
  stripBasePath,
} from "./ReadingUrlPath";
import type { BibleReadingSession } from "../managers/SessionsManager";
import { createChatsManager, type ChatSession } from "./ChatsManager";
import {
  DEFAULT_BOOK_ID,
  DEFAULT_CHAPTER_NUMBER,
  createBibleReadingState,
  getDefaultTranslationForLanguage,
  resolveChapterInBook,
  uiLocaleForDefaultTranslation,
  type BibleReadingState,
  type InitialBibleReadingOptions,
  type TranslationWithLanguage,
} from "../managers/BibleReadingManager";
import type { HighlightsManager } from "../managers/HighlightsManager";
import type { LoginManager } from "../managers/LoginManager";
import { getProfileConfigValue } from "../managers/ProfileConfigSync";

export function formatVerseSelection(verseNumbers: number[]): string | null {
  const sorted = Array.from(new Set(verseNumbers))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return String(sorted[0]);
  const isConsecutive = sorted.every(
    (n, i) => i === 0 || n === sorted[i - 1]! + 1
  );
  if (isConsecutive) {
    return `${sorted[0]}-${sorted[sorted.length - 1]}`;
  }
  return sorted.join(",");
}

export function parseVerseSelection(verse: string): number[] {
  const parts = verse.split(",");
  const verseNumbers: number[] = [];
  for (const part of parts) {
    const rangeParts = part.split("-");
    if (rangeParts.length === 1) {
      const n = Number(rangeParts[0]);
      if (Number.isFinite(n) && n > 0) {
        verseNumbers.push(n);
      }
    } else if (rangeParts.length === 2) {
      const start = Number(rangeParts[0]);
      const end = Number(rangeParts[1]);
      if (
        Number.isFinite(start) &&
        Number.isFinite(end) &&
        start > 0 &&
        end >= start
      ) {
        for (let i = start; i <= end; i++) {
          verseNumbers.push(i);
        }
      }
    }
  }

  return verseNumbers;
}
import type { NavigationManager } from "./NavigationManager";
import type { I18nManager } from "../i18n";
import type { DiscoverManager } from "./DiscoverManager";
import type { BibleReadingExtensionManager } from "./BibleReadingExtensionManager";
import { difference } from "es-toolkit";
import {
  normalizeStoredTabsState,
  readQueryReadingParams,
  readStoredTabsState,
  reconcileStoredTabs,
  type PersistedTab,
  type QueryReadingParams,
} from "./TabsPersistence";

export interface ReaderTab {
  /** Unique tab identifier (for example: tab-1, tab-2). */
  id: string;
  /** Display title shown in the tabs UI. */
  title: string;
  /** Independent reading state instance owned by this tab. */
  readingState: BibleReadingState;
  /** Attached shared session, if this tab is backed by collaborative state. */
  sharedSession: BibleReadingSession | null;
  /** Attached shared chat for collaborative tabs. */
  sharedChat: ChatSession | null;
  /**
   * When true, this tab only exists to back a tab slot (e.g. a chapter opened
   * in a new panel) and is hidden from the tab strip. It is disposed
   * automatically once no slot references it. Slots are bound to tabs by id,
   * so such a slot still needs a real tab to own its independent reading
   * state.
   */
  slotOnly?: boolean;
}

function getInitialFirstTabBookId(url: URL, basePath: string): string {
  const parsed = parseReadingPath(url.pathname, basePath);
  if (parsed) {
    // An unresolved book flows through as the raw segment (not a fallback
    // default) so the reading state can detect it wasn't found rather than
    // silently loading a default book.
    return parsed.bookId ?? parsed.rawBookSegment;
  }
  return url.searchParams.get("book") ?? DEFAULT_BOOK_ID;
}

// profile.config key the selected translation is persisted under, matching
// the PROFILE_THEME_ID convention in ThemeManager.tsx. Written by
// BibleSelectorManager.tsx when the user explicitly picks a translation from
// the selector; read here to restore it once the profile loads.
export const PROFILE_TRANSLATION_ID = "translationId";

function getInitialTranslationId(
  url: URL,
  basePath: string,
  language: string
): string {
  const parsed = parseReadingPath(url.pathname, basePath);
  return (
    parsed?.translationId ??
    url.searchParams.get("translationId") ??
    url.searchParams.get("translation") ??
    getDefaultTranslationForLanguage(language).id
  );
}

function getInitialFirstTabChapter(url: URL, basePath: string): number {
  const parsed = parseReadingPath(url.pathname, basePath);
  if (parsed) {
    return parsed.chapter;
  }

  const value = Math.floor(Number(url.searchParams.get("chapter")));
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_CHAPTER_NUMBER;
}

/**
 * Resolves the UI language that a reading position URL implies: an explicit
 * path segment, the legacy `?lang=` query param, or (if neither is present)
 * null so the caller can decide whether to leave the current language
 * untouched.
 */
function getUrlReadingLanguage(url: URL, basePath: string): string | null {
  const parsed = parseReadingPath(url.pathname, basePath);
  if (parsed) {
    return parsed.language ?? DEFAULT_UI_LANGUAGE;
  }
  return url.searchParams.get("lang");
}

/**
 * Corrects the address bar when the current URL resolves to a real reading
 * position but doesn't spell it canonically — the client-side counterpart of
 * `legacyReadingUrlRedirect` in `entry-ssr.tsx`, for navigation that never
 * made a fresh server request and so never had a chance to be redirected.
 *
 * Same test as the server: rebuild the path from what the URL resolved to and
 * rewrite only if it differs. That covers a typo ("senesis"), an alias
 * ("gen"), other casings ("Genesis"), the junk `getBookId`'s prefix fallback
 * accepts ("luke-skywalker" → Luke), and — since the canonical form always
 * includes the language segment — a 3-segment URL missing it entirely. A
 * no-op for a URL that is already canonical, a book that resolves to nothing
 * (the reader shows its own not-found state), or a legacy/non-reading-path
 * URL.
 */
function selfHealNonCanonicalPath(navigation: NavigationManager): void {
  const url = navigation.currentUrl.peek();
  const parsed = parseReadingPath(url.pathname, navigation.basePath);
  if (!parsed || !parsed.bookId) {
    return;
  }

  const language =
    parsed.language !== null
      ? parsed.language.toLowerCase()
      : (uiLocaleForDefaultTranslation(parsed.translationId) ??
        DEFAULT_UI_LANGUAGE);

  const correctedPath = buildReadingPath({
    language,
    translationId: parsed.translationId,
    bookId: parsed.bookId,
    chapter: parsed.chapter,
  });
  if (stripBasePath(url.pathname, navigation.basePath) === correctedPath) {
    return;
  }
  navigation.updatePathAndQueryParams(correctedPath, {}, true);
}

function getInitialHighlightedVerses(url: URL): number[] {
  const value = url.searchParams.get("verse");
  return typeof value === "string"
    ? parseVerseSelection(value)
    : typeof value === "number"
      ? [value]
      : [];
}

/**
 * Reading parameters the visitor's own URL asked for, used to reconcile a
 * deep link against the restored tabs. A canonical reading path (e.g.
 * "/en/AAB/john/3") is the modern form; the legacy `?translation=&book=&chapter=`
 * query params are still honored for links made before the path scheme.
 */
function readInitialReadingParams(
  url: URL,
  basePath: string
): QueryReadingParams {
  const parsed = parseReadingPath(url.pathname, basePath);
  if (!parsed) {
    return readQueryReadingParams(url);
  }
  return {
    translationId: parsed.translationId,
    // An unresolved book flows through as the raw segment, matching
    // `getInitialFirstTabBookId`, so the reading state can surface a
    // not-found instead of silently landing on a default book.
    bookId: parsed.bookId ?? parsed.rawBookSegment,
    chapter: parsed.chapter,
    specified: true,
  };
}

export interface InitialTabsOptions {
  translationId: string;
  bookId: string;
  chapter: number;
  highlightedVerses?: number[];
}

export function createInitialTabs(
  dataManager: BibleDataManager,
  highlightsManager: HighlightsManager,
  i18nManager: I18nManager,
  options: InitialTabsOptions,
  discoverManager?: DiscoverManager,
  readingExtensionManager?: BibleReadingExtensionManager
): ReaderTab[] {
  const { translationId, bookId, chapter, highlightedVerses = [] } = options;

  const tab: ReaderTab = {
    id: "tab-1",
    title: "Tab 1",
    readingState: createBibleReadingState(
      dataManager,
      highlightsManager,
      i18nManager,
      {
        initialTranslationId: translationId,
        initialBookId: bookId,
        initialChapterNumber: chapter,
        scrollToVerse: highlightedVerses[0] ?? undefined,
      },
      discoverManager,
      readingExtensionManager
    ),
    sharedSession: null,
    sharedChat: null,
  };

  if (highlightedVerses.length > 0) {
    tab.readingState.decorateVerses(bookId, chapter, highlightedVerses, {
      className: "sb-verse-decoration-diminish",
      containerClassName: "sb-chapter-decoration-diminish",
      removeAfterMs: 5000,
    });
  }

  return [tab];
}

type NewTabSource = BibleReadingState | BibleReadingSession;

function isBibleReadingSession(
  value: NewTabSource | undefined
): value is BibleReadingSession {
  return !!value && "document" in value && "readingState" in value;
}

function createSharedChatOrNull(
  chatsManager: ReturnType<typeof createChatsManager>,
  session: BibleReadingSession | null
): ChatSession | null {
  if (!session || typeof session.document?.getArray !== "function") {
    return null;
  }

  try {
    return chatsManager.createSharedSession(session);
  } catch {
    return null;
  }
}

/**
 * API surface for creating, selecting, and removing reader tabs.
 *
 * Each tab owns a `BibleReadingState` instance. Tabs can also be backed by a
 * shared reading session, in which case `sharedSession` is set and disposed
 * automatically when the tab is removed.
 */
export interface TabsManager {
  defaultTranslation: TranslationWithLanguage;

  /** Ordered tab list used by the tabs UI. */
  tabs: Signal<ReaderTab[]>;

  /** ID of the currently selected tab. */
  selectedTabId: Signal<string>;

  /**
   * Adds a new tab and selects it.
   *
   * @param source Optional source used to initialize the tab:
   * - `BibleReadingState`: uses an existing reading state instance.
   * - `BibleReadingSession`: uses the session reading state and stores session metadata.
   * - `undefined`: creates a brand new reading state.
   * @param initialReadingOptions Initial translation/book/chapter for the new
   * reading state. Only used when `source` is undefined; ignored when the tab
   * adopts an existing state. Passing this avoids a race where the new tab's
   * `loadInitialData()` defaults to GEN 1 while the caller's follow-up
   * `selectTranslationAndChapter()` is still in flight.
   * @param tabOptions Extra tab metadata. `slotOnly` marks the tab as hidden
   * from the tab strip; it only backs a tab slot and is disposed when
   * unreferenced.
   * @returns The newly created tab.
   */
  addTab: (
    source?: NewTabSource,
    initialReadingOptions?: InitialBibleReadingOptions,
    tabOptions?: { slotOnly?: boolean }
  ) => ReaderTab;

  /**
   * Removes a tab by ID.
   *
   * If the tab is associated with a shared session, the session is disposed.
   * If the removed tab was selected, selection falls back to the first tab.
   */
  removeTab: (tabId: string) => void;

  /** Selects a tab by ID. */
  selectTab: (tabId: string) => void;
}

/**
 * Creates the tabs manager and wires configBot synchronization for reading tags.
 *
 * Behavior:
 * - Initializes with a single tab seeded from config tags.
 * - Keeps `configBot` reading tags (`translation`, `book`, `chapter`) in sync
 *   with the selected tab's reading state.
 * - Listens for external `configBot` tag changes and updates selected tab
 *   reading state accordingly.
 */
export function createTabs(
  navigation: NavigationManager,
  dataManager: BibleDataManager,
  highlightsManager: HighlightsManager,
  chatsManager: ReturnType<typeof createChatsManager>,
  i18nManager: I18nManager,
  login: LoginManager,
  discoverManager?: DiscoverManager,
  readingExtensionManager?: BibleReadingExtensionManager
): TabsManager {
  const defaultTranslation = getDefaultTranslationForLanguage(
    i18nManager.defaultLanguage
  );
  // Read from the frozen arrival snapshot rather than the live URL: by the time
  // the profile loads, `commitSelectedTabToUrl` has already rewritten the
  // address bar into the canonical path form, which always includes a
  // translationId path segment (even for the app's own default), so re-parsing
  // the *current* URL later can no longer tell "the visitor's own link named a
  // translation" apart from "the app defaulted it." Used by the profile-restore
  // effect to avoid overriding an explicit deep link.
  const hadExplicitInitialUrlTranslation =
    parseReadingPath(navigation.initialUrl.pathname, navigation.basePath) !==
      null ||
    navigation.initialUrl.searchParams.has("translationId") ||
    navigation.initialUrl.searchParams.has("translation");
  selfHealNonCanonicalPath(navigation);

  // Every startup read below comes from `initialUrl` — the frozen snapshot of the
  // URL the page was opened with — rather than the live `currentUrl`. They are
  // the same href at this point, but only the snapshot is guaranteed to stay
  // that way: `currentUrl` is a signal that the reader's own position-to-URL echo
  // (and anything else constructed between the navigation manager and here) can
  // move. Reading one source for all of them also keeps this consistent with the
  // reconcile below, which needs the snapshot to tell "the user linked here" from
  // "the reader wrote its position into the URL".
  const highlightedVerses = getInitialHighlightedVerses(navigation.initialUrl);

  // Builds a reader tab from a persisted descriptor, seeding its reading state
  // so it loads the stored chapter directly (no Genesis 1 flash). The selected
  // tab also picks up any `?verse=` scroll/highlight, matching createInitialTabs.
  const buildRestoredTab = (
    descriptor: PersistedTab,
    index: number,
    selectedId: string
  ): ReaderTab => {
    const isSelected = descriptor.id === selectedId;
    const readingState = createBibleReadingState(
      dataManager,
      highlightsManager,
      i18nManager,
      {
        initialTranslationId: descriptor.translationId,
        initialBookId: descriptor.bookId,
        initialChapterNumber: descriptor.chapterNumber,
        scrollToVerse:
          isSelected && highlightedVerses.length > 0
            ? highlightedVerses[0]
            : undefined,
      },
      discoverManager,
      readingExtensionManager
    );

    if (isSelected && highlightedVerses.length > 0 && descriptor.bookId) {
      readingState.decorateVerses(
        descriptor.bookId,
        descriptor.chapterNumber,
        highlightedVerses,
        {
          className: "sb-verse-decoration-diminish",
          containerClassName: "sb-chapter-decoration-diminish",
          removeAfterMs: 5000,
        }
      );
    }

    return {
      id: descriptor.id,
      title: `Tab ${index + 1}`,
      readingState,
      sharedSession: null,
      sharedChat: null,
      slotOnly: descriptor.slotOnly ?? false,
    };
  };

  const storedState = normalizeStoredTabsState(readStoredTabsState());

  let initialTabs: ReaderTab[];
  let initialSelectedTabId: string;

  if (!storedState || storedState.tabs.length === 0) {
    // No stored state (SSR or first-ever visit): seed a single tab from the URL
    // reading params, or the defaults — the original behavior.
    const initialTranslationId = getInitialTranslationId(
      navigation.initialUrl,
      navigation.basePath,
      i18nManager.defaultLanguage
    );
    const initialBookId = getInitialFirstTabBookId(
      navigation.initialUrl,
      navigation.basePath
    );
    const initialChapter = getInitialFirstTabChapter(
      navigation.initialUrl,
      navigation.basePath
    );

    initialTabs = createInitialTabs(
      dataManager,
      highlightsManager,
      i18nManager,
      {
        translationId: initialTranslationId,
        bookId: initialBookId,
        chapter: initialChapter,
        highlightedVerses,
      },
      discoverManager,
      readingExtensionManager
    );
    initialSelectedTabId = initialTabs[0]?.id ?? "";
  } else {
    // Restore the stored tabs, reconciled against the URL reading params — from
    // the same frozen snapshot as the reads above, so we compare against what the
    // user actually linked with, not a position the reader may have written back.
    const query = readInitialReadingParams(
      navigation.initialUrl,
      navigation.basePath
    );
    const { tabs: descriptors, selectedTabId } = reconcileStoredTabs(
      storedState,
      query,
      defaultTranslation.id
    );

    initialTabs = descriptors.map((descriptor, index) =>
      buildRestoredTab(descriptor, index, selectedTabId)
    );
    initialSelectedTabId = selectedTabId;
  }

  const tabs = signal<ReaderTab[]>(initialTabs);
  const selectedTabId = signal<string>(initialSelectedTabId);
  const selectedTab = computed(
    () => tabs.value.find((tab) => tab.id === selectedTabId.value) ?? null
  );

  const syncSelectedTabFromUrl = async () => {
    const selectedTab =
      tabs.value.find((tab) => tab.id === selectedTabId.value) ?? null;

    if (!selectedTab) {
      return;
    }

    selfHealNonCanonicalPath(navigation);

    const requestedTranslation = getInitialTranslationId(
      navigation.currentUrl.value,
      navigation.basePath,
      i18nManager.defaultLanguage
    );
    const requestedBookId = getInitialFirstTabBookId(
      navigation.currentUrl.value,
      navigation.basePath
    );
    const requestedChapter = getInitialFirstTabChapter(
      navigation.currentUrl.value,
      navigation.basePath
    );
    const requestedLanguage = getUrlReadingLanguage(
      navigation.currentUrl.value,
      navigation.basePath
    );
    if (
      requestedLanguage &&
      requestedLanguage !== i18nManager.language.peek()
    ) {
      // Mirrors the old `syncSignalsToUrl` setter this replaces: route
      // through `changeLanguage` (not `requestLanguageChange`) so the
      // translations reload, but nothing is persisted and
      // `applyBibleTranslationForUiLanguage` is not invoked — the
      // translation is already explicit in the URL, so there's nothing to
      // infer from the language change alone.
      void i18nManager.changeLanguage(requestedLanguage);
    }
    const readingState = selectedTab.readingState;

    const books = readingState.translationBooks.value?.books ?? [];
    const selectedBook =
      books.find((book) => book.id === requestedBookId) ?? null;
    if (!selectedBook) {
      return;
    }

    const firstChapterNumber =
      selectedBook.firstChapterNumber ?? DEFAULT_CHAPTER_NUMBER;
    const maxChapterNumber =
      firstChapterNumber + selectedBook.numberOfChapters - 1;
    const nextChapter =
      requestedChapter >= firstChapterNumber &&
      requestedChapter <= maxChapterNumber
        ? requestedChapter
        : firstChapterNumber;

    if (
      readingState.translationId.value === requestedTranslation &&
      readingState.bookId.value === requestedBookId &&
      readingState.chapterNumber.value === nextChapter
    ) {
      return;
    }

    console.log("Syncing selected tab reading state to match URL parameters:", {
      requestedTranslation,
      requestedBookId,
      requestedChapter,
    });
    // This navigation originates from the URL, so pass `updateUrl: false` to
    // keep the reading state from pushing the URL we just read back onto the
    // history stack.
    await readingState.selectTranslationAndChapter(
      requestedTranslation,
      requestedBookId,
      nextChapter,
      { updateUrl: false }
    );
  };

  let oldQueryParams: Record<string, string | null> = {};

  // The href of the last URL we wrote ourselves. Writing the URL re-runs the
  // URL->state reader effect below (asynchronously), but the state already
  // matches what we wrote, so the reader skips that href once and clears this.
  // External URL changes (back/forward, deep links) never match, so they still
  // drive the reader.
  let lastSelfWrittenHref: string | null = null;

  const writeUrl = (
    update: Record<string, string | null>,
    replace?: boolean,
    pathname?: string
  ) => {
    if (pathname !== undefined) {
      navigation.updatePathAndQueryParams(pathname, update, replace);
    } else {
      navigation.updateQueryParams(update, replace);
    }
    lastSelfWrittenHref = navigation.currentUrl.peek().href;
  };

  /**
   * Prescriptively writes the selected tab's reading position to the URL, as a
   * single history operation. Called deliberately from navigation events (push)
   * and on tab switch / mount (replace) — never reactively off the underlying
   * position signals, so one navigation produces exactly one history entry.
   */
  const commitSelectedTabToUrl = (options: { replace?: boolean } = {}) => {
    // Read all signals untracked: `getUrlQueryParams` touches bookId/chapter/
    // translation/extension signals, and this runs inside a signals effect. If
    // those reads were tracked, the effect would re-run on every position
    // change and re-commit, defeating the prescriptive (one-write-per-nav)
    // design.
    untracked(() => {
      const tab = selectedTab.peek();
      const nextQueryParams: Record<string, string | null> =
        tab?.readingState.getUrlQueryParams(navigation.currentUrl.peek()) ?? {};

      // Keep a shared session's id in the URL so a refresh rejoins it (see
      // `setupInitialSession` in SeedBibleStateManager, which reads this
      // param back on startup) instead of silently dropping the user.
      if (tab?.sharedSession) {
        nextQueryParams.sessionId = tab.sharedSession.id;
      }

      const oldKeys = Object.keys(oldQueryParams);
      const newKeys = Object.keys(nextQueryParams);

      oldQueryParams = nextQueryParams;
      const queryUpdate: Record<string, string | null> = {
        ...nextQueryParams,
      };
      const removedKeys = difference(oldKeys, newKeys);
      for (const key of removedKeys) {
        queryUpdate[key] = null;
      }

      // Book/chapter/translation/language all move into the path (e.g.
      // "/es/spa_onbv/john/3") rather than staying as query params. Setting
      // them to null (rather than just omitting the keys) also strips any
      // stale values left over from a legacy query-param URL that hasn't
      // been redirected yet. Translation is read directly off the reading
      // state below (not `queryUpdate.translation`/`.translationId`)
      // because `getUrlQueryParams` deliberately omits it when it equals
      // the default — wrong for the path, where translation is always
      // present (see the URL scheme's four examples).
      const bookId = queryUpdate.book;
      const chapter = queryUpdate.chapter;
      queryUpdate.book = null;
      queryUpdate.chapter = null;
      queryUpdate.translation = null;
      queryUpdate.translationId = null;

      const rawTranslationId = tab?.readingState.translationId.value;
      const translationId = rawTranslationId
        ? dataManager.buildTranslationId(rawTranslationId)
        : null;

      if (bookId && chapter && translationId) {
        const pathname = buildReadingPath({
          language: i18nManager.language.peek(),
          translationId,
          bookId: bookId as BookId,
          chapter: Number(chapter),
        });
        writeUrl(queryUpdate, options.replace, pathname);
      } else {
        writeUrl(queryUpdate, options.replace);
      }
    });
  };

  // Subscribe to navigation events for whichever tab is currently selected.
  // Re-runs on tab switch (subscribing to `selectedTab` only, never the raw
  // position signals): tears down the previous tab's subscription, and commits
  // a `replace` so the URL reflects the newly-focused tab without adding a
  // history entry. Real navigations within the tab arrive via `onNavigate` and
  // push a single entry each.
  effect(() => {
    const readingState = selectedTab.value?.readingState;
    if (!readingState) {
      return undefined;
    }

    const dispose = readingState.onNavigate((options) =>
      commitSelectedTabToUrl(options)
    );
    commitSelectedTabToUrl({ replace: true });
    return dispose;
  });

  // A UI-language change doesn't always fire `onNavigate` above (e.g. the
  // nearest-translation lookup can resolve to the translation already
  // selected), which would otherwise leave the URL's language segment
  // stale. Re-commit on every language change regardless; it's a no-op if
  // nothing in the path/query actually changed.
  effect(() => {
    void i18nManager.language.value;
    commitSelectedTabToUrl({ replace: true });
  });

  // Resolves once `readingState` is no longer in the middle of an operation
  // (its own initial load, or any other in-flight navigation). Resolves
  // immediately if it's already idle.
  const waitForIdle = (readingState: BibleReadingState): Promise<void> =>
    new Promise((resolve) => {
      if (!readingState.loading.peek()) {
        resolve();
        return;
      }
      const dispose = effect(() => {
        if (!readingState.loading.value) {
          dispose();
          resolve();
        }
      });
    });

  // Restores the profile's saved translation on the given reading state.
  // `selectTranslationAndChapter` clamps an out-of-range chapter but throws
  // if the current book isn't in the target translation at all (a partial/
  // NT-only translation, for example) — so resolve the saved translation's
  // own book catalog first and fall back to its first book, mirroring the
  // same guard `syncSelectedTabFromUrl` above already applies for the URL
  // path.
  const applySavedTranslation = async (
    readingState: BibleReadingState,
    savedTranslationId: string
  ) => {
    // Snapshot what this reading state was on before any of our awaits below,
    // so a real navigation that happens while we're waiting — the user
    // explicitly picking a different translation, most notably — can be told
    // apart from our own restore having not landed yet.
    const translationIdAtStart = readingState.translationId.peek();

    // A freshly-created tab's `loadInitialData()` is likely still in flight
    // (it's kicked off synchronously at tab construction, well before the
    // profile has had a chance to load over the network) and unconditionally
    // writes its own translation/book/chapter at the end, with no awareness
    // of anything that happened after it started. Racing it here would let
    // that stale write land *after* ours and silently revert the restore —
    // this was reproducible on a bare cold load (no URL params) where the tab
    // starts on the default translation and nothing short-circuits either
    // load. Waiting for the tab to go idle first guarantees our restore is
    // the last write, not a call that gets clobbered by an earlier one still
    // finishing up.
    await waitForIdle(readingState);

    const books = await dataManager
      .getTranslationBooks(savedTranslationId)
      .then((result) => result.books)
      .catch((err) => {
        console.warn(
          "Failed to load books for saved profile translation:",
          savedTranslationId,
          err
        );
        return null;
      });
    if (!books) {
      return;
    }

    // Bail if a real navigation moved this reading state on while we were
    // waiting — most notably the user explicitly picking a different
    // translation via the selector, which should always win over a stale
    // restore. Also bail if the tab itself was closed in the meantime: the
    // reading state is disposed and nothing will ever render it again, so
    // finishing the restore would just be a wasted network round trip and a
    // set of writes nobody observes.
    const stillAttached = tabs
      .peek()
      .some((tab) => tab.readingState === readingState);
    if (
      !stillAttached ||
      readingState.translationId.peek() !== translationIdAtStart
    ) {
      return;
    }

    const currentBookId = readingState.bookId.peek() ?? DEFAULT_BOOK_ID;
    const matchingBook = books.find((book) => book.id === currentBookId);
    const targetBook = matchingBook ?? books[0];
    if (!targetBook) {
      return;
    }

    const nextChapter = resolveChapterInBook(
      targetBook,
      readingState.chapterNumber.peek()
    );

    await readingState.selectTranslationAndChapter(
      savedTranslationId,
      targetBook.id,
      nextChapter,
      { updateUrl: false }
    );

    // Commit the restored translation into the URL right away (a `replace`,
    // not a `push` — this isn't a navigation the user asked for) instead of
    // waiting for the next real navigation to write it via
    // `getUrlQueryParams`. Without this, the URL still has no translation
    // param immediately after restoring, so any unrelated query-param write
    // that happens before the user's first navigation — e.g. an extension
    // opening its own pane on load, which is a real, observed case — looks
    // like an external navigation to the effect below. That effect
    // recomputes the desired translation from the URL, finds none, and
    // reverts this restore straight back to the default.
    if (selectedTab.peek()?.readingState === readingState) {
      commitSelectedTabToUrl({ replace: true });
    }
  };

  // Apply the profile's saved translation to the selected tab, but ONLY when
  // the profile itself changes (login/profile load) — never on URL changes —
  // so it doesn't fight an explicit path-based or `?translation=`/
  // `?translationId=` deep link, or an in-session pick. Mirrors
  // SettingsManager's `lang` profile-sync effect.
  effect(() => {
    const savedTranslationId = getProfileConfigValue(
      login.profile.value,
      PROFILE_TRANSLATION_ID
    );
    if (typeof savedTranslationId !== "string" || !savedTranslationId) {
      return;
    }

    untracked(() => {
      // Checked against the boot-time URL snapshot, not the current one: by
      // the time the profile loads, `commitSelectedTabToUrl` has already
      // rewritten the address bar into the canonical path form, which always
      // includes a translationId segment — even for the app's own default —
      // so re-parsing it here could never distinguish an explicit deep link
      // from a defaulted one.
      if (hadExplicitInitialUrlTranslation) {
        return;
      }

      const readingState = selectedTab.peek()?.readingState;
      if (
        !readingState ||
        readingState.translationId.peek() === savedTranslationId
      ) {
        return;
      }

      void applySavedTranslation(readingState, savedTranslationId);
    });
  });

  // Mirrors the selected tab's *verse selection* into `?verse` so it can be
  // shared/restored. This is selection state, not a navigation — consumers that
  // watch the URL for "the reader moved" must ignore this param (see the
  // fullscreen-pane effect in SeedBibleStateManager).
  effect(() => {
    const params: Record<string, string | null> = {
      verse: null,
    };

    const readingState = selectedTab.value?.readingState;
    if (readingState) {
      const formatted = formatVerseSelection(
        readingState.selectedVerses.value.map((v) => v.verse.number)
      );
      params.verse = formatted;
    }

    writeUrl(params, true);
  });

  effect(() => {
    const href = navigation.currentUrl.value.href;
    // Skip the URL change we caused ourselves — the reading state already
    // matches it — and clear the marker so a later, genuine navigation back to
    // the same href is not also skipped. Only external changes (back/forward,
    // deep links) drive the reader.
    if (href === lastSelfWrittenHref) {
      lastSelfWrittenHref = null;
      return;
    }
    syncSelectedTabFromUrl();
  });

  const addTab = (
    source?: NewTabSource,
    initialReadingOptions?: InitialBibleReadingOptions,
    tabOptions?: { slotOnly?: boolean }
  ) => {
    const currentTabs = tabs.value;
    const nextNumber = currentTabs.length + 1;
    const sharedSession = isBibleReadingSession(source) ? source : null;
    const sharedChat = createSharedChatOrNull(chatsManager, sharedSession);
    const readingState = !isBibleReadingSession(source) ? source : null;
    const nextTab: ReaderTab = {
      id: `tab-${nextNumber}`,
      title: `Tab ${nextNumber}`,
      readingState:
        sharedSession?.readingState ??
        readingState ??
        createBibleReadingState(
          dataManager,
          highlightsManager,
          i18nManager,
          initialReadingOptions,
          discoverManager,
          readingExtensionManager
        ),
      sharedSession,
      sharedChat,
      slotOnly: tabOptions?.slotOnly ?? false,
    };
    tabs.value = [...currentTabs, nextTab];
    selectedTabId.value = nextTab.id;
    return nextTab;
  };

  const removeTab = (tabId: string) => {
    const tab = tabs.value.find((t) => t.id === tabId);

    const currentTabIndex = tabs.value.findIndex((t) => t.id === tabId);

    if (tab?.sharedSession) {
      tab.sharedSession.dispose();
    }
    // Release the tab's reading state (disables its extensions, clears timers
    // and internal effects). Safe to call even for session-backed tabs.
    tab?.readingState.dispose();

    const nextTabs = tabs.value.filter((tab) => tab.id !== tabId);

    tabs.value = nextTabs;

    if (selectedTabId.value === tabId) {
      selectedTabId.value =
        nextTabs[currentTabIndex - 1]?.id ?? nextTabs[0]?.id ?? "";
    }
  };

  const selectTab = (tabId: string) => {
    selectedTabId.value = tabId;
  };

  return {
    defaultTranslation,
    tabs,
    selectedTabId,
    addTab,
    removeTab,
    selectTab,
  };
}
