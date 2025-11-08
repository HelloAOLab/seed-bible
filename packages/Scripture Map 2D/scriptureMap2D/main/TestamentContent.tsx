import { useTestamentContext } from "scriptureMap2D.main.TestamentContext";
import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";
import { Book } from "scriptureMap2D.main.Book";
import { useResizeObserver } from "scriptureMap2D.main.CustomHooks";
import { SectionToggle } from "scriptureMap2D.main.SectionToggle";
const { useMemo, useCallback, useState, useRef, useEffect } = os.appHooks;

export const TestamentContent = ({ hidden }) => {
  const {
    arrangementIndex,
    scaleFactor,
    showLabels,
    bookWidth,
    readingHistoryRange,
    booksWithReadingHistory,
  } = useScriptureMap2DContext();

  const contentRef = useRef(null);
  const { width: contentWidth } = useResizeObserver(contentRef);
  const { testament, testamentIndex } = useTestamentContext();

  const reversedSections = useMemo(() => {
    return testament.sections.toReversed();
  }, []);

  const filteredSections = useMemo(() => {
    console.log(`[Debug] TestamentContent filteredSections useMemo`);

    if (!readingHistoryRange) return reversedSections;

    const filteredSections = [];

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
          BibleVizUtils.Data.tags.booksStaticInfo[book.commonName].abbreviation;
        if (booksWithReadingHistory.has(bookId)) {
          filteredBooks.push(book);
        }
      }
      if (filteredBooks.length > 0) {
        filteredSections.push({
          ...section,
          books: filteredBooks,
        });
      }
    }

    return filteredSections;
  }, [reversedSections, booksWithReadingHistory, readingHistoryRange]);

  const sectionLevelsColorsMap = useMemo(() => {
    const map = new Map();

    filteredSections.forEach((section, sectionIndex) => {
      const levelColorsKey = `${testamentIndex} ${sectionIndex}`;
      const sectionLevelsColors =
        BibleVizUtils.Functions.GetChildrenLevelColors({
          sectionColorRGB: BibleVizUtils.Functions.HexToRgb({
            hexColor: section.color,
          }),
          colorRange: section.customColorRange ?? 70,
          levelsLength: section.books.length,
        });
      map.set(levelColorsKey, sectionLevelsColors);
    });
    return map;
  }, [filteredSections]);

  const [sectionsShown, setSectionsShown] = useState(
    new Map(
      filteredSections.map((section) => {
        return [section, true];
      })
    )
  );

  useEffect(() => {
    setSectionsShown(
      new Map(
        filteredSections.map((section) => {
          return [section, true];
        })
      )
    );
  }, [filteredSections]);

  const toggleShowSection = useCallback(
    (section) => {
      const copy = new Map(sectionsShown);
      copy.set(section, !copy.get(section));
      setSectionsShown(copy);
    },
    [testament, sectionsShown]
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
        if (bookIndex === 0 && showLabels) {
          const sectionOcupiedColumns = Math.min(
            fittingBooksCount - (currentBookColumn - 1),
            filteredSections[sectionIndex].books.length
          );
          elements.push(
            <SectionToggle
              key={`${arrangementIndex} ${testamentIndex} ${sectionIndex}`}
              section={filteredSections[sectionIndex]}
              toggleShowSection={toggleShowSection}
              showingContent={sectionsShown.get(filteredSections[sectionIndex])}
              style={{
                backgroundColor: `${filteredSections[sectionIndex].color}80`,
                borderBottomColor: filteredSections[sectionIndex].color,
                gridRow: `${i * 2 - 1} / ${i * 2}`,
                gridColumn: `${currentBookColumn} / ${sectionsShown.get(filteredSections[sectionIndex]) ? currentBookColumn + sectionOcupiedColumns : currentBookColumn + 1}`,
              }}
            />
          );
        }

        if (sectionsShown.get(filteredSections[sectionIndex])) {
          const levelColorsKey = `${testamentIndex} ${sectionIndex}`;
          const color =
            filteredSections[sectionIndex].books.toReversed()[bookIndex]
              .customColor ??
            sectionLevelsColorsMap.get(levelColorsKey).toReversed()[bookIndex];

          elements.push(
            <Book
              key={`${arrangementIndex} ${testamentIndex} ${sectionIndex} ${bookIndex}`}
              bookInfo={
                filteredSections[sectionIndex].books.toReversed()[bookIndex]
              }
              bookCoverBackgroundColor={color}
              sectionName={filteredSections[sectionIndex].name}
              style={{
                gridRow: `${i * 2} / ${i * 2 + 1}`,
                gridColumn: `${currentBookColumn} / ${currentBookColumn + 1}`,
              }}
            />
          );
          bookIndex++;
          if (bookIndex === filteredSections[sectionIndex].books.length) {
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
    sectionLevelsColorsMap,
    sectionsShown,
    showLabels,
  ]);

  return (
    <div
      className={`testamentContent ${hidden ? "hidden" : ""}`}
      ref={contentRef}
    >
      {sections}
    </div>
  );
};
