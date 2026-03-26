import { Tooltip } from "scriptureMap2D.main.Tooltip";
import type { BookType } from "scriptureMap2D.main.types";
import { useBook } from "scriptureMap2D.hooks.useBook";

const { memo } = os.appCompat;

export const Book = memo<BookType>(
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
  }) => {
    const {
      showChapters,
      tooltipAnchor,
      tooltipContent,
      tooltipOffsetY,
      chapters,
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
            chapters
          ) : (isReadingHistoryEnabled || isUserPresenceEnabled) &&
            tooltipAnchor &&
            tooltipContent?.length > 0 ? (
            <Tooltip
              anchor={tooltipAnchor}
              content={tooltipContent}
              offsetY={tooltipOffsetY}
            />
          ) : null}
        </div>
      </div>
    );
  }
);
