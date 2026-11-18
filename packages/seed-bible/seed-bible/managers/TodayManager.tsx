import { computed, effect, signal, type ReadonlySignal } from "@preact/signals";
import type { CasualOSManager } from "./OsManager";
import type { LoginManager } from "./LoginManager";
import type { Friend, FriendsManager } from "./FriendsManager";
import type { NavigationManager } from "./NavigationManager";
import type { SearchManager } from "./SearchManager";
import type { BibleDataManager } from "./BibleDataManager";
import type { ReaderTab } from "./TabsManager";
import type { SeedBibleState } from "./SeedBibleStateManager";
import {
  getReadingHistoryEvents,
  type ReadingEvent,
} from "./ReadingHistoryManager";
import { getDefaultTranslationForLanguage } from "./BibleReadingManager";
import { hasReadingUrlPosition } from "./ReadingUrlPath";
import {
  buildStaticPagePath,
  isNonReadingPagePath,
  parseStaticPagePath,
} from "./StaticPagePath";
import { isMinimalEmbedUrl } from "./EmbedMode";
import type { Translation, TranslationBooks } from "./FreeUseBibleAPI";
import type { Annotation, AnnotationsManager } from "./AnnotationsManager";
import {
  buildCommunityFeed,
  type CommunityFeedItem,
} from "./TodayCommunityFeed";
import {
  createReadingHistoryState,
  getUserLastReading as queryUserLastReading,
  type ReadingHistoryState,
  type Timespan,
} from "./TodayReadingHistory";

/**
 * Id of the Today pane. Exported because `readerVisible` and the toolbar both
 * need to recognise it, and a stray copy of the literal is how the two open
 * paths drifted apart while Today was an extension.
 */
export const TODAY_PANE_ID = "today-screen-pane";

/**
 * How long the community feed reuses a member's notes. Long enough to click
 * around the timeline on one fetch, short enough that a friend's new note
 * turns up while Today is left open.
 */
const NOTES_CACHE_MS = 5 * 60 * 1000;

/** A single verse match returned by the full-text verse search. */
export interface VerseSearchResult {
  id: string;
  translationId: string;
  bookId: string;
  chapterNumber: number;
  verseNumber: number | null;
  reference: string;
  text: string;
}

/** The verse of the day, with its text in the translation it was asked for. */
export interface TodayVerseOfTheDay {
  bookId: string;
  chapter: number;
  verse: number;
  /** The last verse of the passage. Omitted when it is a single verse. */
  endVerse?: number;
  translationId: string;
  /** The translation's abbreviation, such as "BSB". */
  translationShortName: string;
  text: string;
}

/** Books the reader currently has loaded, in the shape Today's cards want. */
type TranslationBookSummary = {
  id: string;
  name: string;
  commonName?: string;
  numberOfChapters: number;
};

/**
 * Whether `pathname` is the Today page, "/{lang}/today".
 */
export function isTodayPagePath(pathname: string, basePath: string): boolean {
  return parseStaticPagePath(pathname, basePath)?.page === "today";
}

/**
 * Query params that only mean something on a reading URL, so a redirect to
 * the Today page drops them along with the reading path.
 */
const READING_ONLY_PARAMS = [
  "book",
  "chapter",
  "translation",
  "translationId",
  "lang",
  "verse",
];

/**
 * Whether a visit to `url` should land on the Today page instead. A compact
 * embed (`?embed=minimal` / `?embed=true`) never does — that chrome has no
 * Today surface. Otherwise the legacy `?today=` param wins when present
 * (`open` lands on Today, anything else stays put), and with no param only a
 * URL that points nowhere in particular lands there: not a reading position,
 * a static page such as "/en/about", a shared playlist page, or a
 * shared-session invite.
 *
 * Shared by the server (which answers with a redirect) and the client (which
 * rewrites the address before the app is built, for a page the service
 * worker served from its cache without asking the server).
 */
