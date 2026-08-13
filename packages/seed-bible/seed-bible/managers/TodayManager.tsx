import {
  computed,
  effect,
  signal,
  type ReadonlySignal,
  type Signal,
} from "@preact/signals";
import type { CasualOSManager } from "./OsManager";
import type { LoginManager } from "./LoginManager";
import type { NavigationManager } from "./NavigationManager";
import type { SearchManager } from "./SearchManager";
import type { BibleDataManager } from "./BibleDataManager";
import type { ReaderTab } from "./TabsManager";
import {
  getReadingHistoryEvents,
  type ReadingEvent,
} from "./ReadingHistoryManager";
import { getDefaultTranslationForLanguage } from "./BibleReadingManager";
import { hasReadingUrlPosition } from "./ReadingUrlPath";
import type { TranslationBooks } from "./FreeUseBibleAPI";
import { createReadingHistoryState } from "../components/TodayPane/createReadingHistoryState";
import { TodayReadingHistoryService } from "../components/TodayPane/TodayReadingHistoryService";
import { SubscribedUsersProvider } from "../components/TodayPane/SubscribedUsersProvider";
import { ReadingHistoryConfigProvider } from "../components/TodayPane/readingHistoryConfigProvider";
import type {
  FilteredReading,
  ReadingHistoryState,
} from "../components/TodayPane/readingHistory";
import type { VerseSearchResult } from "../components/TodayPane/search";

/**
 * Id of the Today pane. Exported because `readerVisible` and the toolbar both
 * need to recognise it, and a stray copy of the literal is how the two open
 * paths drifted apart while Today was an extension.
 */
export const TODAY_PANE_ID = "today-screen-pane";

/** Books the reader currently has loaded, in the shape Today's cards want. */
type TranslationBookSummary = {
  id: string;
  name: string;
  commonName?: string;
  numberOfChapters: number;
};

/**
 * Whether Today should auto-open over the reader for this boot URL: an explicit
 * `?today=` param always wins, and otherwise it opens unless the URL already
 * points somewhere specific — a canonical reading path or a shared-session
 * invite.
 *
 * Must be given `initialUrl` (the URL as first loaded), never the live
 * `currentUrl`: `TabsManager` echoes the reader's book/chapter back into the URL
 * as soon as it initializes, so a cold load with no reading position would
 * otherwise look indistinguishable from a real deep link.
 *
 * Exported so `readerVisible` can ask the same question without keeping its own
 * copy of the predicate, which is what went stale in #1547.
 */
export function todayWillAutoOpenForUrl(
  initialUrl: URL,
  basePath: string
): boolean {
  const requested = initialUrl.searchParams.get("today");
  if (requested !== null) {
    return requested === "open";
  }
  return !(
    hasReadingUrlPosition(initialUrl, basePath) ||
    initialUrl.searchParams.has("sessionId")
  );
}

export interface TodayManager {
  /** Whether the Today screen is showing. Bound to the `?today=open` param. */
  isOpen: ReadonlySignal<boolean>;
  /**
   * Three-state gate: `loading` renders placeholders, `empty` renders Welcome,
   * `ready` renders the resume card.
   */
  readingHistory: ReadonlySignal<ReadingHistoryState>;
  /** Reading activity for one window, bucketed book -> chapter -> userId[]. */
  getCommunityReading: (timespan: {
    from: number;
    to: number;
  }) => Promise<FilteredReading>;
  /** Book id -> display name for the translation the reader has loaded. */
  bookNames: ReadonlySignal<Map<string, string>>;
  /**
   * Last non-null translation books/id. Latched because Today reads them while
   * the reader is between chapters, where the live values blink to null.
   */
  lastTranslationBooks: ReadonlySignal<{
    books: TranslationBookSummary[];
  } | null>;
  lastTranslationId: ReadonlySignal<string | undefined>;
  translationBooksMap: ReadonlySignal<Map<string, TranslationBookSummary>>;
  /** Full-text verse search over the active translation/language. */
  searchVerses: (query: string) => Promise<VerseSearchResult[]>;
  /** Plain text of a single verse, or undefined when not found. */
  getVerseText: (
    translationId: string,
    bookId: string,
    chapter: number,
    verse: number
  ) => Promise<string | undefined>;
  getDefaultTranslation: () => string | undefined;
  getReadingHistoryEvents: (
    recordName: string,
    startTime: number,
    endTime: number
  ) => Promise<Iterable<ReadingEvent>>;
  getTranslationBooks: (translation: string) => Promise<TranslationBooks>;
  readingHistoryConfigProvider: ReadingHistoryConfigProvider;
  subscribedUsers: SubscribedUsersProvider;
  open: () => void;
  close: () => void;
  /** Tears down the internal effects. The app never calls this; tests do. */
  dispose: () => void;
}

