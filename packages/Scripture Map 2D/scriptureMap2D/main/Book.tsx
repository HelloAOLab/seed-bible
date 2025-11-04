import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";
import { Chapter } from "scriptureMap2D.main.Chapter";
import { PresentUserPresenceBookIcon } from "scriptureMap2D.main.PresentUserPresenceIcon";
import { useTestamentContext } from "scriptureMap2D.main.TestamentContext";
import { useClickAndHold } from "scriptureMap2D.main.CustomHooks";
import { useTimeContext } from "scriptureMap2D.main.TimeContext";
const { useMemo, useState, useEffect, useCallback } = os.appHooks;

const TooltipContent = ({userId, fixedContent}) => {

    const {userName, backgroundColor, color} = useMemo(() => {
        const isMe = userId === configBot.id
        const userName = isMe ? "You" : "Guest";
        const backgroundColor = isMe ? BibleVizUtils.Data.tags.myUserColor : (BibleVizUtils.Data.vars.userPresenceData?.[userId]?.user?.color ?? thisBot.vars.FakeReadingHistoryUsersColorMap?.get(userId) ?? "pink"); 
        const color = BibleVizUtils.Functions.GetTextColorBasedOnBackground({backgroundColor});

        return {userName, backgroundColor, color}
    }, [])
    
    
    return (
        <span className="chapterTooltipContent" >
            <span style={{backgroundColor, color}}>{userName}</span>
            <span>{fixedContent}</span>
        </span>
    )
}