export function shouldRedirectToTodayPage(url: URL, basePath: string): boolean {
  if (isMinimalEmbedUrl(url) || isTodayPagePath(url.pathname, basePath)) {
    return false;
  }
  const requested = url.searchParams.get("today");
  if (requested !== null) {
    return requested === "open";
  }
  return !(
    hasReadingUrlPosition(url, basePath) ||
    // The legacy query-param form of a reading position, which the server
    // folds into a reading path before this is asked.
    url.searchParams.has("book") ||
    isNonReadingPagePath(url.pathname, basePath) ||
    url.searchParams.has("sessionId")
  );
}

/**
 * Where `url` should redirect to show the Today page — "/{lang}/today",
 * keeping any query params that aren't about a reading position — or null
 * when it should be left alone (see `shouldRedirectToTodayPage`).
 */
export function getTodayPageRedirect(
  url: URL,
  basePath: string,
  language: string
): string | null {
  if (!shouldRedirectToTodayPage(url, basePath)) {
    return null;
  }
  const params = new URLSearchParams(url.search);
  params.delete("today");
  for (const key of READING_ONLY_PARAMS) {
    params.delete(key);
  }
  const query = params.toString();
  return `${basePath}${buildStaticPagePath({ language, page: "today" })}${
    query ? `?${query}` : ""
  }`;
}

export interface TodayManager {
  /** Whether the Today page ("/{lang}/today") is the current URL. */
  isOpen: ReadonlySignal<boolean>;
  /**
   * Three-state gate: `loading` renders placeholders, `empty` renders Welcome,
   * `ready` renders the resume card.
   */
  readingHistory: ReadonlySignal<ReadingHistoryState>;
  /**
   * The readers whose notes and reading the community feed shows: the
   * signed-in user, then their friends. Empty when signed out.
   */
  communityMembers: ReadonlySignal<string[]>;
  /**
   * Everything the community members did inside `span`, newest first. With
   * `crossedPaths` on, chapters that several members read fold into shared
   * items; the "all" window turns it off.
   */
  getCommunityFeed: (
    span: Timespan,
    options: { crossedPaths: boolean }
  ) => Promise<CommunityFeedItem[]>;
  /** The signed-in user's friends, for naming them in the community feed. */
  friendReaders: ReadonlySignal<Friend[]>;
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
  /**
   * The verse of the day for a `YYYY-MM-DD` date from the "verse-of-the-day"
   * dataset, with its text in `translationId`. Null when the dataset has no
   * verse for the day or the translation doesn't have its text.
   */
  getVerseOfTheDay: (
    date: string,
    translationId: string
  ) => Promise<TodayVerseOfTheDay | null>;
  getDefaultTranslation: () => string | undefined;
  getReadingHistoryEvents: (
    recordName: string,
    startTime: number,
    endTime: number
  ) => Promise<Iterable<ReadingEvent>>;
  getTranslationBooks: (translation: string) => Promise<TranslationBooks>;
  /** Navigates to the Today page, as a new history entry. */
  open: () => void;
  /**
   * Leaves the Today page for the reader's current position, as a new
   * history entry so Back returns to Today. A no-op off the Today page.
   */
  close: () => void;
  /** Tears down the internal effects. The app never calls this; tests do. */
  dispose: () => void;
}

