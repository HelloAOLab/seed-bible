import { useTestamentContext } from "scriptureMap2D.contexts.Testament.TestamentContext";
import { useScriptureMap2DContext } from "scriptureMap2D.contexts.ScriptureMap2D.ScriptureMap2DContext";
import { useReadingHistoryContext } from "scriptureMap2D.contexts.ReadingHistory.ReadingHistoryContext";
import {
  calculateReadingHistorySummary,
  type ReadingEvent,
} from "seed-bible.managers.ReadingHistoryManager";
import type {
  SectionInfo,
  BookInfo,
} from "bibleVizUtils.domain.models.arrangement";
import type {
  SectionInfoConfig,
  BookInfoConfig,
} from "bibleVizUtils.infrastructure.models.arrangement";
import type { HexString } from "bibleVizUtils.domain.models.commonTypes";
import type {
  TestamentContentItemData,
  BookData,
} from "scriptureMap2D.components.containers.TestamentContent";
import type { Range } from "scriptureMap2D.models.commonTypes";
import { applyTranslationRule } from "bibleVizUtils.domain.functions.string";
import type { BookUserPresence } from "scriptureMap2D.components.containers.Book";
import type { SectionToggleProps } from "scriptureMap2D.components.containers.SectionToggle";

const { useMemo, useCallback, useState, useEffect } = os.appHooks;

