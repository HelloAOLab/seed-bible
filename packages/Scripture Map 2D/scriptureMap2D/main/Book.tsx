import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";
import { Chapter } from "scriptureMap2D.main.Chapter";
import { PresentUserPresenceBookIcon } from "scriptureMap2D.main.PresentUserPresenceIcon";
import { useTestamentContext } from "scriptureMap2D.main.TestamentContext";
import { useClickAndHold } from "scriptureMap2D.main.CustomHooks";
import {
  Tooltip,
  ReadingHistoryTooltipContent,
} from "scriptureMap2D.main.Tooltip";
import { useReadingHistoryContext } from "scriptureMap2D.main.ReadingHistoryContext";
import { calculateReadingHistorySummary } from "db.annotations.library";
const { useMemo, useState, useEffect, useCallback } = os.appHooks;
const { memo } = os.appCompat;

export const Book = memo(
  ({
    bookInfo,
    bookCoverBackgroundColor,
    style,
    sectionName,
    readingEvents,
    readingSummary,
  }) => {
    const {
      arrangement,
      scaleFactor,
      showingAllChapters,
      isUserPresenceEnabled,
      isReadingHistoryEnabled,
      content,
      modes,
      usersStatus,
      MAX_CHAPTER_HEAT_COUNT,
      userPresence,
      usersInfo,
      contentVisualization,
      ContentVisualizationType,
      // mode,
      // ScriptureMap2DModes,
      selection,
      // handleCheckboxChange,
      // isInSelectionMode,
      // setIsInSelectionMode,

      onBookNameClickAndHold,
      onBookNameClickAndHoldDependencies,

      bookWidth,
      chapterGap,
      chapterPadding,
      chapterWidth,
      chapterHeight,
      CHAPTER_BASE_BACKGROUND_COLOR,
    } = useScriptureMap2DContext();
    const { testament } = useTestamentContext();
    const {
      readingHistoryRangeSeconds,
      myAuthBotId,
      greaterTimePeriodSeconds,
      MS_PER_DAY,
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

    const { book, chaptersCount, bookId, staticChaptersArray } = useMemo(() => {
      const book = bookInfo.commonName;
      const chaptersCount =
        BibleVizUtils.Data.tags.booksStaticInfo[book].numberOfChapters;
      const bookId = BibleVizUtils.Data.tags.booksStaticInfo[book].abbreviation;

      return {
        book,
        chaptersCount,
        bookId,
        staticChaptersArray: [...Array(chaptersCount)],
      };
    }, []);

    const getBookHeight = useCallback(() => {
      const { chaptersInfo } = BibleVizUtils.Data.tags.booksStaticInfo[book];
      const amountOfRows = Math.ceil(
        chaptersInfo.length /
          BibleVizUtils.Data.tags.BibleLayoutMeasurements
            .Book2DMaxAmountOfColumns
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

    const {
      fixedBackground,
      gridRows,
      displayContainer,
      gridColumns,
      filteredUsers,
      tooltipContent,
    } = useMemo(() => {
      const baseColor = [211, 211, 211];

      let userPresenceBackground = `rgb(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]})`;

      const filteredUsers = Array.from(usersStatus).filter(
        ([user, enabled]) => {
          const bookContent = content.get(user).books?.[book];
          return (
            enabled &&
            bookContent &&
            Object.keys(bookContent).some((key) => {
              return bookContent[key].length > 0;
            })
          );
        }
      );

      if (modes.get("Content")) {
        if (filteredUsers.length === 0) {
          userPresenceBackground = `rgb(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]})`;
        } else {
          const colors = filteredUsers.map(([user]) => {
            const userContent = content.get(user);
            const bookContent = userContent.books[book];
            const entriesCount = Object.keys(bookContent).reduce(
              (currentValue, key) => {
                return (
                  currentValue +
                  Math.min(bookContent[key].length, MAX_CHAPTER_HEAT_COUNT)
                );
              },
              0
            );

            const heatMaxColor = HexToRgb(usersInfo[user].color);
            const normalizer = 3;
            const progress = Math.min(
              entriesCount /
                ((MAX_CHAPTER_HEAT_COUNT * chaptersCount) / normalizer),
              1
            );
            const deltaColor = [
              heatMaxColor[0] - baseColor[0],
              heatMaxColor[1] - baseColor[1],
              heatMaxColor[2] - baseColor[2],
            ].map((value) => {
              return Math.floor(value * progress);
            });
            const heatColor = baseColor.map((value, index) => {
              return value + deltaColor[index];
            });

            return heatColor;
          });
          if (filteredUsers.length === 1) {
            userPresenceBackground = `rgb(${colors[0][0]}, ${colors[0][1]}, ${colors[0][2]})`;
          } else if (filteredUsers.length === 2) {
            userPresenceBackground = `linear-gradient(to right, rgb(${colors[0][0]}, ${colors[0][1]}, ${colors[0][2]}), rgb(${colors[1][0]}, ${colors[1][1]}, ${colors[1][2]}))`;
          } else if (filteredUsers.length === 3) {
            userPresenceBackground = `linear-gradient(to bottom right, rgb(${colors[0][0]}, ${colors[0][1]}, ${colors[0][2]}), rgb(255 255 255 / 0%) 70%), linear-gradient(to bottom left, rgb(${colors[1][0]}, ${colors[1][1]}, ${colors[1][2]}), rgb(255 255 255 / 0%) 70%), linear-gradient(to top, rgb(${colors[2][0]}, ${colors[2][1]}, ${colors[2][2]}), rgb(255 255 255 / 0%) 70%)`;
          } else if (filteredUsers.length > 3) {
            userPresenceBackground = `linear-gradient(to bottom right, rgb(${colors[0][0]}, ${colors[0][1]}, ${colors[0][2]}), rgb(255 255 255 / 0%) 70%), linear-gradient(to bottom left, rgb(${colors[1][0]}, ${colors[1][1]}, ${colors[1][2]}), rgb(255 255 255 / 0%) 70%), linear-gradient(to top right, rgb(${colors[2][0]}, ${colors[2][1]}, ${colors[2][2]}), rgb(255 255 255 / 0%) 70%), linear-gradient(to top left, rgb(${colors[3][0]}, ${colors[3][1]}, ${colors[3][2]}), rgb(255 255 255 / 0%) 70%)`;
          }
        }
      }

      const displayContainer =
        contentVisualization === ContentVisualizationType.Container &&
        filteredUsers.length > 0 &&
        modes.get("Content");

      let fixedBackground;
      const tooltipContent = [];
      if (isUserPresenceEnabled) {
        if (displayContainer) fixedBackground = "transparent";
        else fixedBackground = userPresenceBackground;
      } else if (
        isReadingHistoryEnabled &&
        readingSummary.totalTimeSpentReading > SEC_PER_MINUTE
      ) {
        const { users, totalTimeSpentReading } = readingSummary;
        const colors = [];
        for (const userId in users) {
          const { totalTimeSpentReading: userReadingTimeSeconds, books } =
            users[userId];
          let color;
          const baseColor = CHAPTER_BASE_BACKGROUND_COLOR;
          const userColor =
            userId === myAuthBotId
              ? BibleVizUtils.Data.tags.myUserColor
              : (BibleVizUtils.Data.vars.userPresenceData?.[userId]?.user
                  ?.color ??
                thisBot.vars.FakeReadingHistoryUsersColorMap?.get(userId) ??
                "pink");
          if (readingHistoryRangeSeconds) {
            color = BibleVizUtils.Functions.GetHistoryColorByReadingTime({
              baseColor,
              userColor,
              readingTimeSeconds: userReadingTimeSeconds,
              step: 0.25,
            });

            const isTimeSpentNoticeable =
              userReadingTimeSeconds > SEC_PER_MINUTE; // more than a minute

            if (isTimeSpentNoticeable) {
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
            }
          } else {
            const { chapters } = books[bookId];
            let lastEntry;
            for (const chapter in chapters) {
              const events = chapters[chapter];
              for (const event of events) {
                if (!lastEntry || event.end > lastEntry.end) lastEntry = event;
              }
            }
            const nowSeconds = Math.floor(os.localTime / 1000);
            const recencyTimeSeconds = nowSeconds - lastEntry.end;

            color = BibleVizUtils.Functions.GetHistoryColorByRecency({
              recencyTimeSeconds,
              baseColor,
              userColor,
            });
            const isRecentEnough =
              recencyTimeSeconds <= greaterTimePeriodSeconds;
            if (isRecentEnough) {
              let fixedContent;
              if (recencyTimeSeconds >= SEC_PER_DAY) {
                const daysCount = Math.floor(recencyTimeSeconds / SEC_PER_DAY);
                fixedContent = `read ${daysCount} day${daysCount > 1 ? "s" : ""} ago`;
              } else if (recencyTimeSeconds >= SEC_PER_HOUR) {
                const hoursCount = Math.floor(
                  recencyTimeSeconds / SEC_PER_HOUR
                );
                fixedContent = `read ${hoursCount} hour${hoursCount > 1 ? "s" : ""} ago`;
              } else if (recencyTimeSeconds >= SEC_PER_MINUTE) {
                const minutesCount = Math.floor(
                  recencyTimeSeconds / SEC_PER_MINUTE
                );
                fixedContent = `read ${minutesCount} minute${minutesCount > 1 ? "s" : ""} ago`;
              } else {
                fixedContent = `${userId === myAuthBotId ? "are" : "is"} reading now`;
              }
              tooltipContent.push(
                <ReadingHistoryTooltipContent
                  userId={userId}
                  fixedContent={fixedContent}
                />
              );
            }
          }
          const value = userReadingTimeSeconds / totalTimeSpentReading;
          colors.push({ color, value });
        }
        fixedBackground =
          BibleVizUtils.Functions.GetHistoryColorLinearGradient(colors);
      } else {
        fixedBackground = bookCoverBackgroundColor;
      }

      const bookEntriesCounts = filteredUsers.map(([user]) => {
        const userContent = content.get(user);
        const bookContent = userContent.books[book];
        const entriesCount = Object.keys(bookContent).reduce(
          (currentValue, key) => {
            return currentValue + bookContent[key].length;
          },
          0
        );
        return entriesCount;
      });
      const gridColumns = displayContainer && !showChapters ? "1fr" : null;
      const gridRows =
        displayContainer && !showChapters
          ? bookEntriesCounts
              .map((count) => {
                return `${count}fr`;
              })
              .join(" ")
          : null;

      return {
        fixedBackground,
        gridRows,
        displayContainer,
        gridColumns,
        filteredUsers,
        tooltipContent,
      };
    }, [
      chaptersCount,
      isUserPresenceEnabled,
      content,
      usersStatus,
      modes,
      bookCoverBackgroundColor,
      usersInfo,
      contentVisualization,
      ContentVisualizationType,
      showChapters,
      readingSummary,
      isReadingHistoryEnabled,
      readingHistoryRangeSeconds,
    ]);

    const usersInBook = useMemo(() => {
      return Object.keys(userPresence).filter((user) => {
        return userPresence[user].book === book;
      });
    }, [userPresence, isUserPresenceEnabled, modes]);

    const chapterReadingHistorySummaryMap = useMemo(() => {
      const lastTimePeriod =
        BibleVizUtils.Data.masks.historyTimePeriodsInfo[
          BibleVizUtils.Data.masks.historyTimePeriodsInfo.length - 1
        ];
      const lastTimePeriodMs = lastTimePeriod.GetTimePeriodInMs();
      const lastTimePeriodSeconds = Math.floor(lastTimePeriodMs / 1000);
      const now = Date.now();
      const nowSeconds = Math.floor(now / 1000);
      const lastTimePeriodTimeSeconds = nowSeconds - lastTimePeriodSeconds;
      const effectiveRange = readingHistoryRangeSeconds ?? {
        start: lastTimePeriodTimeSeconds,
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

    const { historyColorsMap } = useMemo(() => {
      if (!isReadingHistoryEnabled) return {};

      const historyColorsMap = new Map();

      for (let i = 0; i < staticChaptersArray.length; i++) {
        const chapter = i + 1;
        const chapterSummary = chapterReadingHistorySummaryMap.get(chapter);

        const colors = [];

        if (!chapterSummary) {
          colors.push({ color: CHAPTER_BASE_BACKGROUND_COLOR, value: 1 });
        } else {
          const { totalTimeSpentReading: totalReadingTimeSeconds, users } =
            chapterSummary;
          if (totalReadingTimeSeconds < SEC_PER_MINUTE) {
            colors.push({ color: CHAPTER_BASE_BACKGROUND_COLOR, value: 1 });
          } else {
            for (const userId in users) {
              const { totalTimeSpentReading: userReadingTimeSeconds, books } =
                users[userId];
              let color;
              const baseColor = CHAPTER_BASE_BACKGROUND_COLOR;
              const userColor =
                userId === myAuthBotId
                  ? BibleVizUtils.Data.tags.myUserColor
                  : (BibleVizUtils.Data.vars.userPresenceData?.[userId]?.user
                      ?.color ??
                    thisBot.vars.FakeReadingHistoryUsersColorMap?.get(userId) ??
                    "pink");
              if (readingHistoryRangeSeconds) {
                color = BibleVizUtils.Functions.GetHistoryColorByReadingTime({
                  baseColor,
                  userColor,
                  readingTimeSeconds: userReadingTimeSeconds,
                  step: 0.25,
                });
              } else {
                const { chapters } = books[bookId];

                const readingEvents = chapters[chapter];
                const nowSeconds = Math.floor(os.localTime / 1000);
                const recencyTimeSeconds =
                  nowSeconds - readingEvents[readingEvents.length - 1].end;

                color = BibleVizUtils.Functions.GetHistoryColorByRecency({
                  recencyTimeSeconds,
                  baseColor,
                  userColor,
                });
              }
              const value = userReadingTimeSeconds / totalReadingTimeSeconds;
              colors.push({ color, value });
            }
          }
        }

        historyColorsMap.set(chapter, colors);
      }

      return { historyColorsMap };
    }, [
      readingHistoryRangeSeconds,
      chapterReadingHistorySummaryMap,
      isReadingHistoryEnabled,
    ]);

    const chapters = useMemo(() => {
      const now = Date.now();
      const nowSeconds = Math.floor(now / MS_PER_SECOND);

      return staticChaptersArray.map((_, index) => {
        const chapter = index + 1;

        const chapterSummary = chapterReadingHistorySummaryMap.get(chapter);
        let historyBackground = null;
        let historyColor = null;
        const tooltipContent = [];

        if (chapterSummary) {
          const users = chapterSummary.users;
          for (const userId in users) {
            if (readingHistoryRangeSeconds) {
              const { totalTimeSpentReading: userReadingTimeSeconds } =
                users[userId];

              const isTimeSpentNoticeable =
                userReadingTimeSeconds > SEC_PER_MINUTE; // more than a minute

              if (isTimeSpentNoticeable) {
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
              }
            } else {
              const chapterReadingEvents =
                users[userId].books[bookId].chapters[chapter];
              const lastReadingEvent =
                chapterReadingEvents[chapterReadingEvents.length - 1];
              const recencyTimeSeconds = nowSeconds - lastReadingEvent.end;
              const isRecentEnough =
                recencyTimeSeconds <= greaterTimePeriodSeconds;
              if (isRecentEnough) {
                let fixedContent;
                if (recencyTimeSeconds >= SEC_PER_DAY) {
                  const daysCount = Math.floor(
                    recencyTimeSeconds / SEC_PER_DAY
                  );
                  fixedContent = `read ${daysCount} day${daysCount > 1 ? "s" : ""} ago`;
                } else if (recencyTimeSeconds >= SEC_PER_HOUR) {
                  const hoursCount = Math.floor(
                    recencyTimeSeconds / SEC_PER_HOUR
                  );
                  fixedContent = `read ${hoursCount} hour${hoursCount > 1 ? "s" : ""} ago`;
                } else if (recencyTimeSeconds >= SEC_PER_MINUTE) {
                  const minutesCount = Math.floor(
                    recencyTimeSeconds / SEC_PER_MINUTE
                  );
                  fixedContent = `read ${minutesCount} minute${minutesCount > 1 ? "s" : ""} ago`;
                } else {
                  fixedContent = `${userId === myAuthBotId ? "are" : "is"} reading now`;
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
        }

        if (isReadingHistoryEnabled) {
          const colors = historyColorsMap.get(chapter);
          historyBackground =
            BibleVizUtils.Functions.GetHistoryColorLinearGradient(colors);
          historyColor = BibleVizUtils.Functions.GetTextColorBasedOnBackground({
            backgroundColor: colors,
          });
        }

        return (
          <Chapter
            key={`${bookId}-${chapter}`}
            sectionName={sectionName}
            bookName={book}
            index={index}
            historyBackground={historyBackground}
            historyColor={historyColor}
            tooltipContent={tooltipContent}
          />
        );
      });
    }, [
      isReadingHistoryEnabled,
      historyColorsMap,
      chapterReadingHistorySummaryMap,
      readingHistoryRangeSeconds,
    ]);

    return (
      <div
        className={`mapBookContainer${showChapters ? "" : " pointable"}`}
        style={style}
        onClick={() => {
          if (!showChapters) setShowChapters(true);
        }}
      >
        <span
          className="bookName"
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
          className={`bookCover${showChapters ? " invisible" : displayContainer ? " displayingContainer" : ""}`}
          onPointerEnter={(e) =>
            setContainerRect(e.currentTarget.getBoundingClientRect())
          }
          onPointerLeave={() => setContainerRect(null)}
          style={{
            height: bookCoverHeight,
            background: fixedBackground,
            gridTemplateColumns: gridColumns,
            gridTemplateRows: gridRows,
          }}
        >
          {showChapters ? (
            chapters
          ) : (
            <>
              {isUserPresenceEnabled &&
                modes.get("Reading") &&
                usersInBook?.length > 0 &&
                usersInBook.map((user, index) => {
                  return (
                    <PresentUserPresenceBookIcon
                      index={index}
                      user={user}
                      length={usersInBook.length}
                    />
                  );
                })}
              {isUserPresenceEnabled &&
                displayContainer &&
                filteredUsers.map(([user]) => {
                  return (
                    <div
                      style={{ backgroundColor: usersInfo[user].color }}
                    ></div>
                  );
                })}
              {isReadingHistoryEnabled &&
                tooltipAnchor &&
                tooltipContent?.length > 0 && (
                  <Tooltip anchor={tooltipAnchor} content={tooltipContent} />
                )}
            </>
          )}
        </div>
      </div>
    );
  }
);
