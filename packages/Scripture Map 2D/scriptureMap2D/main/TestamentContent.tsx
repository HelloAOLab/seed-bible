import { useTestamentContext } from "scriptureMap2D.main.TestamentContext";
import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";
import { Book } from "scriptureMap2D.main.Book";
import { SectionToggle } from "scriptureMap2D.main.SectionToggle";
import { BooksContainer } from "scriptureMap2D.main.BooksContainer";
import { useReadingHistoryContext } from "scriptureMap2D.main.ReadingHistoryContext";
import {
  calculateReadingHistorySummary,
  type ReadingEvent,
} from "db.annotations.library";
import { userColorStore } from "bibleVizUtils.services.UserColorStore";
import type {
  BookUserPresence,
  Range,
  TestamentContentType,
  ToggleShowSectionType,
} from "scriptureMap2D.main.types";
import {
  BibleVizDataRepository,
  type BookInfo,
  type SectionInfo,
} from "bibleVizUtils.data.BibleVizDataRepository";
import {
  HexToRgb,
  GetChildrenLevelColors,
  ComputeRawGradientColors,
  type HexString,
} from "bibleVizUtils.functions.index";
const { useMemo, useCallback, useState, useEffect } = os.appHooks;
const { memo } = os.appCompat;

const psalmsNames = [
  "1 Psalms",
  "2 Psalms",
  "3 Psalms",
  "4 Psalms",
  "5 Psalms",
];

export const TestamentContent = memo<TestamentContentType>(({ hidden }) => {
  const {
    arrangementIndex,
    showSectionLabels,
    isUserPresenceEnabled,
    activeTab,
    usersColors,
    userPresence,
  } = useScriptureMap2DContext();
  const {
    rangedReadingEventsByBook,
    readingHistoryRangeSeconds,
    SEC_PER_MINUTE,
  } = useReadingHistoryContext();
  const { testament, testamentIndex } = useTestamentContext();

  const reversedSections = useMemo<SectionInfo[]>(() => {
    return testament.sections.toReversed();
  }, []);

  const { filteredSections, sectionLevelColorMap } = useMemo(() => {
    const getLevelColorMap: (
      sections: SectionInfo[]
    ) => Map<string, HexString[]> = (sections) => {
      return new Map(
        sections.map((section, sectionIndex) => {
          const levelColorsKey = `${testamentIndex} ${sectionIndex}`;
          const sectionLevelsColors = GetChildrenLevelColors({
            sectionColorRGB: HexToRgb({
              hexColor: section.color,
            }),
            colorRange: section.customColorRange ?? 70,
            levelsLength: section.books.length,
          });
          return [levelColorsKey, sectionLevelsColors];
        })
      );
    };

    let filteredSections: undefined | SectionInfo[];

    if (readingHistoryRangeSeconds) {
      filteredSections = [];

      for (
        let sectionIndex = 0;
        sectionIndex < reversedSections.length;
        sectionIndex++
      ) {
        const section = reversedSections[sectionIndex];
        if (section) {
          const filteredBooks: BookInfo[] = [];
          for (
            let bookIndex = 0;
            bookIndex < section.books.length;
            bookIndex++
          ) {
            const book = section.books[bookIndex];
            if (book) {
              const bookStaticInfo = BibleVizDataRepository.getBookStaticInfo(
                book.commonName
              );
              if (bookStaticInfo) {
                const bookId = bookStaticInfo.abbreviation;
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
            }
          }
          if (filteredBooks.length > 0) {
            filteredSections.push({
              ...section,
              books: filteredBooks,
            });
          }
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
      if (prev.size !== next.size) return next;

      for (const key of next.keys()) {
        if (!prev.has(key)) {
          return next;
        }
      }

      return prev;
    });
  }, [filteredSections]);

  const toggleShowSection = useCallback<ToggleShowSectionType>(
    (sectionKey) => {
      const copy = new Map(sectionsShown);
      copy.set(sectionKey, !copy.get(sectionKey));
      setSectionsShown(copy);
    },
    [sectionsShown]
  );

  const sections = useMemo<React.ReactNode[]>(() => {
    const elements: React.ReactNode[] = [];

    for (
      let sectionIndex = 0;
      sectionIndex < filteredSections.length;
      sectionIndex++
    ) {
      const section = filteredSections[sectionIndex];
      if (section) {
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
                backgroundColor: `${section.color}80`,
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
            const { commonName: book, customColor: bookCustomColor } = bookInfo;
            const bookStaticInfo =
              BibleVizDataRepository.getBookStaticInfo(book);
            if (bookStaticInfo) {
              const {
                abbreviation: bookId,
                startingIndex = 0,
                numberOfChapters,
              } = bookStaticInfo;
              const color =
                bookCustomColor ??
                sectionLevelColorMap.get(levelColorsKey)?.toReversed()[
                  bookIndex
                ] ??
                "#000000";
              const readingEvents: ReadingEvent[] =
                rangedReadingEventsByBook.get(bookId) ?? [];
              const summary = calculateReadingHistorySummary(readingEvents);

              let isPsalms = false;
              let psalmChaptersLimits: Range | undefined;
              if (psalmsNames.includes(book)) {
                isPsalms = true;
                psalmChaptersLimits = {
                  start: startingIndex + 1,
                  end: startingIndex + numberOfChapters,
                };
              }

              const bookUserPresence: BookUserPresence = {};
              const userPresenceColors: HexString[] = [];

              let borderGradientColors: React.CSSProperties["backgroundImage"];
              if (isUserPresenceEnabled) {
                userPresence.forEach((data, userId) => {
                  const {
                    chapter: userPresenceChapter,
                    bookId: userPresenceBookId,
                  } = data;
                  if (
                    userPresenceBookId === bookId ||
                    (userPresenceBookId === "PSA" &&
                      isPsalms &&
                      psalmChaptersLimits &&
                      userPresenceChapter >= psalmChaptersLimits.start &&
                      userPresenceChapter <= psalmChaptersLimits.end)
                  ) {
                    const userPresenceColor =
                      userColorStore.getUserColor({ configId: userId }) ??
                      "#000000";
                    bookUserPresence[userId] = {
                      chapter: userPresenceChapter,
                      borderColor: userPresenceColor,
                    };
                    userPresenceColors.push(userPresenceColor);
                  }
                });
                if (userPresenceColors.length > 0)
                  borderGradientColors = ComputeRawGradientColors({
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
            }
          });
          elements.push(<BooksContainer>{books}</BooksContainer>);
        }
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
    usersColors,
    userPresence,
  ]);

  return (
    <div className={`testament-content${hidden ? " hidden" : ""}`}>
      {sections}
    </div>
  );
});
