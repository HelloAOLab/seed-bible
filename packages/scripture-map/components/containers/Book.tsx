import { Tooltip } from "./Tooltip";
import { useBook } from "../../hooks/useBook";
import { Chapter, type ChapterProps } from "./Chapter";
import type {
  ReadingHistorySummary,
  ReadingEvent,
} from "../../../seed-bible/seed-bible/managers/ReadingHistoryManager";

import { memo } from "preact/compat";

export type BookUserPresenceItem = {
  chapter: number;
  borderColor: string;
};

export type BookUserPresence = Record<string, BookUserPresenceItem>;

export interface BookProps {
  book: string;
  bookId: string;
  numberOfChapters: number;
  chaptersVerseCount: readonly number[];
  isSubset: boolean;
  subsetStartIndex?: number;
  bookCoverBackgroundColor: string;
  sectionName: string;
  readingEvents: ReadingEvent[];
  readingSummary: ReadingHistorySummary;
  bookBorderGradientColors: React.CSSProperties["backgroundImage"];
  bookUserPresence: BookUserPresence;
  bookUserPresenceColors: string[];
}

export interface ChapterData extends ChapterProps {
  key: `${string}-${number}`;
}

export const Book = memo(
  ({
    book,
    bookId,
    numberOfChapters,
    chaptersVerseCount,
    isSubset,
    subsetStartIndex,
    bookCoverBackgroundColor,
    sectionName,
    readingEvents,
    readingSummary,
    bookBorderGradientColors,
    bookUserPresence,
    bookUserPresenceColors,
  }: BookProps) => {
    const {
      showChapters,
      tooltipAnchor,
      tooltipContentsData,
      tooltipOffsetY,
      chaptersData,
      bookTitle,
      bookClass,
      bookPagesClass,
      handleBookClick,
      handleBookHeaderPointerDown,
      handleBookHeaderPointerUp,
      handleBookHeaderClick,
      handleBookCoverPointerEnter,
      handleBookCoverPointerLeave,
      bookPagesStyle,
      bookCoverFrontStyle,
      isReadingHistoryEnabled,
      isUserPresenceEnabled,
    } = useBook({
      book,
      bookId,
      numberOfChapters,
      chaptersVerseCount,
      isSubset,
      subsetStartIndex,
      bookCoverBackgroundColor,
      sectionName,
      readingEvents,
      readingSummary,
      bookUserPresence,
      bookUserPresenceColors,
      bookBorderGradientColors,
    });

    return (
      <div className={bookClass} onClick={handleBookClick}>
        <div
          className="book-header"
          onPointerDown={handleBookHeaderPointerDown}
          onPointerUp={handleBookHeaderPointerUp}
          onClick={handleBookHeaderClick}
        >
          <span className="book-id">{bookTitle}</span>
          <svg
            className="book-caret"
            viewBox="0 0 24 24"
            width="1em"
            height="1em"
            aria-hidden="true"
          >
            <path
              d="M9 6l6 6-6 6"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <div className={bookPagesClass} style={bookPagesStyle}>
          {chaptersData.map((data) => (
            <Chapter {...data} />
          ))}
          <div
            className="book-cover-front"
            onPointerEnter={handleBookCoverPointerEnter}
            onPointerLeave={handleBookCoverPointerLeave}
            style={bookCoverFrontStyle}
          >
            {!showChapters &&
            (isReadingHistoryEnabled || isUserPresenceEnabled) &&
            tooltipAnchor &&
            tooltipContentsData?.length > 0 ? (
              <Tooltip
                anchor={tooltipAnchor}
                contentsData={tooltipContentsData}
                offsetY={tooltipOffsetY}
              />
            ) : null}
          </div>
        </div>
      </div>
    );
  }
);
