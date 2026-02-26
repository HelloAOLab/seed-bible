import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";
import { Chapter } from "scriptureMap2D.main.Chapter";
import { useTestamentContext } from "scriptureMap2D.main.TestamentContext";
import { useClickAndHold } from "scriptureMap2D.main.CustomHooks";
import {
  Tooltip,
  ReadingHistoryTooltipContent,
  UserPresenceTooltipContent,
} from "scriptureMap2D.main.Tooltip";
import { useReadingHistoryContext } from "scriptureMap2D.main.ReadingHistoryContext";
import {
  calculateReadingHistorySummary,
  type ReadingEvent,
  type ReadingHistorySummary,
} from "db.annotations.library";
import { useSideBarContext } from "app.hooks.sideBar";
import { userColorStore } from "bibleVizUtils.services.UserColorStore";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
import type { BookStaticInfo } from "bibleVizUtils.data.BibleVizDataRepository";
import type { Range, TooltipAnchor, BookType } from "scriptureMap2D.main.types";
import {
  GetHistoryColorByReadingTime,
  GetHistoryColorByRecency,
  GetHistoryColorLinearGradient,
  GetTextColorBasedOnBackground,
  IsValueBetween,
  GetUserPresenceBorderGradientColors,
  type HexString,
  type WeightedColor,
} from "bibleVizUtils.functions.index";
import { scriptureService } from "bibleVizUtils.services.index";

