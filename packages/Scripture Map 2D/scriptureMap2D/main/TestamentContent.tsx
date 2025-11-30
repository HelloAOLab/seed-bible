import { useTestamentContext } from "scriptureMap2D.main.TestamentContext";
import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";
import { Book } from "scriptureMap2D.main.Book";
import { useResizeObserver } from "scriptureMap2D.main.CustomHooks";
import { SectionToggle } from "scriptureMap2D.main.SectionToggle";
import { useReadingHistoryContext } from "scriptureMap2D.main.ReadingHistoryContext";
import { calculateReadingHistorySummary } from "db.annotations.library";

const { useMemo, useCallback, useState, useRef, useEffect } = os.appHooks;
const { memo } = os.appCompat;

export const TestamentContent = memo(({ hidden }) => {
  const { arrangementIndex, scaleFactor, showLabels, bookWidth } =
    useScriptureMap2DContext();
  const {
    rangedReadingEventsByBook,
    readingHistoryRangeSeconds,
    SEC_PER_MINUTE,
  } = useReadingHistoryContext();

  const contentRef = useRef(null);
  const { width: contentWidth } = useResizeObserver(contentRef);
  const { testament, testamentIndex } = useTestamentContext();

  const reversedSections = useMemo(() => {
    return testament.sections.toReversed();
  }, []);

  const { filteredSections, sectionLevelColorMap } = useMemo(() => {
    const getLevelColorMap = (sections) => {
      return new Map(
        sections.map((section, sectionIndex) => {
          const levelColorsKey = `${testamentIndex} ${sectionIndex}`;
          const sectionLevelsColors =
            BibleVizUtils.Functions.GetChildrenLevelColors({
              sectionColorRGB: BibleVizUtils.Functions.HexToRgb({
                hexColor: section.color,
              }),
              colorRange: section.customColorRange ?? 70,
              levelsLength: section.books.length,
            });
          return [levelColorsKey, sectionLevelsColors];
        })
      );
    };

    let filteredSections;

    if (readingHistoryRangeSeconds) {
      filteredSections = [];

      for (
        let sectionIndex = 0;
        sectionIndex < reversedSections.length;
        sectionIndex++
      ) {
        const section = reversedSections[sectionIndex];
        const filteredBooks = [];
        for (let bookIndex = 0; bookIndex < section.books.length; bookIndex++) {
          const book = section.books[bookIndex];
          const bookId =
            BibleVizUtils.Data.tags.booksStaticInfo[book.commonName]
              .abbreviation;
          const bookEvents = rangedReadingEventsByBook.get(bookId);
          if (bookEvents) {
            const readingTimeSeconds = bookEvents.reduce((acc, event) => {
              return acc + event.end - event.start;
            }, 0);
            const isReadingTimeNoticeable =
              readingTimeSeconds >= SEC_PER_MINUTE;
            if (isReadingTimeNoticeable) {
              filteredBooks.push(book);
            }
          }
        }
        if (filteredBooks.length > 0) {
          filteredSections.push({
            ...section,
            books: filteredBooks,
          });
        }
      }
    } else filteredSections = reversedSections;

    return {
      filteredSections,
      sectionLevelColorMap: getLevelColorMap(filteredSections),
    };
  }, [reversedSections, rangedReadingEventsByBook, readingHistoryRangeSeconds]);

  const [sectionsShown, setSectionsShown] = useState(
    new Map(
      filteredSections.map((section, sectionIndex) => {
        const key = `${testamentIndex}-${testament.name}-${sectionIndex}-${section.name}`;
        return [key, true];
      })
    )
  );

  useEffect(() => {
    const next = new Map(
      filteredSections.map((section, sectionIndex) => {
        const key = `${testamentIndex}-${testament.name}-${sectionIndex}-${section.name}`;
        return [key, true];
      })
    );

    setSectionsShown((prev) => {
      if (!prev || prev.size !== next.size) return next;

      for (const key of next.keys()) {
        if (!prev.has(key)) {
          return next;
        }
      }

      return prev;
    });
  }, [filteredSections]);

  const toggleShowSection = useCallback(
    (sectionKey) => {
      const copy = new Map(sectionsShown);
      copy.set(sectionKey, !copy.get(sectionKey));
      setSectionsShown(copy);
    },
    [sectionsShown]
  );

  const getFittingItemCount = useCallback(
    (containerWidth, itemWidth, gapWidth) => {
      if (itemWidth <= 0) return 0;

      const totalSpacePerItem = itemWidth + gapWidth;
      const maxCount = Math.floor(
        (containerWidth + gapWidth) / totalSpacePerItem
      );

      return Math.max(0, maxCount);
    },
    []
  );

  const { fittingBooksCount, rowPairCount } = useMemo(() => {
    const gridGap = 16 * scaleFactor;
    const fittingBooksCount = getFittingItemCount(
      contentWidth,
      bookWidth,
      gridGap
    );
    const totalBooks = filteredSections.flatMap((section) => {
      return section.books;
    }).length;
    const rowPairCount = Math.ceil(totalBooks / fittingBooksCount);
    return { fittingBooksCount, rowPairCount };
  }, [scaleFactor, contentWidth, testament, bookWidth, filteredSections]);

  const sections = useMemo(() => {
    const elements = [];
    let sectionIndex = 0;
    let bookIndex = 0;
    let currentBookColumn = 1;

    if (fittingBooksCount === 0) return elements;

    for (let i = 1; i <= rowPairCount; i++) {
      while (
        currentBookColumn <= fittingBooksCount &&
        sectionIndex < filteredSections.length
      ) {
        const section = filteredSections[sectionIndex];
        const reversedBooks = section.books.toReversed();
        const bookInfo = reversedBooks[bookIndex];
        const sectionKey = `${testamentIndex}-${testament.name}-${sectionIndex}-${section.name}`;
        if (bookIndex === 0 && showLabels) {
          const sectionOcupiedColumns = Math.min(
            fittingBooksCount - (currentBookColumn - 1),
            filteredSections[sectionIndex].books.length
          );
          elements.push(
            <SectionToggle
              key={`${arrangementIndex}-${testament.name}-${section.name}`}
              section={filteredSections[sectionIndex]}
              sectionKey={sectionKey}
              toggleShowSection={toggleShowSection}
              showingContent={sectionsShown.get(sectionKey)}
              style={{
                backgroundColor: `${filteredSections[sectionIndex].color}80`,
                borderBottomColor: filteredSections[sectionIndex].color,
                gridRow: `${i * 2 - 1} / ${i * 2}`,
                gridColumn: `${currentBookColumn} / ${sectionsShown.get(sectionKey) ? currentBookColumn + sectionOcupiedColumns : currentBookColumn + 1}`,
              }}
            />
          );
        }

        if (sectionsShown.get(sectionKey)) {
          const levelColorsKey = `${testamentIndex} ${sectionIndex}`;
          const color =
            bookInfo.customColor ??
            sectionLevelColorMap.get(levelColorsKey).toReversed()[bookIndex];
          const readingEvents =
            rangedReadingEventsByBook.get(
              BibleVizUtils.Data.tags.booksStaticInfo[bookInfo.commonName]
                .abbreviation
            ) ?? [];
          const summary = calculateReadingHistorySummary(readingEvents);

          elements.push(
            <Book
              key={`book-${arrangementIndex}-${testament.name}-${section.name}-${bookInfo.commonName}`}
              bookInfo={bookInfo}
              bookCoverBackgroundColor={color}
              sectionName={section.name}
              style={{
                gridRow: `${i * 2} / ${i * 2 + 1}`,
                gridColumn: `${currentBookColumn} / ${currentBookColumn + 1}`,
              }}
              readingEvents={readingEvents}
              readingSummary={summary}
            />
          );
          bookIndex++;
          if (bookIndex === section.books.length) {
            bookIndex = 0;
            sectionIndex++;
          }
        } else sectionIndex++;

        currentBookColumn++;
      }
      currentBookColumn = 1;
    }

    return elements;
  }, [
    fittingBooksCount,
    rowPairCount,
    filteredSections,
    sectionLevelColorMap,
    sectionsShown,
    showLabels,
    rangedReadingEventsByBook,
  ]);

  return (
    <div
      className={`testamentContent ${hidden ? "hidden" : ""}`}
      ref={contentRef}
    >
      {sections}
    </div>
  );
});