export const Book = ({
  bookInfo,
  bookCoverBackgroundColor,
  style,
  key,
  sectionName,
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
    readingHistoryRange,
  } = useScriptureMap2DContext();
  const { testament } = useTestamentContext();
  const { tick } = useTimeContext();

        bookWidth,
        chapterGap,
        chapterPadding,
        chapterWidth,
        chapterHeight,
        CHAPTER_BASE_BACKGROUND_COLOR,
        filteredReadingHistory, 
        readingHistoryRange,
        greaterTimePeriodTime
    } = useScriptureMap2DContext();
    const { testament } = useTestamentContext() 
    const { tick } = useTimeContext();
    
    const [showChapters, setShowChapters] = useState(showingAllChapters);
    const {chaptersCount, shortName, staticChaptersArray} = useMemo(() => { 
        const chaptersCount = BibleVizUtils.Data.tags.booksStaticInfo[bookInfo.commonName].numberOfChapters
        return {
            chaptersCount,
            shortName: BibleVizUtils.Data.tags.booksStaticInfo[bookInfo.commonName].abbreviation,
            staticChaptersArray: [...Array(chaptersCount)]
        } 
    }, [])

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

  const chapterUserEntriesMap = useMemo(() => {
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
    return new Map(
      staticChaptersArray.map((_, index) => {
        const chapter = index + 1;
        let chapterReadingTime = 0;
        const userEntries = [];
        for (const userId in filteredReadingHistory) {
          const entries =
            filteredReadingHistory[userId]?.[shortName]?.[chapter];
          if (entries) {
            const filteredEntries = [];
            let userReadingTime = 0;
            for (const entry of entries) {
              if (
                BibleVizUtils.Functions.IsValueBetween({
                  value: entry.start,
                  min: effectiveRange.start,
                  max: effectiveRange.end,
                }) ||
                BibleVizUtils.Functions.IsValueBetween({
                  value: entry.end ?? now,
                  min: effectiveRange.start,
                  max: effectiveRange.end,
                })
              ) {
                filteredEntries.push(entry);
                const clampedReading = {
                  start: Math.min(
                    Math.max(entry.start, effectiveRange.start),
                    effectiveRange.end
                  ),
                  end: Math.min(
                    Math.max(entry.end ?? now, effectiveRange.start),
                    effectiveRange.end
                  ),
                };
                const entryReadingTime =
                  clampedReading.end - clampedReading.start;
                userReadingTime += entryReadingTime;
              }
            }
            chapterReadingTime += userReadingTime;
            if (filteredEntries.length > 0) {
              userEntries.push({
                userId,
                entries: filteredEntries,
                readingTime: userReadingTime,
              });
            }
          }
        }
        return [chapter, { userEntries, readingTime: chapterReadingTime }];
      })
    );
  }, [filteredReadingHistory, readingHistoryRange]);

  const historyColorsMap = useMemo(() => {
    if (!isReadingHistoryEnabled) return null;

    const {historyColorsMap, timeSpentMap, recencyMap} = useMemo(() => {

        if(!isReadingHistoryEnabled) return {};

        const historyColorsMap = new Map();
        const timeSpentMap = new Map();
        const recencyMap = new Map();

        for(let i = 0; i < staticChaptersArray.length ; i++)
        {
            const chapter = i + 1;
            const {userEntries, readingTime: chapterReadingTime} = chapterUserEntriesMap.get(chapter);
    
            const colors = [];
            const userTimeSpentMap = new Map()
            const userRecencyMap = new Map()
            timeSpentMap.set(chapter, userTimeSpentMap);
            recencyMap.set(chapter, userRecencyMap);
    
            if(userEntries.length === 0) colors.push({color: CHAPTER_BASE_BACKGROUND_COLOR, value: 1})
            else
            {
                for(const {userId, entries, readingTime: userReadingTime} of userEntries)
                {
                    const recencyTime = os.localTime - (entries?.[entries?.length - 1]?.end ?? os.localTime);
                    const color = BibleVizUtils.Functions.GetHistoryColor({
                        baseColor: CHAPTER_BASE_BACKGROUND_COLOR, 
                        userColor: userId === configBot.id ? BibleVizUtils.Data.tags.myUserColor : (BibleVizUtils.Data.vars.userPresenceData?.[userId]?.user?.color ?? thisBot.vars.FakeReadingHistoryUsersColorMap?.get(userId) ?? "pink"), 
                        reading: entries,
                        range: readingHistoryRange
                    })
                    const value = userReadingTime / chapterReadingTime;
                    colors.push({color, value});
                    userTimeSpentMap.set(userId, userReadingTime);
                    userRecencyMap.set(userId, recencyTime);
                }
            }
    
            historyColorsMap.set(chapter, colors);
        }

        return { historyColorsMap, timeSpentMap, recencyMap }

    }, [readingHistoryRange, chapterUserEntriesMap, tick, isReadingHistoryEnabled])

    const chapters = useMemo(() => {
        const MS_PER_MINUTE = 1000 * 60;
        const MS_PER_HOUR = MS_PER_MINUTE * 60;
        const MS_PER_DAY = MS_PER_HOUR * 24;

        return staticChaptersArray.map((_, index) => {
            const chapter = index + 1
            let historyBackground = null;
            let historyColor = null;
            const tooltipContent = [];

            if(readingHistoryRange)
            {
                const userTimeSpentMap = timeSpentMap.get(chapter);
                for(const [userId, timeSpent] of userTimeSpentMap)
                {
                    const isTimeSpentNoticeable = timeSpent > MS_PER_MINUTE

                    if(isTimeSpentNoticeable)
                    {
                        let fixedContent;
                        if(timeSpent >= MS_PER_HOUR)
                        {
                            const hoursCount = Math.floor(timeSpent / MS_PER_HOUR);
                            fixedContent = `spent ${hoursCount} hour${hoursCount > 1 ? "s" : ""}`
                        }
                        else
                        {
                            const minutesCount = Math.floor(timeSpent / MS_PER_MINUTE);
                            fixedContent = `spent ${minutesCount} minute${minutesCount > 1 ? "s" : ""}`
                        }
                        tooltipContent.push(<TooltipContent userId={userId} fixedContent={fixedContent} />);
                    }
                }
            }
            else
            {
                const userRecencyMap = recencyMap.get(chapter);
                for(const [userId, recencyTime] of userRecencyMap)
                {
                    const isRecentEnough = recencyTime <= greaterTimePeriodTime
                    if(isRecentEnough)
                    {
                        let fixedContent;
                        if(recencyTime >= MS_PER_DAY)
                        {
                            const daysCount = Math.floor(recencyTime / MS_PER_DAY);
                            fixedContent = `read ${daysCount} day${daysCount > 1 ? "s" : ""} ago`
                        }
                        else if(recencyTime >= MS_PER_HOUR)
                        {
                            const hoursCount = Math.floor(recencyTime / MS_PER_HOUR);
                            fixedContent = `read ${hoursCount} hour${hoursCount > 1 ? "s" : ""} ago`
                        }
                        else if(recencyTime >= MS_PER_MINUTE)
                        {
                            const minutesCount = Math.floor(recencyTime / MS_PER_MINUTE);
                            fixedContent = `read ${minutesCount} minute${minutesCount > 1 ? "s" : ""} ago`
                        }
                        else
                        {
                            fixedContent = `${userId === configBot.id ? "are" : "is"} reading now`
                        }
                        tooltipContent.push(<TooltipContent userId={userId} fixedContent={fixedContent} />);
                    }
                }
            }

            
            if(isReadingHistoryEnabled)
            {
                const colors = historyColorsMap.get(chapter)
                historyBackground = BibleVizUtils.Functions.GetHistoryColorLinearGradient(colors);
                historyColor = BibleVizUtils.Functions.GetTextColorBasedOnBackground({backgroundColor: colors});
            }

            return <Chapter
                key={`${shortName}-${chapter}`}
                sectionName={sectionName} 
                bookName={bookInfo.commonName} 
                index={index}  
                historyBackground={historyBackground}
                historyColor={historyColor}
                tooltipContent={tooltipContent}
            />
        })
    }, [isReadingHistoryEnabled, historyColorsMap, timeSpentMap, recencyMap, readingHistoryRange]);

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