export function createTodayManager(options: {
  os: CasualOSManager;
  login: LoginManager;
  friends: Pick<FriendsManager, "friends" | "friendIds">;
  navigation: NavigationManager;
  search: SearchManager;
  bibleData: BibleDataManager;
  annotations: Pick<AnnotationsManager, "listAllAnnotationsForUser">;
  /** UI language used to pick a default translation when nothing is loaded. */
  defaultLanguage: string;
  /** The live UI language, which names the Today page's path. */
  language: ReadonlySignal<string>;
  /**
   * Writes the reader's position back into the URL in place of the Today
   * page. Supplied by the caller because the tabs that own that position are
   * built after this manager's dependencies.
   */
  leaveTodayPage: () => void;
  /**
   * The reader's current position. Read for its reactivity (to revalidate the
   * resume card) and for the active translation/language.
   */
  currentReadingState: ReadonlySignal<{
    tab: ReaderTab;
    translationId: string | null;
  } | null>;
}): TodayManager {
  const {
    os,
    login,
    friends,
    navigation,
    search,
    bibleData,
    annotations,
    currentReadingState,
  } = options;

  const fetchReadingHistoryEvents = (
    recordName: string,
    startTime: number,
    endTime: number
  ) => getReadingHistoryEvents(os, recordName, startTime, endTime);

  const { readingHistory, dispose: disposeReadingHistory } =
    createReadingHistoryState({
      userId: login.userId,
      refetchTrigger: currentReadingState,
      getUserLastReading: (userId, range) =>
        queryUserLastReading(fetchReadingHistoryEvents, userId, range),
    });

  // Reading history and notes are world-readable, so a friend's activity can be
  // fetched the same way as the user's own.
  const communityMembers = computed(() => {
    const userId = login.userId.value;
    if (!userId) return [];
    const friendIds = friends.friendIds.value.filter((id) => id !== userId);
    return [userId, ...friendIds];
  });

  // Notes have no time-range query, so each fetch pages through the member's
  // whole record. Kept per member so clicking from day to day on the timeline
  // filters what was already fetched instead of sweeping every record again.
  // Cleared when the member list changes and whenever Today opens (see below),
  // so a note the user just wrote in the reader is there when they come back.
  const notesCache = new Map<
    string,
    { notes: Promise<Annotation[]>; fetchedAtMs: number }
  >();
  const getMemberNotes = (memberId: string): Promise<Annotation[]> => {
    const cached = notesCache.get(memberId);
    if (cached && Date.now() - cached.fetchedAtMs < NOTES_CACHE_MS) {
      return cached.notes;
    }
    const notes = annotations.listAllAnnotationsForUser(memberId);
    const entry = { notes, fetchedAtMs: Date.now() };
    notesCache.set(memberId, entry);
    // A failure isn't kept, so the next window asks again.
    notes.catch(() => {
      if (notesCache.get(memberId) === entry) {
        notesCache.delete(memberId);
      }
    });
    return notes;
  };

  const getCommunityFeed = async (
    span: Timespan,
    { crossedPaths }: { crossedPaths: boolean }
  ): Promise<CommunityFeedItem[]> => {
    const members = communityMembers.peek();

    // One member's unreachable record costs that member's rows, not the feed.
    const eventsByReader = new Map<string, ReadingEvent[]>();
    const notesByUser = new Map<string, Annotation[]>();
    await Promise.all([
      ...members.map((memberId) =>
        fetchReadingHistoryEvents(memberId, span.from, span.to)
          .then((events) => {
            eventsByReader.set(memberId, Array.from(events));
          })
          .catch((error: unknown) => {
            console.warn(
              `[TodayManager] Could not read ${memberId}'s reading history for the community feed.`,
              error
            );
            eventsByReader.set(memberId, []);
          })
      ),
      ...members.map((memberId) =>
        getMemberNotes(memberId)
          .then((notes) => {
            notesByUser.set(memberId, notes);
          })
          .catch((error: unknown) => {
            console.warn(
              `[TodayManager] Could not read ${memberId}'s notes for the community feed.`,
              error
            );
            notesByUser.set(memberId, []);
          })
      ),
    ]);

    return buildCommunityFeed({
      eventsByReader,
      notesByUser,
      span,
      crossedPaths,
    });
  };

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

  /**
   * Plain text of verses `from` through `to`, with the translation it came
   * from, or undefined when none of the verses exist.
   */
  const getPassage = async (
    translationId: string,
    bookId: string,
    chapter: number,
    from: number,
    to: number
  ): Promise<{ text: string; translation: Translation } | undefined> => {
    const chapterData = await bibleData.getTranslationBookChapter(
      translationId,
      bookId,
      chapter
    );

    const verses = chapterData.chapter.content.flatMap((item) =>
      item.type === "verse" && item.number >= from && item.number <= to
        ? [item]
        : []
    );
    if (verses.length === 0) return undefined;

    const text = verses
      .flatMap((verse) => verse.content)
      .map((part) =>
        typeof part === "string" ? part : "text" in part ? part.text : ""
      )
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    return { text, translation: chapterData.translation };
  };

  const getVerseText = async (
    translationId: string,
    bookId: string,
    chapter: number,
    verse: number
  ): Promise<string | undefined> =>
    (await getPassage(translationId, bookId, chapter, verse, verse))?.text;

  const getVerseOfTheDay = async (
    date: string,
    translationId: string
  ): Promise<TodayVerseOfTheDay | null> => {
    const picked = await bibleData.api.getVerseOfTheDay(date);
    if (!picked) return null;

    const passage = await getPassage(
      translationId,
      picked.book,
      picked.chapter,
      picked.verse,
      picked.endVerse ?? picked.verse
    );
    if (!passage?.text) return null;

    return {
      bookId: picked.book,
      chapter: picked.chapter,
      verse: picked.verse,
      ...(picked.endVerse !== undefined ? { endVerse: picked.endVerse } : {}),
      translationId,
      translationShortName: passage.translation.shortName || translationId,
      text: passage.text,
    };
  };

  // Derived from the path, so the server and the client's first render agree
  // on it without any deferral: the server renders the Today page for
  // "/{lang}/today" just as it renders the reader for a chapter.
  const isOpen = computed(() =>
    isTodayPagePath(navigation.currentUrl.value.pathname, navigation.basePath)
  );

  const disposeNotesCache = effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    communityMembers.value;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    isOpen.value;
    notesCache.clear();
  });

  const open = () => {
    const current = navigation.currentUrl.peek();
    if (
      isMinimalEmbedUrl(current) ||
      isTodayPagePath(current.pathname, navigation.basePath)
    ) {
      return;
    }
    navigation.updatePathAndQueryParams(
      buildStaticPagePath({
        language: options.language.peek(),
        page: "today",
      }),
      {}
    );
  };
  const close = () => {
    if (isOpen.peek()) {
      options.leaveTodayPage();
    }
  };

  return {
    isOpen,
    readingHistory,
    communityMembers,
    getCommunityFeed,
    friendReaders: friends.friends,
    bookNames,
    lastTranslationBooks,
    lastTranslationId,
    translationBooksMap,
    searchVerses,
    getVerseText,
    getVerseOfTheDay,
    getDefaultTranslation,
    getReadingHistoryEvents: fetchReadingHistoryEvents,
    getTranslationBooks: (translation: string) =>
      bibleData.getTranslationBooks(translation),
    open,
    close,
    dispose: () => {
      disposeReadingHistory();
      disposeTranslationBooks();
      disposeTranslationId();
      disposeNotesCache();
    },
  };
}

