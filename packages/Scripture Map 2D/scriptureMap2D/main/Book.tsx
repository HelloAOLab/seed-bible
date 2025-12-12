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
import { calculateReadingHistorySummary } from "db.annotations.library";
const { useMemo, useState, useEffect, useCallback } = os.appHooks;
const { memo } = os.appCompat;

export const Book = memo(
  ({
    book,
    bookId,
    bookCoverBackgroundColor,
    style,
    sectionName,
    readingEvents,
    readingSummary,
    isPsalms,
    bookBorderGradientColors,
    bookUserPresence,
    bookUserPresenceColors,
  }) => {
    const {
      scaleFactor,
      showingAllChapters,
      isUserPresenceEnabled,
      isReadingHistoryEnabled,
      content,
      userPresence,
      usersInfo,
      selection,
      onBookNameClickAndHold,
      onBookNameClickAndHoldDependencies,
      chapterGap,
      chapterPadding,
      chapterHeight,
      BASE_BACKGROUND_COLOR,
      showingBooksColors,
      activeTab,
    } = useScriptureMap2DContext();
    const { testament } = useTestamentContext();
    const {
      readingHistoryRangeSeconds,
      myAuthBotId,
      MS_PER_SECOND,
      SEC_PER_DAY,
      SEC_PER_HOUR,
      SEC_PER_MINUTE,
    } = useReadingHistoryContext();

    const [showChapters, setShowChapters] = useState(showingAllChapters);
    const [containerRect, setContainerRect] = useState(null);

    const { tooltipAnchor } = useMemo(() => {
      let tooltipAnchor;

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
    const bookStaticInfo = useMemo(() => {
      return BibleVizUtils.Data.tags.booksStaticInfo[book];
    }, []);

    const { chaptersCount, staticChaptersArray } = useMemo(() => {
      const chaptersCount = bookStaticInfo.numberOfChapters;

      return {
        chaptersCount,
        staticChaptersArray: [...Array(chaptersCount)],
      };
    }, []);

    const getBookHeight = useCallback(() => {
      const { chaptersInfo } = bookStaticInfo;
      const amountOfRows = Math.ceil(
        chaptersInfo.length /
          BibleVizUtils.Data.tags.BibleLayoutMeasurements.Book2DMaxColumns
      );
      const height =
        amountOfRows * chapterHeight +
        chapterPadding * 2 +
        chapterGap * (amountOfRows - 1);
      return height;
    }, [scaleFactor, chapterGap, chapterPadding, chapterHeight]);

    const bookCoverHeight = useMemo(() => {
      return `${getBookHeight()}px`;
    }, [scaleFactor, getBookHeight, chapterGap, chapterPadding, chapterHeight]);

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

    const { fixedBackground, tooltipContent } = useMemo(() => {
      const nowSeconds = Math.floor(os.localTime / 1000);

      let fixedBackground;
      const tooltipContent = [];
      if (
        isReadingHistoryEnabled &&
        readingSummary.totalTimeSpentReading > SEC_PER_MINUTE
      ) {
        const { users, totalTimeSpentReading } = readingSummary;
        const colors = [];
        for (const userId in users) {
          const { totalTimeSpentReading: userReadingTimeSeconds, books } =
            users[userId];
          let color;
          const baseColor = BASE_BACKGROUND_COLOR;
          const userColor =
            userId === myAuthBotId
              ? BibleVizUtils.Data.tags.myUserColor
              : (BibleVizUtils.Data.vars.userPresenceData?.[userId]?.user
                  ?.color ??
                thisBot.vars.FakeReadingHistoryUsersColorMap?.get(userId) ??
                "pink");
          const isTimeSpentNoticeable = userReadingTimeSeconds > SEC_PER_MINUTE; // more than a minute

          if (isTimeSpentNoticeable) {
            if (readingHistoryRangeSeconds) {
              color = BibleVizUtils.Functions.GetHistoryColorByReadingTime({
                baseColor,
                userColor,
                readingTimeSeconds: userReadingTimeSeconds,
                step: 0.25,
                fullColorTimeSeconds: 3600, // 1 hour
              });
              let fixedContent;
              if (userReadingTimeSeconds >= SEC_PER_HOUR) {
                // more than an hour
                const hoursCount = Math.floor(
                  userReadingTimeSeconds / SEC_PER_HOUR
                );
                fixedContent = `spent ${hoursCount} hour${hoursCount > 1 ? "s" : ""}`;
              } else {
                const minutesCount = Math.floor(
                  userReadingTimeSeconds / SEC_PER_MINUTE
                );
                fixedContent = `spent ${minutesCount} minute${minutesCount > 1 ? "s" : ""}`;
              }

              tooltipContent.push(
                <ReadingHistoryTooltipContent
                  userId={userId}
                  fixedContent={fixedContent}
                />
              );
            } else {
              const { chapters } = books[bookId];
              let lastEntry;
              for (const chapter in chapters) {
                const events = chapters[chapter];
                for (const event of events) {
                  const { start, end } = event;
                  const isEventTimeSpentNoticeable =
                    end - start >= SEC_PER_MINUTE;
                  const recencySeconds = nowSeconds - end;
                  const isRecentEnough =
                    end >=
                    BibleVizUtils.Data.masks
                      .readingHistoryRecencyThresholdTimeSeconds;
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
              if (lastEntry) {
                const { end } = lastEntry;
                const recencySeconds = nowSeconds - end;
                color = BibleVizUtils.Functions.GetHistoryColorByRecency({
                  recencyTimeSeconds: end,
                  baseColor,
                  userColor,
                });
                let fixedContent;
                if (recencySeconds >= SEC_PER_DAY) {
                  const daysCount = Math.floor(recencySeconds / SEC_PER_DAY);
                  fixedContent = `read ${daysCount} day${daysCount > 1 ? "s" : ""} ago`;
                } else if (recencySeconds >= SEC_PER_HOUR) {
                  const hoursCount = Math.floor(recencySeconds / SEC_PER_HOUR);
                  fixedContent = `read ${hoursCount} hour${hoursCount > 1 ? "s" : ""} ago`;
                } else {
                  const minutesCount = Math.floor(
                    recencySeconds / SEC_PER_MINUTE
                  );
                  fixedContent = `read ${minutesCount} minute${minutesCount > 1 ? "s" : ""} ago`;
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
        if (colors.length === 0) {
          fixedBackground = BASE_BACKGROUND_COLOR;
        } else {
          fixedBackground =
            BibleVizUtils.Functions.GetHistoryColorLinearGradient(colors);
        }
      } else {
        if (showingBooksColors) {
          fixedBackground = bookCoverBackgroundColor;
        } else {
          fixedBackground = BASE_BACKGROUND_COLOR;
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
      usersInfo,
      showChapters,
      readingSummary,
      isReadingHistoryEnabled,
      readingHistoryRangeSeconds,
      showingBooksColors,
    ]);

    const chapterReadingHistorySummaryMap = useMemo(() => {
      const now = Date.now();
      const nowSeconds = Math.floor(now / 1000);
      const effectiveRange = readingHistoryRangeSeconds ?? {
        start:
          BibleVizUtils.Data.masks.readingHistoryRecencyThresholdTimeSeconds,
        end: nowSeconds,
      };
      const chapterEntriesMap = new Map();

      for (const readingEvent of readingEvents) {
        const { chapter, start } = readingEvent;
        if (
          BibleVizUtils.Functions.IsValueBetween({
            value: start,
            min: effectiveRange.start,
            max: effectiveRange.end,
          })
        ) {
          if (!chapterEntriesMap.has(chapter)) {
            chapterEntriesMap.set(chapter, []);
          }
          chapterEntriesMap.get(chapter).push(readingEvent);
        }
      }

      const summaryMap = new Map();

      for (const [chapter, events] of chapterEntriesMap) {
        const summary = calculateReadingHistorySummary(events);
        summaryMap.set(chapter, summary);
      }

      return summaryMap;
    }, [readingEvents, readingHistoryRangeSeconds]);

    const chapters = useMemo(() => {
      if (!showChapters) return [];

      const now = Date.now();
      const nowSeconds = Math.floor(now / MS_PER_SECOND);
      const baseColor = BASE_BACKGROUND_COLOR;

      return staticChaptersArray.map((_, index) => {
        let chapter = index + 1;

        const chapterSummary = chapterReadingHistorySummaryMap.get(chapter);
        let historyBackground = null;
        let historyColor = null;
        const tooltipContent = [];
        const colors = [];

        if (isReadingHistoryEnabled) {
          if (chapterSummary) {
            const { users, totalTimeSpentReading: chapterReadingTimeSeconds } =
              chapterSummary;
            for (const userId in users) {
              let color;
              const userColor =
                userId === myAuthBotId
                  ? BibleVizUtils.Data.tags.myUserColor
                  : (BibleVizUtils.Data.vars.userPresenceData?.[userId]?.user
                      ?.color ??
                    thisBot.vars.FakeReadingHistoryUsersColorMap?.get(userId) ??
                    "pink");
              const { totalTimeSpentReading: userReadingTimeSeconds } =
                users[userId];

              const isTimeSpentNoticeable =
                userReadingTimeSeconds >= SEC_PER_MINUTE; // more than a minute

              if (isTimeSpentNoticeable) {
                if (readingHistoryRangeSeconds) {
                  color = BibleVizUtils.Functions.GetHistoryColorByReadingTime({
                    baseColor,
                    userColor,
                    readingTimeSeconds: userReadingTimeSeconds,
                    step: 0.25,
                  });

                  let fixedContent;
                  if (userReadingTimeSeconds >= SEC_PER_HOUR) {
                    // more than an hour
                    const hoursCount = Math.floor(
                      userReadingTimeSeconds / SEC_PER_HOUR
                    );
                    fixedContent = `spent ${hoursCount} hour${hoursCount > 1 ? "s" : ""}`;
                  } else {
                    const minutesCount = Math.floor(
                      userReadingTimeSeconds / SEC_PER_MINUTE
                    );
                    fixedContent = `spent ${minutesCount} minute${minutesCount > 1 ? "s" : ""}`;
                  }

                  tooltipContent.push(
                    <ReadingHistoryTooltipContent
                      userId={userId}
                      fixedContent={fixedContent}
                    />
                  );
                } else {
                  const chapterReadingEvents =
                    users[userId].books[bookId].chapters[chapter];
                  let lastValidEvent;
                  let recencySeconds;
                  for (
                    let eventIndex = chapterReadingEvents.length - 1;
                    eventIndex >= 0;
                    eventIndex--
                  ) {
                    const event = chapterReadingEvents[eventIndex];
                    const { start, end } = event;
                    const isEventTimeSpentNoticeable =
                      end - start >= SEC_PER_MINUTE;
                    const currRecencySeconds = nowSeconds - event.end;
                    const isRecentEnough =
                      event.end >=
                      BibleVizUtils.Data.masks
                        .readingHistoryRecencyThresholdTimeSeconds;
                    const isNotTooRecent = currRecencySeconds >= SEC_PER_MINUTE;

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
                  if (lastValidEvent) {
                    color = BibleVizUtils.Functions.GetHistoryColorByRecency({
                      recencyTimeSeconds: lastValidEvent.end,
                      baseColor,
                      userColor,
                    });
                    let fixedContent;
                    if (recencySeconds >= SEC_PER_DAY) {
                      const daysCount = Math.floor(
                        recencySeconds / SEC_PER_DAY
                      );
                      fixedContent = `read ${daysCount} day${daysCount > 1 ? "s" : ""} ago`;
                    } else if (recencySeconds >= SEC_PER_HOUR) {
                      const hoursCount = Math.floor(
                        recencySeconds / SEC_PER_HOUR
                      );
                      fixedContent = `read ${hoursCount} hour${hoursCount > 1 ? "s" : ""} ago`;
                    } else {
                      const minutesCount = Math.floor(
                        recencySeconds / SEC_PER_MINUTE
                      );
                      fixedContent = `read ${minutesCount} minute${minutesCount > 1 ? "s" : ""} ago`;
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

          if (colors.length > 1) {
            historyBackground =
              BibleVizUtils.Functions.GetHistoryColorLinearGradient(colors);
          } else {
            if (colors.length === 0) {
              colors.push({ color: BASE_BACKGROUND_COLOR, value: 1 });
            }
            historyBackground = colors[0].color;
          }
          historyColor = BibleVizUtils.Functions.GetTextColorBasedOnBackground({
            backgroundColor: colors,
          });
        }

        if (isPsalms) {
          ({ chapter } = BibleVizUtils.Functions.ConvertDividedPsalmsToComplete(
            {
              book,
              chapter,
            }
          ));
        }

        const userPresenceColors = [];
        let borderGradientColors;
        if (isUserPresenceEnabled) {
          for (const user in bookUserPresence) {
            const { chapter: userChapter, borderColor: userBorderColor } =
              bookUserPresence[user];
            if (chapter === userChapter) {
              userPresenceColors.push(userBorderColor);
            }
          }
          if (userPresenceColors.length > 0) {
            borderGradientColors =
              BibleVizUtils.Functions.GetUserPresenceBorderGradientColors({
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
      usersInfo,
      userPresence,
      showChapters,
    ]);

    return (
      <div
        className={`book-container${showChapters ? "" : " pointable"}`}
        style={style}
        onClick={() => {
          if (!showChapters) setShowChapters(true);
        }}
      >
        <span
          className="book-name"
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
          {bookId}
        </span>
        <div
          className={`book-cover${showChapters ? " invisible" : isUserPresenceEnabled && bookBorderGradientColors ? " show-user-presence" : ""}`}
          onPointerEnter={(e) =>
            setContainerRect(e.currentTarget.getBoundingClientRect())
          }
          onPointerLeave={() => setContainerRect(null)}
          style={{
            "--bookUserPresenceColors": bookBorderGradientColors,
            height: bookCoverHeight,
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
