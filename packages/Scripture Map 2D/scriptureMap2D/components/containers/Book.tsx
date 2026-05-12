import { Tooltip } from "scriptureMap2D.components.containers.Tooltip";
import { useBook } from "scriptureMap2D.hooks.useBook";
import {
  Chapter,
  type ChapterProps,
} from "scriptureMap2D.components.containers.Chapter";
import type {
  ReadingHistorySummary,
  ReadingEvent,
} from "seed-bible.managers.ReadingHistoryManager";
import type { BookName } from "bibleVizUtils.domain.models.scripture";

const { memo } = os.appCompat;

export type BookUserPresenceItem = {
  chapter: number;
  borderColor: string;
};

export type BookUserPresence = Record<string, BookUserPresenceItem>;

export interface BookProps {
  book: BookName;
  bookId: string;
  bookCoverBackgroundColor: string;
  sectionName: string;
  readingEvents: ReadingEvent[];
  readingSummary: ReadingHistorySummary;
  isPsalms: boolean;
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
    bookCoverBackgroundColor,
    sectionName,
    readingEvents,
    readingSummary,
    isPsalms,
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
      bookCoverClass,
      handleBookClick,
      handleBookHeaderPointerDown,
      handleBookHeaderPointerUp,
      handleBookHeaderClick,
      handleBookCoverPointerEnter,
      handleBookCoverPointerLeave,
      bookCoverStyle,
      isReadingHistoryEnabled,
      isUserPresenceEnabled,
    } = useBook({
      book,
      bookId,
      bookCoverBackgroundColor,
      sectionName,
      readingEvents,
      readingSummary,
      isPsalms,
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
        </div>
        <div
          className={bookCoverClass}
          onPointerEnter={handleBookCoverPointerEnter}
          onPointerLeave={handleBookCoverPointerLeave}
          style={bookCoverStyle}
        >
          {showChapters ? (
            chaptersData.map((data) => <Chapter {...data} />)
          ) : (isReadingHistoryEnabled || isUserPresenceEnabled) &&
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
    );
  }
);