/** Where in scripture a Today card wants to send the reader. */
export interface TodayPassageTarget {
  bookId: string;
  chapter: number;
  verse?: number;
  /** Defaults to the reader's default translation when omitted. */
  translationId?: string;
}

/**
 * Opens a passage in the reader and leaves Today.
 *
 * Every Today card that navigates wants both halves, so they are one action —
 * a card that opened a chapter without closing Today would leave the reader
 * hidden behind a fullscreen pane.
 *
 * A standalone function rather than a `TodayManager` method: it spans `tabs`,
 * `tabsLayout` and `app`, none of which exist when `createTodayManager` runs.
 */
export function openTodayPassage(
  state: SeedBibleState,
  today: TodayManager,
  { bookId, chapter, verse, translationId }: TodayPassageTarget
): void {
  // First, so leaving Today pushes a history entry that selecting the new tab
  // below then rewrites in place: Back returns to Today instead of skipping it.
  today.close();
  const tab = state.tabs.addTab(undefined, {
    initialBookId: bookId,
    initialChapterNumber: chapter,
    initialTranslationId: translationId ?? today.getDefaultTranslation(),
    scrollToVerse: verse,
  });
  // `scrollToVerse` only scrolls; the highlight is a separate decoration
  // (same pattern as the reader's search panel).
  if (verse !== undefined) {
    tab.readingState.decorateVerses(bookId, chapter, verse, {
      className: "sb-verse-decoration-diminish",
      containerClassName: "sb-chapter-decoration-diminish",
      removeAfterMs: 3000,
    });
  }
  const slotId = state.tabsLayout.selectedSlotId.value;
  if (slotId) {
    state.tabsLayout.openTabInSlot(slotId, tab.id);
  }
  state.app.selectTab(tab.id);
}
