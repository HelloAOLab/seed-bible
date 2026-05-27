import { useScriptureMapContext } from "scriptureMap.contexts.ScriptureMap.ScriptureMapContext";
import { useTestamentContext } from "scriptureMap.contexts.Testament.TestamentContext";
import { useReadingHistoryContext } from "scriptureMap.contexts.ReadingHistory.ReadingHistoryContext";
import type {
  TooltipContentData,
  TooltipAnchor,
} from "scriptureMap.components.containers.Tooltip";
import type {
  HexString,
  WeightedColor,
} from "bibleVizUtils.domain.models.commonTypes";
import {
  calculateReadingHistorySummary,
  type ReadingEvent,
  type ReadingHistorySummary,
} from "seed-bible.managers.ReadingHistoryManager";
import { useClickAndHold } from "scriptureMap.hooks.useClickAndHold";
import type {
  BookProps,
  ChapterData,
} from "scriptureMap.components.containers.Book";
import type { Range } from "scriptureMap.models.commonTypes";
import { getFirstNonSpaceChars } from "scriptureMap.functions.scripture";

const { useState, useMemo, useEffect, useCallback } = os.appHooks;

type UseBookProps = Pick<
  BookProps,
  | "book"
  | "bookId"
  | "numberOfChapters"
  | "chaptersVerseCount"
  | "isSubset"
  | "subsetStartIndex"
  | "bookCoverBackgroundColor"
  | "sectionName"
  | "readingEvents"
  | "readingSummary"
  | "bookUserPresence"
  | "bookUserPresenceColors"
  | "bookBorderGradientColors"
>;

interface UseBookType {
  showChapters: boolean;
  tooltipAnchor: TooltipAnchor | undefined;
  tooltipContentsData: TooltipContentData[];
  tooltipOffsetY: number;
  chaptersData: ChapterData[];
  bookTitle: string;
  bookClass: string;
  bookCoverClass: string;
  handleBookClick: () => void;
  handleBookHeaderPointerDown: (
    e: React.JSX.TargetedPointerEvent<HTMLDivElement>
  ) => void;
  handleBookHeaderPointerUp: (
    e: React.JSX.TargetedPointerEvent<HTMLDivElement>
  ) => void;
  handleBookHeaderClick: (
    e: React.JSX.TargetedPointerEvent<HTMLDivElement>
  ) => void;
  handleBookCoverPointerEnter: (
    e: React.JSX.TargetedPointerEvent<HTMLDivElement>
  ) => void;
  handleBookCoverPointerLeave: () => void;
  bookCoverStyle: React.CSSProperties;
  isReadingHistoryEnabled: boolean;
  isUserPresenceEnabled: boolean;
}

type UseBook = (props: UseBookProps) => UseBookType;