const { useMemo, useState, useEffect } = os.appHooks;
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
    const { t } = useSideBarContext();
    const {
      scaleFactor,
      showingAllChapters,
      isUserPresenceEnabled,
      isReadingHistoryEnabled,
      content,
      userPresence,
      usersColors,
      selection,
      onBookNameClickAndHold,
      onBookNameClickAndHoldDependencies,
      chapterGap,
      chapterHeight,
      BASE_BACKGROUND_COLOR,
      showingBooksColors,
      activeTab,
    } = useScriptureMap2DContext();
    const { testament } = useTestamentContext();
    const {
      readingHistoryRangeSeconds,
      MS_PER_SECOND,
      SEC_PER_DAY,
      SEC_PER_HOUR,
      SEC_PER_MINUTE,
    } = useReadingHistoryContext();

    const [showChapters, setShowChapters] =
      useState<boolean>(showingAllChapters);
    const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

    const { tooltipAnchor } = useMemo<{
      tooltipAnchor: TooltipAnchor | undefined;
    }>(() => {
      let tooltipAnchor: TooltipAnchor | undefined;

      if (containerRect) {
        tooltipAnchor = {
          x: containerRect.left + containerRect.width / 2,
          y: containerRect.top,
          width: containerRect.width,
          height: containerRect.height,
        };
      }

      return { tooltipAnchor };
    }, [containerRect]);

    const bookStaticInfo = useMemo<BookStaticInfo | undefined>(() => {
      return BibleVizDataRepository.getBookStaticInfo(book);
    }, []);

    if (!bookStaticInfo)
      throw new Error(`Book static info not found at Book.tsx`);

    const { chaptersCount, staticChaptersArray } = useMemo<{
      chaptersCount: number;
      staticChaptersArray: undefined[];
    }>(() => {
      const chaptersCount = bookStaticInfo.numberOfChapters;

      return {
        chaptersCount,
        staticChaptersArray: [...Array(chaptersCount)],
      };
    }, []);

    const bookCoverHeight = useMemo<string>(() => {
      const { chaptersInfo } = bookStaticInfo;
      const book2DMaxColumns =
        BibleVizDataRepository.getBibleLayoutMeasurement("Book2DMaxColumns");
      if (Array.isArray(book2DMaxColumns))
        throw new Error("book2DMaxColumns must be of type number");
      const amountOfRows = Math.ceil(chaptersInfo.length / book2DMaxColumns);
      const height =
        amountOfRows * chapterHeight + chapterGap * (amountOfRows - 1);

      return `${height}px`;
    }, [scaleFactor, chapterGap, chapterHeight]);

    const checked = useMemo(() => {
      return selection?.[testament.name]?.[sectionName]?.[book]?.every(
        (chapter) => {
          return chapter;
        }
      );
    }, [selection]);

    const { onHoldStart, onHoldEnd } = useClickAndHold({
      holdTime: 500,
      holdCompleteCallback: () => {
        const key = {
          testamentName: testament.name,
          sectionName,
          bookName: book,
        };
        onBookNameClickAndHold(showChapters, key, checked);
      },
      holdCancelCallback: () => {
        setShowChapters((prev) => !prev);
      },
      dependencies: [
        ...onBookNameClickAndHoldDependencies,
        checked,
        showChapters,
      ],
    });

    useEffect(() => {
      setShowChapters(showingAllChapters);
    }, [showingAllChapters]);

    const { fixedBackground, tooltipContent } = useMemo<{
      fixedBackground: React.CSSProperties["color"];
      tooltipContent: React.ReactNode[];
    }>(() => {
      const nowSeconds = Math.floor(os.localTime / 1000);

      let fixedBackground: React.CSSProperties["color"];
      const tooltipContent: React.ReactNode[] = [];
      if (
        isReadingHistoryEnabled &&
        readingSummary.totalTimeSpentReading > SEC_PER_MINUTE
      ) {
        const { users, totalTimeSpentReading } = readingSummary;
        const colors: WeightedColor[] = [];
        for (const userId in users) {
          const userSummary = users[userId];
          let userReadingTimeSeconds: number | undefined;
          let books: (typeof users)[string]["books"] | undefined;
          if (userSummary) {
            ({ totalTimeSpentReading: userReadingTimeSeconds, books } =
              userSummary);
            let color: HexString | undefined = undefined;
            const baseColor = BASE_BACKGROUND_COLOR;
            const userColor = userColorStore.getUserColor({ authId: userId });
            const isTimeSpentNoticeable =
              userReadingTimeSeconds > SEC_PER_MINUTE; // more than a minute

            if (isTimeSpentNoticeable) {
              if (readingHistoryRangeSeconds) {
                color = GetHistoryColorByReadingTime({
                  baseColor,
                  userColor,
                  readingTimeSeconds: userReadingTimeSeconds,
                  step: 0.25,
                  fullColorTimeSeconds: 3600, // 1 hour
                });
                let fixedContent: string;
                if (userReadingTimeSeconds >= SEC_PER_HOUR) {
                  // more than an hour
                  const hoursCount = Math.floor(
                    userReadingTimeSeconds / SEC_PER_HOUR
                  );
                  fixedContent =
                    hoursCount > 1
                      ? t("spentHours", { count: hoursCount })
                      : t("spentHour", { count: hoursCount });
                } else {
                  const minutesCount = Math.floor(
                    userReadingTimeSeconds / SEC_PER_MINUTE
                  );
                  fixedContent =
                    minutesCount > 1
                      ? t("spentMinutes", { count: minutesCount })
                      : t("spentMinute", { count: minutesCount });
                }

                tooltipContent.push(
                  <ReadingHistoryTooltipContent
                    userId={userId}
                    fixedContent={fixedContent}
                  />
                );
              } else {
                let lastEntry;
                const bookSummary = books[bookId];
                if (bookSummary) {
                  const { chapters } = bookSummary;
                  for (const chapter in chapters) {
                    const events = chapters[chapter];
                    if (events) {
                      for (const event of events) {
                        const { start, end } = event;
                        const isEventTimeSpentNoticeable =
                          end - start >= SEC_PER_MINUTE;
                        const recencySeconds = nowSeconds - end;
                        const isRecentEnough =
                          end >=
                          BibleVizDataRepository.getReadingHistoryRecencyThresholdTimeSeconds();
                        const isNotTooRecent = recencySeconds >= SEC_PER_MINUTE;
                        if (
                          isEventTimeSpentNoticeable &&
                          isRecentEnough &&
                          isNotTooRecent &&
                          (!lastEntry || event.end > lastEntry.end)
                        ) {
                          lastEntry = event;
                        }
                      }
                    }
                  }
                }
                if (lastEntry) {
                  const { end } = lastEntry;
                  const recencySeconds = nowSeconds - end;
                  color = GetHistoryColorByRecency({
                    recencyTimeSeconds: end,
                    baseColor,
                    userColor,
                  });
                  let fixedContent: string;
                  if (recencySeconds >= SEC_PER_DAY) {
                    const daysCount = Math.floor(recencySeconds / SEC_PER_DAY);
                    fixedContent =
                      daysCount > 1
                        ? t("readDaysAgo", { count: daysCount })
                        : t("readDayAgo", { count: daysCount });
                  } else if (recencySeconds >= SEC_PER_HOUR) {
                    const hoursCount = Math.floor(
                      recencySeconds / SEC_PER_HOUR
                    );
                    fixedContent =
                      hoursCount > 1
                        ? t("readHoursAgo", { count: hoursCount })
                        : t("readHourAgo", { count: hoursCount });
                  } else {
                    const minutesCount = Math.floor(
                      recencySeconds / SEC_PER_MINUTE
                    );
                    fixedContent =
                      minutesCount > 1
                        ? t("readMinutesAgo", { count: minutesCount })
                        : t("readMinuteAgo", { count: minutesCount });
                  }
                  tooltipContent.push(
                    <ReadingHistoryTooltipContent
                      userId={userId}
                      fixedContent={fixedContent}
                    />
                  );
                }
              }
            }
            if (color) {
              const value = userReadingTimeSeconds / totalTimeSpentReading;
              colors.push({ color, value });
            }
          }
        }
        if (colors.length > 0) {
          fixedBackground = GetHistoryColorLinearGradient(colors);
        }
      } else {
        if (showingBooksColors) {
          fixedBackground = bookCoverBackgroundColor;
        }
      }

      if (isUserPresenceEnabled) {
        if (bookUserPresenceColors.length > 0) {
          tooltipContent.unshift(
            <UserPresenceTooltipContent colors={bookUserPresenceColors} />
          );
        }
      }

      return {
        fixedBackground,
        tooltipContent,
      };
    }, [
      chaptersCount,
      content,
      bookCoverBackgroundColor,
      showChapters,
      readingSummary,
      isReadingHistoryEnabled,
      readingHistoryRangeSeconds,
      showingBooksColors,
      BASE_BACKGROUND_COLOR,
    ]);

    const chapterReadingHistorySummaryMap = useMemo<
      Map<number, ReadingHistorySummary>
    >(() => {
      const now = Date.now();
      const nowSeconds = Math.floor(now / 1000);
      const effectiveRange: Range = readingHistoryRangeSeconds ?? {
        start:
          BibleVizDataRepository.getReadingHistoryRecencyThresholdTimeSeconds(),
        end: nowSeconds,
      };
      const chapterEntriesMap: Map<number, ReadingEvent[]> = new Map();

      for (const readingEvent of readingEvents) {
        const { chapter, start } = readingEvent;
        if (
          IsValueBetween({
            value: start,
            min: effectiveRange.start,
            max: effectiveRange.end,
          })
        ) {
          if (!chapterEntriesMap.has(chapter)) {
            chapterEntriesMap.set(chapter, []);
          }
          chapterEntriesMap.get(chapter)?.push(readingEvent);
        }
      }

      const summaryMap: Map<number, ReadingHistorySummary> = new Map();

      for (const [chapter, events] of chapterEntriesMap) {
        const summary = calculateReadingHistorySummary(events);
        summaryMap.set(chapter, summary);
      }

      return summaryMap;
    }, [readingEvents, readingHistoryRangeSeconds]);

    const chapters = useMemo<React.ReactNode[]>(() => {
      if (!showChapters) return [];

      const now = Date.now();
      const nowSeconds = Math.floor(now / MS_PER_SECOND);
      const baseColor = BASE_BACKGROUND_COLOR;

      return staticChaptersArray.map((_, index) => {
        let chapter = index + 1;

        const chapterSummary = chapterReadingHistorySummaryMap.get(chapter);
        let historyBackground: React.CSSProperties["color"];
        let historyColor: React.CSSProperties["color"];
        const tooltipContent: React.ReactNode[] = [];
        const colors: WeightedColor[] = [];

        if (isReadingHistoryEnabled) {
          if (chapterSummary) {
            const { users, totalTimeSpentReading: chapterReadingTimeSeconds } =
              chapterSummary;
            for (const userId in users) {
              let color: HexString | undefined = undefined;
              const userColor = userColorStore.getUserColor({ authId: userId });
              const userSummary = users[userId];
              if (userSummary) {
                const { totalTimeSpentReading: userReadingTimeSeconds } =
                  userSummary;

                const isTimeSpentNoticeable =
                  userReadingTimeSeconds >= SEC_PER_MINUTE; // more than a minute

                if (isTimeSpentNoticeable) {
                  if (readingHistoryRangeSeconds) {
                    color = GetHistoryColorByReadingTime({
                      baseColor,
                      userColor,
                      readingTimeSeconds: userReadingTimeSeconds,
                      step: 0.25,
                    });

                    let fixedContent: string | undefined;
                    if (userReadingTimeSeconds >= SEC_PER_HOUR) {
                      // more than an hour
                      const hoursCount = Math.floor(
                        userReadingTimeSeconds / SEC_PER_HOUR
                      );
                      fixedContent =
                        hoursCount > 1
                          ? t("spentHours", { count: hoursCount })
                          : t("spentHour", { count: hoursCount });
                    } else {
                      const minutesCount = Math.floor(
                        userReadingTimeSeconds / SEC_PER_MINUTE
                      );
                      fixedContent =
                        minutesCount > 1
                          ? t("spentMinutes", { count: minutesCount })
                          : t("spentMinute", { count: minutesCount });
                    }

                    tooltipContent.push(
                      <ReadingHistoryTooltipContent
                        userId={userId}
                        fixedContent={fixedContent}
                      />
                    );
                  } else {
                    let lastValidEvent: ReadingEvent | undefined = undefined;
                    let recencySeconds: number = 0;
                    const userBooks = userSummary.books[bookId];
                    if (userBooks) {
                      const chapterReadingEvents = userBooks.chapters[chapter];
                      if (chapterReadingEvents) {
                        for (
                          let eventIndex = chapterReadingEvents.length - 1;
                          eventIndex >= 0;
                          eventIndex--
                        ) {
                          const event = chapterReadingEvents[eventIndex];
                          if (event) {
                            const { start, end } = event;
                            const isEventTimeSpentNoticeable =
                              end - start >= SEC_PER_MINUTE;
                            const currRecencySeconds = nowSeconds - event.end;
                            const isRecentEnough =
                              event.end >=
                              BibleVizDataRepository.getReadingHistoryRecencyThresholdTimeSeconds();
                            const isNotTooRecent =
                              currRecencySeconds >= SEC_PER_MINUTE;

                            if (
                              isEventTimeSpentNoticeable &&
                              isRecentEnough &&
                              isNotTooRecent
                            ) {
                              lastValidEvent = event;
                              recencySeconds = currRecencySeconds;
                              break;
                            }
                          }
                        }
                      }
                    }
                    if (lastValidEvent) {
                      color = GetHistoryColorByRecency({
                        recencyTimeSeconds: lastValidEvent.end,
                        baseColor,
                        userColor,
                      });
                      let fixedContent: string | undefined;
                      if (recencySeconds >= SEC_PER_DAY) {
                        const daysCount = Math.floor(
                          recencySeconds / SEC_PER_DAY
                        );
                        fixedContent =
                          daysCount > 1
                            ? t("readDaysAgo", { count: daysCount })
                            : t("readDayAgo", { count: daysCount });
                      } else if (recencySeconds >= SEC_PER_HOUR) {
                        const hoursCount = Math.floor(
                          recencySeconds / SEC_PER_HOUR
                        );
                        fixedContent =
                          hoursCount > 1
                            ? t("readHoursAgo", { count: hoursCount })
                            : t("readHourAgo", { count: hoursCount });
                      } else {
                        const minutesCount = Math.floor(
                          recencySeconds / SEC_PER_MINUTE
                        );
                        fixedContent =
                          minutesCount > 1
                            ? t("readMinutesAgo", { count: minutesCount })
                            : t("readMinuteAgo", { count: minutesCount });
                      }
                      tooltipContent.push(
                        <ReadingHistoryTooltipContent
                          userId={userId}
                          fixedContent={fixedContent}
                        />
                      );
                    }
                  }
                }
                if (color) {
                  const value =
                    userReadingTimeSeconds / chapterReadingTimeSeconds;
                  colors.push({ color, value });
                }
              }
            }
          }

          if (colors.length > 0) {
            historyBackground = GetHistoryColorLinearGradient(colors);
            historyColor = GetTextColorBasedOnBackground({
              backgroundColor: colors,
            });
          }
        }

        if (isPsalms) {
          ({ chapter } = scriptureService.convertDividedPsalmsToComplete({
            book,
            chapter,
          }));
        }

        const userPresenceColors: HexString[] = [];
        let borderGradientColors: React.CSSProperties["background"];
        if (isUserPresenceEnabled) {
          for (const user in bookUserPresence) {
            const userPresenceItem = bookUserPresence[user];
            if (userPresenceItem) {
              const { chapter: userChapter, borderColor: userBorderColor } =
                userPresenceItem;
              if (chapter === userChapter) {
                userPresenceColors.push(userBorderColor);
              }
            }
          }
          if (userPresenceColors.length > 0) {
            borderGradientColors = GetUserPresenceBorderGradientColors({
              colors: userPresenceColors,
              diffuse: 15,
            });
            tooltipContent.unshift(
              <UserPresenceTooltipContent colors={userPresenceColors} />
            );
          }
        }

        return (
          <Chapter
            key={`${bookId}-${chapter}`}
            sectionName={sectionName}
            bookName={book}
            chapter={chapter}
            borderGradientColors={borderGradientColors}
            index={index}
            historyBackground={historyBackground}
            historyColor={historyColor}
            tooltipContent={tooltipContent}
          />
        );
      });
    }, [
      isReadingHistoryEnabled,
      isUserPresenceEnabled,
      chapterReadingHistorySummaryMap,
      readingHistoryRangeSeconds,
      activeTab,
      userPresence,
      usersColors,
      showChapters,
      BASE_BACKGROUND_COLOR,
    ]);

    return (
      <div
        className={`book-container${showChapters ? "" : " pointable"}`}
        onClick={() => {
          if (!showChapters) setShowChapters(true);
        }}
      >
        <div
          className="book-header"
          onPointerDown={(e) => {
            e.stopPropagation();
            onHoldStart(e);
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            onHoldEnd(e);
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <span className="book-id">{scaleFactor > 0.5 ? book : bookId}</span>
        </div>
        <div
          className={`book-cover${showChapters ? " invisible" : isUserPresenceEnabled && bookBorderGradientColors ? " show-user-presence" : ""}`}
          onPointerEnter={(e) =>
            setContainerRect(e.currentTarget.getBoundingClientRect())
          }
          onPointerLeave={() => setContainerRect(null)}
          style={{
            "--bookUserPresenceColors": bookBorderGradientColors,
            minHeight: bookCoverHeight,
            background: fixedBackground,
          }}
        >
          {showChapters ? (
            chapters
          ) : (isReadingHistoryEnabled || isUserPresenceEnabled) &&
            tooltipAnchor &&
            tooltipContent?.length > 0 ? (
            <Tooltip
              anchor={tooltipAnchor}
              content={tooltipContent}
              offsetY={
                isUserPresenceEnabled && bookBorderGradientColors
                  ? scaleFactor * 6
                  : 0
              }
            />
          ) : null}
        </div>
      </div>
    );
  }
);
