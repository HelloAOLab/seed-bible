import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";
import { Chapter } from "scriptureMap2D.main.Chapter";
import { PresentUserPresenceBookIcon } from "scriptureMap2D.main.PresentUserPresenceIcon";
import { useTestamentContext } from "scriptureMap2D.main.TestamentContext";
import { useClickAndHold } from "scriptureMap2D.main.CustomHooks";
import { ReadingHistoryTooltipContent } from "scriptureMap2D.main.Tooltip";
import { useReadingHistoryContext } from "scriptureMap2D.main.ReadingHistoryContext";
import { calculateReadingHistorySummary } from "db.annotations.library";
const { useMemo, useState, useEffect, useCallback } = os.appHooks;

export const Book = ({
  bookInfo,
  bookCoverBackgroundColor,
  style,
  key,
  sectionName,
  readingEvents,
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
    filteredReadingHistory,
  } = useScriptureMap2DContext();
  const { testament } = useTestamentContext();
  const { readingHistoryRange, myAuthBotId, greaterTimePeriodTime } =
    useReadingHistoryContext();

  const [showChapters, setShowChapters] = useState(showingAllChapters);
  const {
    chaptersCount,
    shortName,
    staticChaptersArray,
    MS_PER_MINUTE,
    MS_PER_HOUR,
    MS_PER_DAY,
  } = useMemo(() => {
    const chaptersCount =
      BibleVizUtils.Data.tags.booksStaticInfo[bookInfo.commonName]
        .numberOfChapters;
    const MS_PER_MINUTE = 1000 * 60;
    const MS_PER_HOUR = MS_PER_MINUTE * 60;
    const MS_PER_DAY = MS_PER_HOUR * 24;

    return {
      chaptersCount,
      shortName:
        BibleVizUtils.Data.tags.booksStaticInfo[bookInfo.commonName]
          .abbreviation,
      staticChaptersArray: [...Array(chaptersCount)],
      MS_PER_MINUTE,
      MS_PER_HOUR,
      MS_PER_DAY,
    };
  }, []);

  const getBookHeight = useCallback(() => {
    const { chaptersInfo } =
      BibleVizUtils.Data.tags.booksStaticInfo[bookInfo.commonName];
    const amountOfRows = Math.ceil(
      chaptersInfo.length /
        BibleVizUtils.Data.tags.BibleLayoutMeasurements.Book2DMaxAmountOfColumns
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
    return selection?.[testament.name]?.[sectionName]?.[
      bookInfo.commonName
    ]?.every((chapter) => {
      return chapter;
    });
  }, [selection]);

  const { onHoldStart, onHoldEnd } = useClickAndHold({
    holdTime: 500,
    holdCompleteCallback: () => {
      const key = {
        testamentName: testament.name,
        sectionName,
        bookName: bookInfo.commonName,
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
  } = useMemo(() => {
    const baseColor = [211, 211, 211];

    let userPresenceBackground = `rgb(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]})`;

    const filteredUsers = Array.from(usersStatus).filter(([user, enabled]) => {
      const bookContent = content.get(user).books?.[bookInfo.commonName];
      return (
        enabled &&
        bookContent &&
        Object.keys(bookContent).some((key) => {
          return bookContent[key].length > 0;
        })
      );
    });

    if (modes.get("Content")) {
      if (filteredUsers.length === 0) {
        userPresenceBackground = `rgb(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]})`;
      } else {
        const colors = filteredUsers.map(([user]) => {
          const userContent = content.get(user);
          const bookContent = userContent.books[bookInfo.commonName];
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

    const fixedBackground = isUserPresenceEnabled
      ? displayContainer
        ? "transparent"
        : userPresenceBackground
      : bookCoverBackgroundColor;

    const bookEntriesCounts = filteredUsers.map(([user]) => {
      const userContent = content.get(user);
      const bookContent = userContent.books[bookInfo.commonName];
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
  ]);

  const usersInBook = useMemo(() => {
    return Object.keys(userPresence).filter((user) => {
      return userPresence[user].book === bookInfo.commonName;
    });
  }, [userPresence, isUserPresenceEnabled, modes]);

  const chapterReadingHistorySummaryMap = useMemo(() => {
    const lastTimePeriod =
      BibleVizUtils.Data.masks.historyTimePeriodsInfo[
        BibleVizUtils.Data.masks.historyTimePeriodsInfo.length - 1
      ].GetTimePeriodInMs();
    const now = Date.now();
    const lastTimePeriodTime = now - lastTimePeriod;
    const effectiveRange = readingHistoryRange ?? {
      start: lastTimePeriodTime,
      end: now,
    };
    const chapterEntriesMap = new Map();

    for (const readingEvent of readingEvents) {
      const { chapter, start, end } = readingEvent;
      if (
        BibleVizUtils.Functions.IsValueBetween({
          value: start,
          min: effectiveRange.start,
          max: effectiveRange.end,
        }) ||
        BibleVizUtils.Functions.IsValueBetween({
          value: end,
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
  }, [readingEvents, readingHistoryRange]);

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
        const { totalTimeSpentReading: totalReadingTime, users } =
          chapterSummary;
        for (const userId in users) {
          const { totalTimeSpentReading: userReadingTime, books } =
            users[userId];
          const { chapters } = books[shortName];
          const readingEvents = chapters[chapter];
          const color = BibleVizUtils.Functions.GetHistoryColor({
            baseColor: CHAPTER_BASE_BACKGROUND_COLOR,
            userColor:
              userId === myAuthBotId
                ? BibleVizUtils.Data.tags.myUserColor
                : (BibleVizUtils.Data.vars.userPresenceData?.[userId]?.user
                    ?.color ??
                  thisBot.vars.FakeReadingHistoryUsersColorMap?.get(userId) ??
                  "pink"),
            reading: readingEvents,
            range: readingHistoryRange,
          });
          const value = userReadingTime / totalReadingTime;
          colors.push({ color, value });
        }
      }

      historyColorsMap.set(chapter, colors);
    }

    return { historyColorsMap };
  }, [
    readingHistoryRange,
    chapterReadingHistorySummaryMap,
    isReadingHistoryEnabled,
  ]);

  const chapters = useMemo(() => {
    const now = Date.now();

    return staticChaptersArray.map((_, index) => {
      const chapter = index + 1;
      const chapterSummary = chapterReadingHistorySummaryMap.get(chapter);
      let historyBackground = null;
      let historyColor = null;
      const tooltipContent = [];

      if (chapterSummary) {
        const users = chapterSummary.users;
        if (readingHistoryRange) {
          for (const userId in users) {
            const { totalTimeSpentReading: userReadingTime } = users[userId];

            const isTimeSpentNoticeable = userReadingTime > MS_PER_MINUTE;

            if (isTimeSpentNoticeable) {
              let fixedContent;
              if (userReadingTime >= MS_PER_HOUR) {
                const hoursCount = Math.floor(userReadingTime / MS_PER_HOUR);
                fixedContent = `spent ${hoursCount} hour${hoursCount > 1 ? "s" : ""}`;
              } else {
                const minutesCount = Math.floor(
                  userReadingTime / MS_PER_MINUTE
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
          }
        } else {
          for (const userId in users) {
            const readingEvents =
              users[userId].books[shortName].chapters[chapter];
            const lastReadingEvent = readingEvents[readingEvents.length - 1];
            const recencyTime = now - lastReadingEvent.end;
            const isRecentEnough = recencyTime <= greaterTimePeriodTime;
            if (isRecentEnough) {
              let fixedContent;
              if (recencyTime >= MS_PER_DAY) {
                const daysCount = Math.floor(recencyTime / MS_PER_DAY);
                fixedContent = `read ${daysCount} day${daysCount > 1 ? "s" : ""} ago`;
              } else if (recencyTime >= MS_PER_HOUR) {
                const hoursCount = Math.floor(recencyTime / MS_PER_HOUR);
                fixedContent = `read ${hoursCount} hour${hoursCount > 1 ? "s" : ""} ago`;
              } else if (recencyTime >= MS_PER_MINUTE) {
                const minutesCount = Math.floor(recencyTime / MS_PER_MINUTE);
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
          key={`${shortName}-${chapter}`}
          sectionName={sectionName}
          bookName={bookInfo.commonName}
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
    readingHistoryRange,
  ]);

  return (
    <div
      className={`mapBookContainer${showChapters ? "" : " pointable"}`}
      style={style}
      key={key}
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
        {shortName}
      </span>
      <div
        className={`bookCover${showChapters ? " invisible" : displayContainer ? " displayingContainer" : ""}`}
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
                  <div style={{ backgroundColor: usersInfo[user].color }}></div>
                );
              })}
          </>
        )}
      </div>
    </div>
  );
};