export const useBook: UseBook = (props) => {
  const {
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
  } = props;
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
    translate,
    userColorStore,
    readingHistoryService,
    GetTextColorBasedOnBackground,
    IsValueBetween,
    ComputeRawGradientColors,
    ComputeLinearGradient,
    scriptureMap3DConfigProvider,
    readingHistoryConfigProvider,
  } = useScriptureMapContext();
  const { testament } = useTestamentContext();
  const {
    readingHistoryRangeSeconds,
    MS_PER_SECOND,
    SEC_PER_DAY,
    SEC_PER_HOUR,
    SEC_PER_MINUTE,
    myAuthBotId,
  } = useReadingHistoryContext();

  const [showChapters, setShowChapters] = useState<boolean>(showingAllChapters);
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

  const tooltipOffsetY = useMemo<number>(() => {
    return isUserPresenceEnabled && bookBorderGradientColors
      ? scaleFactor * 6
      : 0;
  }, [isUserPresenceEnabled, bookBorderGradientColors, scaleFactor]);

  const { chaptersCount, staticChaptersArray } = useMemo<{
    chaptersCount: number;
    staticChaptersArray: undefined[];
  }>(() => {
    return {
      chaptersCount: numberOfChapters,
      staticChaptersArray: [...Array(numberOfChapters)],
    };
  }, [numberOfChapters]);

  const bookCoverHeight = useMemo<React.CSSProperties["height"]>(() => {
    const book2DMaxColumns =
      scriptureMap3DConfigProvider.getBibleLayoutMeasurement(
        "Book2DMaxColumns"
      );
    // if (Array.isArray(book2DMaxColumns))
    //   throw new Error("book2DMaxColumns must be of type number");
    const amountOfRows = Math.ceil(
      chaptersVerseCount.length / book2DMaxColumns
    );
    const height =
      amountOfRows * chapterHeight + chapterGap * (amountOfRows - 1);

    return `${height}px`;
  }, [chaptersVerseCount, scaleFactor, chapterGap, chapterHeight]);

  const checked = useMemo(() => {
    const bookSelection =
      selection?.[testament.name]?.[sectionName]?.[bookId] ?? [];
    return (
      bookSelection?.length > 0 &&
      bookSelection.every((chapter) => {
        return chapter;
      })
    );
  }, [selection]);

  const { onHoldStart, onHoldEnd } = useClickAndHold({
    holdTime: 500,
    holdCompleteCallback: () => {
      const key = {
        testamentName: testament.name,
        sectionName,
        bookId,
      };
      onBookNameClickAndHold?.(showChapters, key, checked);
    },
    holdCancelCallback: () => {
      setShowChapters((prev) => !prev);
    },
    dependencies: [
      ...(onBookNameClickAndHoldDependencies ?? []),
      checked,
      showChapters,
    ],
  });

  useEffect(() => {
    setShowChapters(showingAllChapters);
  }, [showingAllChapters]);

  const { fixedBackground, tooltipContentsData } = useMemo<{
    fixedBackground: React.CSSProperties["color"];
    tooltipContentsData: UseBookType["tooltipContentsData"];
  }>(() => {
    const nowSeconds = Math.floor(os.localTime / 1000);

    let fixedBackground: React.CSSProperties["color"];
    const tooltipContentsData: UseBookType["tooltipContentsData"] = [];
    if (
      isReadingHistoryEnabled &&
      readingSummary.totalTimeSpentReading > SEC_PER_MINUTE
    ) {
      const { users, totalTimeSpentReading } = readingSummary;
      const colors: WeightedColor[] = [];
      for (const userId in users) {
        const userSummary = users[userId];
        const isMe = userId === myAuthBotId;
        const userName = isMe ? translate("you") : translate("guest");
        let userReadingTimeSeconds: number | undefined;
        let books: (typeof users)[string]["books"] | undefined;
        if (userSummary) {
          ({ totalTimeSpentReading: userReadingTimeSeconds, books } =
            userSummary);
          let color: HexString | undefined = undefined;
          const baseColor = BASE_BACKGROUND_COLOR;
          const userColor = userColorStore.getUserColor({ authId: userId });
          const dotStyle = { backgroundColor: userColor };
          const isTimeSpentNoticeable = userReadingTimeSeconds > SEC_PER_MINUTE; // more than a minute

          if (userColor) {
            if (isTimeSpentNoticeable) {
              if (readingHistoryRangeSeconds) {
                color = readingHistoryService.getColorByReadingTime({
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
                      ? translate("hours-spent", { count: hoursCount })
                      : translate("hour-spent", { count: hoursCount });
                } else {
                  const minutesCount = Math.floor(
                    userReadingTimeSeconds / SEC_PER_MINUTE
                  );
                  fixedContent =
                    minutesCount > 1
                      ? translate("minutes-spent", { count: minutesCount })
                      : translate("minute-spent", { count: minutesCount });
                }

                tooltipContentsData.push({
                  type: "readingHistory",
                  fixedContent: fixedContent,
                  userName,
                  dotStyle,
                });
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
                          readingHistoryConfigProvider.getRecencyThresholdTimeSeconds();
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
                  color = readingHistoryService.getColorByRecency({
                    recencyTimeSeconds: end,
                    baseColor,
                    userColor,
                  });
                  let fixedContent: string;
                  if (recencySeconds >= SEC_PER_DAY) {
                    const daysCount = Math.floor(recencySeconds / SEC_PER_DAY);
                    fixedContent =
                      daysCount > 1
                        ? translate("read-days-ago", { count: daysCount })
                        : translate("read-day-ago", { count: daysCount });
                  } else if (recencySeconds >= SEC_PER_HOUR) {
                    const hoursCount = Math.floor(
                      recencySeconds / SEC_PER_HOUR
                    );
                    fixedContent =
                      hoursCount > 1
                        ? translate("read-hours-ago", { count: hoursCount })
                        : translate("read-hour-ago", { count: hoursCount });
                  } else {
                    const minutesCount = Math.floor(
                      recencySeconds / SEC_PER_MINUTE
                    );
                    fixedContent =
                      minutesCount > 1
                        ? translate("read-minutes-ago", { count: minutesCount })
                        : translate("read-minute-ago", { count: minutesCount });
                  }
                  tooltipContentsData.push({
                    type: "readingHistory",
                    fixedContent: fixedContent,
                    userName,
                    dotStyle,
                  });
                }
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
        fixedBackground = ComputeLinearGradient(colors);
      }
    } else {
      if (showingBooksColors) {
        fixedBackground = bookCoverBackgroundColor;
      }
    }

    if (isUserPresenceEnabled) {
      if (bookUserPresenceColors.length > 0) {
        tooltipContentsData.unshift({
          type: "userPresence",
          colors: bookUserPresenceColors,
          labelText: translate("reading-now"),
        });
      }
    }

    return {
      fixedBackground,
      tooltipContentsData,
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
    myAuthBotId,
    translate,
  ]);

  const chapterReadingHistorySummaryMap = useMemo<
    Map<number, ReadingHistorySummary>
  >(() => {
    const now = Date.now();
    const nowSeconds = Math.floor(now / 1000);
    const effectiveRange: Range = readingHistoryRangeSeconds ?? {
      start: readingHistoryConfigProvider.getRecencyThresholdTimeSeconds(),
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

  const chaptersData = useMemo<UseBookType["chaptersData"]>(() => {
    if (!showChapters) return [];

    const now = Date.now();
    const nowSeconds = Math.floor(now / MS_PER_SECOND);
    const baseColor = BASE_BACKGROUND_COLOR;

    return staticChaptersArray.map((_, index) => {
      const displayedChapter = index + 1;
      let chapter = displayedChapter;

      const chapterSummary = chapterReadingHistorySummaryMap.get(chapter);
      let historyBackground: React.CSSProperties["color"];
      let historyColor: React.CSSProperties["color"];
      const tooltipContentsData: ChapterData["tooltipContentsData"] = [];
      const colors: WeightedColor[] = [];

      if (isReadingHistoryEnabled) {
        if (chapterSummary) {
          const { users, totalTimeSpentReading: chapterReadingTimeSeconds } =
            chapterSummary;
          for (const userId in users) {
            const isMe = userId === myAuthBotId;
            const userName = isMe ? translate("you") : translate("guest");
            let color: HexString | undefined = undefined;
            const userColor = userColorStore.getUserColor({ authId: userId });
            const dotStyle = { backgroundColor: userColor };
            const userSummary = users[userId];
            if (userSummary) {
              const { totalTimeSpentReading: userReadingTimeSeconds } =
                userSummary;

              const isTimeSpentNoticeable =
                userReadingTimeSeconds >= SEC_PER_MINUTE; // more than a minute

              if (userColor) {
                if (isTimeSpentNoticeable) {
                  if (readingHistoryRangeSeconds) {
                    color = readingHistoryService.getColorByReadingTime({
                      baseColor,
                      userColor,
                      readingTimeSeconds: userReadingTimeSeconds,
                      step: 0.25,
                    });

                    let fixedContent: string;
                    if (userReadingTimeSeconds >= SEC_PER_HOUR) {
                      // more than an hour
                      const hoursCount = Math.floor(
                        userReadingTimeSeconds / SEC_PER_HOUR
                      );
                      fixedContent =
                        hoursCount > 1
                          ? translate("hours-spent", { count: hoursCount })
                          : translate("hour-spent", { count: hoursCount });
                    } else {
                      const minutesCount = Math.floor(
                        userReadingTimeSeconds / SEC_PER_MINUTE
                      );
                      fixedContent =
                        minutesCount > 1
                          ? translate("minutes-spent", { count: minutesCount })
                          : translate("minute-spent", { count: minutesCount });
                    }

                    tooltipContentsData.push({
                      type: "readingHistory",
                      userName,
                      dotStyle,
                      fixedContent: fixedContent,
                    });
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
                              readingHistoryConfigProvider.getRecencyThresholdTimeSeconds();
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
                      color = readingHistoryService.getColorByRecency({
                        recencyTimeSeconds: lastValidEvent.end,
                        baseColor,
                        userColor,
                      });
                      let fixedContent: string;
                      if (recencySeconds >= SEC_PER_DAY) {
                        const daysCount = Math.floor(
                          recencySeconds / SEC_PER_DAY
                        );
                        fixedContent =
                          daysCount > 1
                            ? translate("read-days-ago", { count: daysCount })
                            : translate("read-day-ago", { count: daysCount });
                      } else if (recencySeconds >= SEC_PER_HOUR) {
                        const hoursCount = Math.floor(
                          recencySeconds / SEC_PER_HOUR
                        );
                        fixedContent =
                          hoursCount > 1
                            ? translate("read-hours-ago", { count: hoursCount })
                            : translate("read-hour-ago", { count: hoursCount });
                      } else {
                        const minutesCount = Math.floor(
                          recencySeconds / SEC_PER_MINUTE
                        );
                        fixedContent =
                          minutesCount > 1
                            ? translate("read-minutes-ago", {
                                count: minutesCount,
                              })
                            : translate("read-minute-ago", {
                                count: minutesCount,
                              });
                      }
                      tooltipContentsData.push({
                        type: "readingHistory",
                        userName,
                        dotStyle,
                        fixedContent: fixedContent,
                      });
                    }
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
          historyBackground = ComputeLinearGradient(colors);
          historyColor = GetTextColorBasedOnBackground({
            backgroundColor: colors,
          });
        }
      }

      if (isSubset) {
        chapter = chapter + (subsetStartIndex ?? 0);
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
          borderGradientColors = ComputeRawGradientColors({
            colors: userPresenceColors,
            diffuse: 15,
          });
          tooltipContentsData.unshift({
            type: "userPresence",
            colors: userPresenceColors,
            labelText: translate("reading-now"),
          });
        }
      }

      return {
        key: `${bookId}-${displayedChapter}`,
        sectionName: sectionName,
        bookId,
        chapter: displayedChapter,
        borderGradientColors: borderGradientColors,
        index: index,
        historyBackground: historyBackground,
        historyColor: historyColor,
        tooltipContentsData: tooltipContentsData,
      };
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
    translate,
    bookId,
    subsetStartIndex,
  ]);

  // useEffect(() => {
  //   console.log(`[Debug] useBook`, {
  //     chaptersData, bookId, subsetStartIndex, isSubset
  //   })
  // }, [chaptersData, bookId, subsetStartIndex, isSubset])

  const bookTitle = useMemo<string>(() => {
    return scaleFactor > 0.5 ? book : getFirstNonSpaceChars(book).toUpperCase();
  }, [scaleFactor, book]);

  const bookClass = useMemo<string>(() => {
    return `book-container${showChapters ? "" : " pointable"}`;
  }, [showChapters]);

  const bookCoverClass = useMemo<string>(() => {
    return `book-cover${showChapters ? " invisible" : isUserPresenceEnabled && bookBorderGradientColors ? " show-user-presence" : ""}`;
  }, [showChapters, isUserPresenceEnabled, bookBorderGradientColors]);

  // useEffect(() => {
  //   console.log(`[Debug] useBook`, {
  //     isUserPresenceEnabled,
  //     bookBorderGradientColors,
  //     book
  //   })
  // }, [isUserPresenceEnabled, bookBorderGradientColors, book])

  const handleBookClick = useCallback<() => void>(() => {
    if (!showChapters) setShowChapters(true);
  }, [showChapters, setShowChapters]);

  const handleBookHeaderPointerDown = useCallback<
    UseBookType["handleBookHeaderPointerDown"]
  >(
    (e) => {
      e.stopPropagation();
      onHoldStart(e);
    },
    [onHoldStart]
  );

  const handleBookHeaderPointerUp = useCallback<
    UseBookType["handleBookHeaderPointerUp"]
  >(
    (e) => {
      e.stopPropagation();
      onHoldEnd(e);
    },
    [onHoldEnd]
  );

  const handleBookHeaderClick = useCallback<
    UseBookType["handleBookHeaderClick"]
  >((e) => {
    e.stopPropagation();
  }, []);

  const handleBookCoverPointerEnter = useCallback<
    UseBookType["handleBookCoverPointerEnter"]
  >(
    (e) => {
      setContainerRect(e.currentTarget.getBoundingClientRect());
    },
    [setContainerRect]
  );

  const handleBookCoverPointerLeave = useCallback<
    UseBookType["handleBookCoverPointerLeave"]
  >(() => {
    setContainerRect(null);
  }, [setContainerRect]);

  const bookCoverStyle = useMemo<React.CSSProperties>(() => {
    return {
      "--bookUserPresenceColors": bookBorderGradientColors,
      minHeight: bookCoverHeight,
      background: fixedBackground,
    };
  }, [bookCoverHeight, fixedBackground, bookBorderGradientColors]);

  return {
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
  };
};