type FilteredSection = {
  infra: SectionInfoConfig;
  domain: SectionInfo;
};

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
    sectionInfoMapper,
    arrangementService,
    HexToRgb,
    GetChildrenLevelColors,
    bookNames,
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

  const reversedSections = useMemo<SectionInfo[]>(() => {
    return testament.sections.toReversed();
  }, [testament]);

  const { filteredSections, sectionLevelColorMap } = useMemo(() => {
    const getLevelColorMap = (
      sections: FilteredSection[]
    ): Map<string, HexString[]> => {
      return new Map(
        sections.map(({ infra: section }, sectionIndex) => {
          const levelColorsKey = `${testamentIndex} ${sectionIndex}`;
          const sectionLevelsColors = GetChildrenLevelColors({
            sectionColorRGB: HexToRgb({ hexColor: section.color }),
            colorRange: section.customColorRange ?? 70,
            levelsLength: section.books.length,
          });
          return [levelColorsKey, sectionLevelsColors];
        })
      );
    };

    let filteredSections: FilteredSection[];

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
          const filteredInfraBooks: BookInfoConfig[] = [];
          const filteredDomainBooks: BookInfo[] = [];

          for (
            let bookIndex = 0;
            bookIndex < infraSection.books.length;
            bookIndex++
          ) {
            const bookConfig = infraSection.books[bookIndex];
            const bookDomain = section.books[bookIndex];

            if (bookConfig && bookDomain) {
              let bookEvents: ReadingEvent[] | undefined;
              if (bookDomain.type === "complete") {
                bookEvents = rangedReadingEventsByBook.get(bookDomain.bookId);
              } else {
                const rawBookEvents = rangedReadingEventsByBook.get(
                  bookDomain.completeBookId
                );
                if (rawBookEvents) {
                  bookEvents = rawBookEvents.filter(({ chapter }) => {
                    const startIndex = bookDomain.startIndex ?? 0;
                    const startingChapter = startIndex + 1;
                    const endChapter = startIndex + bookDomain.numberOfChapters;
                    return chapter >= startingChapter && chapter <= endChapter;
                  });
                }
              }
              if (bookEvents) {
                const readingTimeSeconds = bookEvents.reduce(
                  (acc, event) => acc + event.end - event.start,
                  0
                );
                if (readingTimeSeconds >= SEC_PER_MINUTE) {
                  filteredInfraBooks.push(bookConfig);
                  filteredDomainBooks.push(bookDomain);
                }
              }
            }
          }

          if (filteredInfraBooks.length > 0) {
            filteredSections.push({
              infra: { ...infraSection, books: filteredInfraBooks },
              domain: { ...section, books: filteredDomainBooks },
            });
          }
        }
      }
    } else {
      filteredSections = reversedSections.map((section) => ({
        infra: sectionInfoMapper.toInfrastructure(section),
        domain: section,
      }));
    }

    return {
      filteredSections,
      sectionLevelColorMap: getLevelColorMap(filteredSections),
    };
  }, [reversedSections, rangedReadingEventsByBook, readingHistoryRangeSeconds]);

  const [sectionsShown, setSectionsShown] = useState(
    new Map(
      filteredSections.map(({ domain: section }, sectionIndex) => {
        const key = `${testamentIndex}-${testament.name}-${sectionIndex}-${section.name}`;
        return [key, true];
      })
    )
  );

  useEffect(() => {
    const next = new Map(
      filteredSections.map(({ domain: section }, sectionIndex) => {
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
      const filteredSection = filteredSections[sectionIndex];
      if (filteredSection) {
        const { infra: infraSection, domain: domainSection } = filteredSection;
        const path = {
          arrangementName,
          testamentIndex,
          sectionIndex,
        };
        const sectionKey = `${testamentIndex}-${testament.name}-${sectionIndex}-${infraSection.name}`;
        const levelColorsKey = `${testamentIndex} ${sectionIndex}`;
        const reversedLevelColorMap = sectionLevelColorMap
          .get(levelColorsKey)
          ?.toReversed();
        const showingContent = sectionsShown.get(sectionKey);
        if (showSectionLabels) {
          items.push({
            key: `${arrangementIndex}-${testament.name}-${infraSection.name}`,
            section: { ...domainSection, path },
            sectionKey: sectionKey,
            toggleShowSection: toggleShowSection,
            showingContent: showingContent,
            style: {
              backgroundColor: `${infraSection.color}80`,
              borderColor: showingContent
                ? "var(--sb-primary-color)"
                : "transparent",
            },
            type: "sectionToggle",
          });
        }

        if (showingContent) {
          const reversedDomainBooks = domainSection.books.toReversed();
          const booksData: BookData[] = reversedDomainBooks.map(
            (bookDomain, bookIndex) => {
              const {
                bookId,
                numberOfChapters,
                customColor: bookCustomColor,
              } = bookDomain;

              const color =
                bookCustomColor ??
                reversedLevelColorMap?.[bookIndex] ??
                "#000000";

              let isSubset = false;
              let subsetChaptersLimits: Range | undefined;
              if (bookDomain.type === "subset") {
                isSubset = true;
                const startIndex = bookDomain.startIndex ?? 0;
                subsetChaptersLimits = {
                  start: startIndex + 1,
                  end: startIndex + numberOfChapters,
                };
              }

              const readingEvents: ReadingEvent[] = isSubset
                ? (rangedReadingEventsByBook
                    .get(
                      (
                        bookDomain as typeof bookDomain & {
                          completeBookId: string;
                        }
                      ).completeBookId
                    )
                    ?.filter(
                      ({ chapter }) =>
                        subsetChaptersLimits &&
                        chapter >= subsetChaptersLimits.start &&
                        chapter <= subsetChaptersLimits.end
                    ) ?? [])
                : (rangedReadingEventsByBook.get(bookId) ?? []);

              const summary = calculateReadingHistorySummary(readingEvents);

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
                    (bookDomain.type === "subset" &&
                      userPresenceBookId === bookDomain.completeBookId &&
                      subsetChaptersLimits &&
                      userPresenceChapter >= subsetChaptersLimits.start &&
                      userPresenceChapter <= subsetChaptersLimits.end)
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
              }

              return {
                isSubset,
                subsetStartIndex:
                  bookDomain.type === "subset"
                    ? (bookDomain.startIndex ?? 0)
                    : undefined,
                numberOfChapters: bookDomain.numberOfChapters,
                chaptersVerseCount: bookDomain.chaptersVerseCount,
                key: `book-${arrangementIndex}-${testament.name}-${infraSection.name}-${bookId}`,
                book:
                  bookDomain.type === "subset" && bookDomain.translationRule
                    ? applyTranslationRule(bookDomain.translationRule, {
                        name:
                          bookNames.value.get(bookDomain.completeBookId) ??
                          bookDomain.completeBookId,
                      })
                    : (bookNames.value.get(bookId) ?? bookId),
                bookId: bookId,
                bookCoverBackgroundColor: color,
                sectionName: infraSection.name,
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
    bookNames.value,
  ]);

  return {
    itemsData,
  };
};
