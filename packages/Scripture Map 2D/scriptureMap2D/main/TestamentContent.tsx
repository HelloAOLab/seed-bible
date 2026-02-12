import { useTestamentContext } from "scriptureMap2D.main.TestamentContext";
import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";
import { Book } from "scriptureMap2D.main.Book";
import { SectionToggle } from "scriptureMap2D.main.SectionToggle";
import { BooksContainer } from "scriptureMap2D.main.BooksContainer";
import { useReadingHistoryContext } from "scriptureMap2D.main.ReadingHistoryContext";
import { calculateReadingHistorySummary } from "db.annotations.library";
import { readingHistoryColorStore } from "bibleVizUtils.services.ReadingHistoryColorStore";

const { useMemo, useCallback, useState, useRef, useEffect } = os.appHooks;
const { memo } = os.appCompat;

const psalmsNames = [
  "1 Psalms",
  "2 Psalms",
  "3 Psalms",
  "4 Psalms",
  "5 Psalms",
];

export const TestamentContent = memo(({ hidden }) => {
  const {
    arrangementIndex,
    scaleFactor,
    showSectionLabels,
    bookWidth,
    isUserPresenceEnabled,
    activeTab,
    usersInfo,
    userPresence,
  } = useScriptureMap2DContext();
  const {
    rangedReadingEventsByBook,
    readingHistoryRangeSeconds,
    SEC_PER_MINUTE,
    myAuthBotId,
  } = useReadingHistoryContext();
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

  const sections = useMemo(() => {
    const elements = [];

    for (
      let sectionIndex = 0;
      sectionIndex < filteredSections.length;
      sectionIndex++
    ) {
      const section = filteredSections[sectionIndex];
      const sectionKey = `${testamentIndex}-${testament.name}-${sectionIndex}-${section.name}`;
      const levelColorsKey = `${testamentIndex} ${sectionIndex}`;
      const showingContent = sectionsShown.get(sectionKey);
      if (showSectionLabels) {
        elements.push(
          <SectionToggle
            key={`${arrangementIndex}-${testament.name}-${section.name}`}
            section={section}
            sectionKey={sectionKey}
            toggleShowSection={toggleShowSection}
            showingContent={showingContent}
            style={{
              backgroundColor: `${filteredSections[sectionIndex].color}80`,
              borderColor: showingContent
                ? "var(--secondaryColor)"
                : "transparent",
            }}
          />
        );
      }
      const reversedBooks = section.books.toReversed();
      if (showingContent) {
        const books = reversedBooks.map((bookInfo, bookIndex) => {
          const book = bookInfo.commonName;
          const bookStaticInfo = BibleVizUtils.Data.tags.booksStaticInfo[book];
          const bookId = bookStaticInfo.abbreviation;
          const color =
            bookInfo.customColor ??
            sectionLevelColorMap.get(levelColorsKey).toReversed()[bookIndex];
          const readingEvents =
            rangedReadingEventsByBook.get(
              BibleVizUtils.Data.tags.booksStaticInfo[bookInfo.commonName]
                .abbreviation
            ) ?? [];
          const summary = calculateReadingHistorySummary(readingEvents);

          let isPsalms = false;
          let psalmChaptersLimits;
          if (psalmsNames.includes(book)) {
            isPsalms = true;
            psalmChaptersLimits = {
              start: bookStaticInfo.startingIndex + 1,
              end:
                bookStaticInfo.startingIndex + bookStaticInfo.numberOfChapters,
            };
          }
          const bookUserPresence = {};

          const userPresenceColors = [];
          let borderGradientColors;
          if (isUserPresenceEnabled) {
            if (
              activeTab.data.bookId === bookId ||
              (activeTab.data.bookId === "PSA" &&
                isPsalms &&
                activeTab.data.chapter >= psalmChaptersLimits.start &&
                activeTab.data.chapter <= psalmChaptersLimits.end)
            ) {
              bookUserPresence["me"] = {
                chapter: activeTab.data.chapter,
                borderColor: readingHistoryColorStore.getUserColor(myAuthBotId),
              };
              userPresenceColors.push(
                readingHistoryColorStore.getUserColor(myAuthBotId)
              );
            }
            for (const user in usersInfo) {
              const { bookId: userBookId, chapter: userChapter } =
                userPresence[user];
              const { borderColor: userBorderColor } = usersInfo[user];
              if (
                bookId === userBookId ||
                (userBookId === "PSA" &&
                  isPsalms &&
                  userChapter >= psalmChaptersLimits.start &&
                  userChapter <= psalmChaptersLimits.end)
              ) {
                bookUserPresence[user] = {
                  chapter: userChapter,
                  borderColor: userBorderColor,
                };
                userPresenceColors.push(userBorderColor);
              }
            }
            if (userPresenceColors.length > 0)
              borderGradientColors =
                BibleVizUtils.Functions.GetUserPresenceBorderGradientColors({
                  colors: userPresenceColors,
                  diffuse: 15,
                });

            // if (userPresenceColors.length > 0) {
            //   tooltipContent.unshift(
            //     <UserPresenceTooltipContent colors={userPresenceColors} />
            //   );
            // }
          }

          return (
            <Book
              isPsalms={isPsalms}
              key={`book-${arrangementIndex}-${testament.name}-${section.name}-${bookInfo.commonName}`}
              book={book}
              bookId={bookId}
              bookCoverBackgroundColor={color}
              sectionName={section.name}
              readingEvents={readingEvents}
              readingSummary={summary}
              bookBorderGradientColors={borderGradientColors}
              bookUserPresence={bookUserPresence}
              bookUserPresenceColors={userPresenceColors}
            />
          );
        });
        elements.push(<BooksContainer>{books}</BooksContainer>);
      }
    }

    return elements;
  }, [
    filteredSections,
    sectionLevelColorMap,
    sectionsShown,
    showSectionLabels,
    rangedReadingEventsByBook,
    isUserPresenceEnabled,
    activeTab,
    usersInfo,
    userPresence,
  ]);

  return (
    <div className={`testament-content${hidden ? " hidden" : ""}`}>
      {sections}
    </div>
  );
});