export function createTodayManager(options: {
  os: CasualOSManager;
  login: LoginManager;
  navigation: NavigationManager;
  search: SearchManager;
  bibleData: BibleDataManager;
  /** UI language used to pick a default translation when nothing is loaded. */
  defaultLanguage: string;
  /**
   * The reader's current position. Read for its reactivity (to revalidate the
   * resume card) and for the active translation/language.
   */
  currentReadingState: ReadonlySignal<{
    tab: ReaderTab;
    translationId: string | null;
  } | null>;
}): TodayManager {
  const { os, login, navigation, search, bibleData, currentReadingState } =
    options;

  const subscribedUsers = new SubscribedUsersProvider();
  const readingHistoryConfigProvider = new ReadingHistoryConfigProvider();

  const fetchReadingHistoryEvents = (
    recordName: string,
    startTime: number,
    endTime: number
  ) => getReadingHistoryEvents(os, recordName, startTime, endTime);

  const readingHistoryService = new TodayReadingHistoryService({
    readingEventsProviderPort: {
      getReadingHistoryEvents: fetchReadingHistoryEvents,
    },
    usersIdProviderPort: {
      getUsersIds: () => {
        const userId = login.userId.value;
        if (!userId) {
          return [];
        }
        return [userId, ...subscribedUsers.getUsersIds()];
      },
    },
  });

  const { readingHistory, dispose: disposeReadingHistory } =
    createReadingHistoryState({
      userId: login.userId,
      refetchTrigger: currentReadingState,
      getUserLastReading: (userId, range) =>
        readingHistoryService.getUserLastReading(userId, range),
    });

  const getCommunityReading = (timespan: {
    from: number;
    to: number;
  }): Promise<FilteredReading> =>
    readingHistoryService
      .getCommunityReading([{ id: "value", span: timespan }])
      .then((result) => result.value);

  // Latched so Today's cards keep their book names while the reader is between
  // chapters — the live signals blink to null during a translation switch, and
  // a snapshot taken then would render bare book ids.
  const lastTranslationBooks = signal<{
    books: TranslationBookSummary[];
  } | null>(null);
  const disposeTranslationBooks = effect(() => {
    const books =
      currentReadingState.value?.tab.readingState.translationBooks.value ??
      null;
    if (books !== null) {
      lastTranslationBooks.value = books;
    }
  });

  const lastTranslationId = signal<string | undefined>(undefined);
  const disposeTranslationId = effect(() => {
    const translationId =
      currentReadingState.value?.tab.readingState.translationId.value ?? null;
    if (translationId !== null) {
      lastTranslationId.value = translationId;
    }
  });

  const translationBooksMap = computed(
    () =>
      new Map(
        (lastTranslationBooks.value?.books ?? []).map((book) => [book.id, book])
      )
  );

  const bookNames = computed(
    () =>
      new Map(
        (lastTranslationBooks.value?.books ?? []).map((book) => [
          book.id,
          book.name,
        ])
      )
  );

  const getDefaultTranslation = () =>
    currentReadingState.value?.tab.readingState.defaultTranslation.id ??
    getDefaultTranslationForLanguage(options.defaultLanguage).id;

  const searchVerses = async (query: string): Promise<VerseSearchResult[]> => {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const readingState = currentReadingState.value;
    const defaultTranslation = getDefaultTranslationForLanguage(
      options.defaultLanguage
    );
    const activeTranslationId =
      readingState?.translationId ?? defaultTranslation.id;
    const activeLanguage =
      readingState?.tab.readingState.translation.value?.language ??
      defaultTranslation.language;

    const response = await search.searchVerses(
      activeLanguage,
      activeTranslationId,
      trimmed
    );

    return (response.hits ?? []).map((hit) => ({
      id: hit.document.id,
      translationId: hit.document.translation,
      bookId: hit.document.book,
      chapterNumber: hit.document.chapter,
      verseNumber: hit.document.verse,
      reference: hit.document.reference,
      text: hit.document.text,
    }));
  };

  const getVerseText = async (
    translationId: string,
    bookId: string,
    chapter: number,
    verse: number
  ): Promise<string | undefined> => {
    const chapterData = await bibleData.getTranslationBookChapter(
      translationId,
      bookId,
      chapter
    );

    const verseContent = chapterData.chapter.content.find(
      (item) => item.type === "verse" && item.number === verse
    );
    if (!verseContent || verseContent.type !== "verse") return undefined;

    return verseContent.content
      .map((part) =>
        typeof part === "string" ? part : "text" in part ? part.text : ""
      )
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  };

  // Never open during SSR: `effectivePanes` renders fullscreen panes
  // unconditionally (app/main.tsx), so a cold `/` request would otherwise
  // serialize the whole Today screen into the crawled HTML. Safe because the
  // client entry calls `render`, not `hydrate`, so there is no mismatch.
  const isOpen: Signal<boolean> = signal(
    import.meta.env.SSR
      ? false
      : todayWillAutoOpenForUrl(navigation.initialUrl, navigation.basePath)
  );

  const disposeUrlSync = navigation.syncSignalsToUrl({
    today: {
      get value() {
        return isOpen.value ? "open" : null;
      },
      set value(newValue) {
        isOpen.value = newValue === "open";
      },
    },
  });

  // Unconditional writes on purpose: `syncSignalsToUrl`'s inbound effect reads
  // `currentUrl` and then calls this setter, so an `isOpen.value` guard here
  // would subscribe that effect to the signal it is about to write and trip
  // preact's "Cycle detected". Use `.peek()` if a guard is ever needed.
  const open = () => {
    isOpen.value = true;
  };
  const close = () => {
    isOpen.value = false;
  };

  return {
    isOpen,
    readingHistory,
    getCommunityReading,
    bookNames,
    lastTranslationBooks,
    lastTranslationId,
    translationBooksMap,
    searchVerses,
    getVerseText,
    getDefaultTranslation,
    getReadingHistoryEvents: fetchReadingHistoryEvents,
    getTranslationBooks: (translation: string) =>
      bibleData.getTranslationBooks(translation),
    readingHistoryConfigProvider,
    subscribedUsers,
    open,
    close,
    dispose: () => {
      disposeReadingHistory();
      disposeTranslationBooks();
      disposeTranslationId();
      disposeUrlSync();
    },
  };
}
