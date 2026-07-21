import { TodayProvider } from "../contexts/today/TodayContext";
import { TimeProvider } from "../contexts/time/TimeContext";
import { TodayContainer } from "./containers/TodayContainer";
import type { ReadonlySignal, Signal } from "@preact/signals";
import type {
  FilteredReading,
  TimespanOption,
  TimespanOptionId,
  UserLastReading,
} from "../../../domain/models/readingHistory";
import type { ReadingHistoryTimelineComponent } from "../../../../seed-bible-utils/infrastructure/models/seedBible";
import type { GetDayRangeSecondsType } from "../../../../seed-bible-utils/domain/functions/time";
import type { CapitalizeFirstLetterType } from "../../../../seed-bible-utils/domain/functions/string";
import type { ReadingEvent } from "../../../../seed-bible/seed-bible/managers/ReadingHistoryManager";
import type { BibleTheme } from "../../../../seed-bible/seed-bible/managers/ThemeManager";
import type { ReadingHistoryServicePort } from "../../ports/readingHistoryService";
import type { BibleReadingSession } from "../../../../seed-bible/seed-bible/managers/SessionsManager";
import type { VerseSearchResult } from "../../../domain/models/search";
import type { Bookmark } from "../../../../seed-bible/seed-bible/managers/BookmarksManager";
import type { TranslationBooks } from "../../../../seed-bible/seed-bible/managers/FreeUseBibleAPI";
import type { UseHorizontalScroll } from "../../../../seed-bible-utils/infrastructure/presentation/hooks/useHorizontalScroll";
import "./../styles/styles.css";
// import type { UserProfile } from "../../../../seed-bible/seed-bible/managers/LoginManager";

import { memo } from "preact/compat";

export interface TodayConfig {
  MaterialIcon: (props: {
    children: string;
    className?: string;
  }) => preact.JSX.Element;
  language: string;
  username: string | undefined;
  userProfile:
    | {
        name: string;
        pictureUrl: string | null | undefined;
        color: string;
        icon: string;
      }
    | undefined;
  userId: string | undefined;
  userLastReading: Signal<UserLastReading>;
  getCommunityReading: (timespan: {
    from: number;
    to: number;
  }) => Promise<FilteredReading>;
  translate: (key: string, options?: Record<string, unknown>) => string;
  bookNames: Signal<Map<string, string>>;
  addTab: (
    bookId: string,
    chapter: number,
    translationId?: string | undefined,
    verse?: number | undefined
  ) => void;
  closeToday: () => void;
  getDefaultTranslation: () => string | undefined;
  /** The last translation id that was in use (last valid, persists across deselection). */
  lastTranslationId: Signal<string | undefined>;
  /** Full-text verse search using the active translation/language. */
  searchVerses: (query: string) => Promise<VerseSearchResult[]>;
  /**
   * Plain text of a single verse from any translation/book/chapter.
   * Resolves to `undefined` when the chapter or verse is not found.
   */
  getVerseText: (
    translationId: string,
    bookId: string,
    chapter: number,
    verse: number
  ) => Promise<string | undefined>;
  openBookSelector: () => void;
  translationBooks: Signal<{
    books: Array<{
      id: string;
      name: string;
      commonName?: string;
      numberOfChapters: number;
    }>;
  } | null>;
  translationBooksMap: Signal<
    Map<
      string,
      {
        id: string;
        name: string;
        commonName?: string;
        numberOfChapters: number;
      }
    >
  >;
  subscribedUsersProfileProvider: {
    getUserProfile(id: string):
      | {
          name: string;
          pictureUrl?: string | null | undefined;
          color: string;
          icon: string;
        }
      | undefined;
  };
  subscribedUsersIdsProvider: {
    getUsersIds(): string[];
  };
  ReadingHistoryTimeline: ReadingHistoryTimelineComponent;
  getDayRangeSeconds: GetDayRangeSecondsType;
  getReadingHistoryEvents: (
    recordName: string,
    startTime: number,
    endTime: number
  ) => Promise<Iterable<ReadingEvent>>;
  GetPastDateInfo: (
    time: number,
    lang?: string | undefined
  ) => {
    weekday: string | undefined;
    day: number;
    month: number;
    monthName: string;
    year: number;
  };
  CapitalizeFirstLetter: CapitalizeFirstLetterType;
  theme: BibleTheme;
  readingHistoryService: ReadingHistoryServicePort;
  sharedSessions: ReadonlySignal<BibleReadingSession[]>;
  userDeterministicIdentityProvider: {
    getColorById(id: string): string;
    getIconById(id: string): string;
  };
  joinSharedSession: (id: string) => Promise<BibleReadingSession>;
  bookmarks: ReadonlySignal<Array<Bookmark>>;
  getTranslationBooks: (translation: string) => Promise<TranslationBooks>;
  readingHistoryConfigProvider: {
    buildTimespanOptionsMap: () => Record<TimespanOptionId, TimespanOption>;
    getTimespanOptionLabelMap(): Record<TimespanOptionId, string>;
  };
  getHighlightedWelcomeVerse: (
    translationId: string,
    rawVerseText: string
  ) => string;
  useHorizontalScroll: UseHorizontalScroll;
  isLoadingLastReading: Signal<boolean>;
}

type TodayProps = {
  config: TodayConfig;
};

export const Today = memo<(args: TodayProps) => preact.JSX.Element | null>(
  ({ config }) => {
    return (
      <>
        <TodayProvider config={config}>
          <TimeProvider>
            <TodayContainer />
          </TimeProvider>
        </TodayProvider>
      </>
    );
  }
);
