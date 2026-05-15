import { useTestamentContext } from "scriptureMap2D.contexts.Testament.TestamentContext";
import { useScriptureMap2DContext } from "scriptureMap2D.contexts.ScriptureMap2D.ScriptureMap2DContext";
import { useReadingHistoryContext } from "scriptureMap2D.contexts.ReadingHistory.ReadingHistoryContext";
import {
  calculateReadingHistorySummary,
  type ReadingEvent,
} from "seed-bible.managers.ReadingHistoryManager";
import type { SectionInfo as DomainSectionInfo } from "bibleVizUtils.domain.models.arrangement";
import type {
  SectionInfo as InfrastructureSectionInfo,
  BookInfo as InfrastructureBookInfo,
} from "bibleVizUtils.infrastructure.models.arrangement";
import type { HexString } from "bibleVizUtils.domain.models.commonTypes";
import type {
  TestamentContentItemData,
  BookData,
} from "scriptureMap2D.components.containers.TestamentContent";
import type { Range } from "scriptureMap2D.models.commonTypes";
import type { BookUserPresence } from "scriptureMap2D.components.containers.Book";
import type { SectionToggleProps } from "scriptureMap2D.components.containers.SectionToggle";

const { useMemo, useCallback, useState, useEffect } = os.appHooks;

const psalmsNames = [
  "1 Psalms",
  "2 Psalms",
  "3 Psalms",
  "4 Psalms",
  "5 Psalms",
];

interface UseTestamentContentType {
  itemsData: TestamentContentItemData[];
}

export const useTestamentContent = (): UseTestamentContentType => {
  const {
    arrangementIndex,
    showSectionLabels,
    isUserPresenceEnabled,
    activeTab,
    usersColors,
    userPresence,
    ComputeRawGradientColors,
    userColorStore,
    bibleVizDataRepository,
    sectionInfoMapper,
    arrangementService,
    HexToRgb,
    GetChildrenLevelColors,
  } = useScriptureMap2DContext();
  const {
    rangedReadingEventsByBook,
    readingHistoryRangeSeconds,
    SEC_PER_MINUTE,
  } = useReadingHistoryContext();
  const { testament, testamentIndex } = useTestamentContext();

  const arrangementName = useMemo(() => {
    const name =
      arrangementService.getArrangementByIndex(arrangementIndex)?.name;
    if (!name) {
      throw new Error(`useTestamentContent: Arrangement name not found`);
    }
    return name;
  }, [arrangementService, arrangementIndex]);

  const reversedSections = useMemo<DomainSectionInfo[]>(() => {
    return testament.sections.toReversed();
  }, [testament]);

  const { filteredSections, sectionLevelColorMap } = useMemo(() => {
    const getLevelColorMap: (
      sections: InfrastructureSectionInfo[]
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

    let filteredSections: undefined | InfrastructureSectionInfo[];

    if (readingHistoryRangeSeconds) {
      filteredSections = [];

      for (
        let sectionIndex = 0;
        sectionIndex < reversedSections.length;
        sectionIndex++
      ) {
        const section = reversedSections[sectionIndex];
        if (section) {
          const infraSection = sectionInfoMapper.toInfrastructure(section);
          const filteredBooks: InfrastructureBookInfo[] = [];
          for (
            let bookIndex = 0;
            bookIndex < infraSection.books.length;
            bookIndex++
          ) {
            const book = infraSection.books[bookIndex];
            if (book) {
              const bookStaticInfo = bibleVizDataRepository.getBookStaticInfo(
                book.commonName
              );
              if (bookStaticInfo) {
                const bookId = bookStaticInfo.bookId;
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
              ...infraSection,
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

  const toggleShowSection = useCallback<
    SectionToggleProps["toggleShowSection"]
  >(
    (sectionKey) => {
      const copy = new Map(sectionsShown);
      copy.set(sectionKey, !copy.get(sectionKey));
      setSectionsShown(copy);
    },
    [sectionsShown]
  );

  const itemsData = useMemo<UseTestamentContentType["itemsData"]>(() => {
    const items: UseTestamentContentType["itemsData"] = [];

    for (
      let sectionIndex = 0;
      sectionIndex < filteredSections.length;
      sectionIndex++
    ) {
      const section = filteredSections[sectionIndex];
      if (section) {
        const path = {
          arrangementName,
          testamentIndex,
          sectionIndex,
        };
        const domainSection = sectionInfoMapper.toDomain(section, path);
        const sectionKey = `${testamentIndex}-${testament.name}-${sectionIndex}-${section.name}`;
        const levelColorsKey = `${testamentIndex} ${sectionIndex}`;
        const reversedLevelColorMap = sectionLevelColorMap
          .get(levelColorsKey)
          ?.toReversed();
        const showingContent = sectionsShown.get(sectionKey);
        if (showSectionLabels) {
          items.push({
            key: `${arrangementIndex}-${testament.name}-${section.name}`,
            section: domainSection,
            sectionKey: sectionKey,
            toggleShowSection: toggleShowSection,
            showingContent: showingContent,
            style: {
              backgroundColor: `${section.color}80`,
              borderColor: showingContent
                ? "var(--sb-primary-color)"
                : "transparent",
            },
            type: "sectionToggle",
          });
        }
        const reversedBooks = section.books.toReversed();
        if (showingContent) {
          const booksData: BookData[] = reversedBooks.map(
            (bookInfo, bookIndex) => {
              const { commonName: book, customColor: bookCustomColor } =
                bookInfo;
              const bookStaticInfo =
                bibleVizDataRepository.getBookStaticInfo(book);
              if (!bookStaticInfo) {
                throw new Error(
                  "useTestamentContent: bookStaticInfo not found."
                );
              }
              const {
                bookId: bookId,
                startingIndex = 0,
                numberOfChapters,
              } = bookStaticInfo;
              const color =
                bookCustomColor ??
                reversedLevelColorMap?.[bookIndex] ??
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

              return {
                isPsalms: isPsalms,
                key: `book-${arrangementIndex}-${testament.name}-${section.name}-${bookInfo.commonName}`,
                book: book,
                bookId: bookId,
                bookCoverBackgroundColor: color,
                sectionName: section.name,
                readingEvents: readingEvents,
                readingSummary: summary,
                bookBorderGradientColors: borderGradientColors,
                bookUserPresence: bookUserPresence,
                bookUserPresenceColors: userPresenceColors,
              };
            }
          );
          items.push({
            type: "booksContainer",
            content: booksData,
          });
        }
      }
    }

    return items;
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
    toggleShowSection,
  ]);

  return {
    itemsData,
  };
};
