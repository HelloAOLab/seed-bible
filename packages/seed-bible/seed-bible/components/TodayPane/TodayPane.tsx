import { TodayProvider } from "./TodayContext";
import { TimeProvider } from "./TimeContext";
import { TodayContainer } from "./TodayContainer";
import type { ReadonlySignal, Signal } from "@preact/signals";
import type {
  FilteredReading,
  ReadingHistoryState,
  TimespanOption,
  TimespanOptionId,
} from "./readingHistory";
import type { ReadingHistoryTimelineComponent } from "../ReadingHistoryTimeline/ReadingHistoryTimeline";
import type { GetDayRangeSecondsType } from "../../managers/ReadingHistoryTime";
import type { CapitalizeFirstLetterType } from "../../managers/Strings";
import type { ReadingEvent } from "../../managers/ReadingHistoryManager";
import type { BibleTheme } from "../../managers/ThemeManager";
import type { ReadingHistoryServicePort } from "./readingHistoryService";
import type { VerseSearchResult } from "./search";
import type { Bookmark } from "../../managers/BookmarksManager";
import type { TranslationBooks } from "../../managers/FreeUseBibleAPI";
import type { UseHorizontalScroll } from "../useHorizontalScroll";
import "./TodayPane.css";
// import type { UserProfile } from "../../managers/LoginManager";

import { memo } from "preact/compat";
import type { ColorParserType } from "../../managers/Colors";

export interface TodayConfig {
  ColorParser: ColorParserType;
  MaterialIcon: (props: {
    children: string;
    className?: string;
  }) => preact.JSX.Element;
  /** Shared shimmering placeholder block (see the reader's `Skeleton`). */
  Skeleton: (props: {
    shape?: "block" | "line" | "circle" | "button";
    width?: string;
    height?: string;
    radius?: string;
    className?: string;
  }) => preact.JSX.Element;
  /** Accessible wrapper announcing a group of `Skeleton` blocks as loading. */
  SkeletonContainer: (props: {
    label: string;
    className?: string;
    children: preact.ComponentChildren;
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
  /**
   * Reading-history gate: `loading`/`ready` render the personalized layout,
   * `empty` renders Welcome. See {@link ReadingHistoryState}.
   */
  readingHistory: ReadonlySignal<ReadingHistoryState>;
  getCommunityReading: (timespan: {
    from: number;
    to: number;
  }) => Promise<FilteredReading>;
  t: (key: string, options?: Record<string, unknown>) => string;
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
  isMobile: Signal<boolean>;
  isBookmarksListOpen: boolean;
  showBookmarksList: () => void;
}

type TodayPaneProps = {
  config: TodayConfig;
};

export const TodayPane = memo<
  (args: TodayPaneProps) => preact.JSX.Element | null
>(({ config }) => {
  return (
    <>
      <TodayProvider config={config}>
        <TimeProvider>
          <TodayContainer />
        </TimeProvider>
      </TodayProvider>
    </>
  );
});
