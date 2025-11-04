const { useState, useCallback, useEffect, useMemo } = os.appHooks;
import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";
import { Tooltip } from "scriptureMap2D.main.Tooltip";
const { memo } = os.appCompat;

// import { PresentUserPresenceTooltipIcon } from "scriptureMap2D.main.PresentUserPresenceIcon"
import { useTestamentContext } from "scriptureMap2D.main.TestamentContext";

import { useClickAndHold } from "scriptureMap2D.main.CustomHooks";

// const ChapterNotificationContainer = ({
//     bookName,
//     chapterIndex,
//     contextKey,
//     filterFn,
//     renderTooltipItem,
//     renderContent,
//     tooltipDirection = "up",
//     className,
// }) => {
//     const context = useScriptureMap2DContext();
//     const [containerRect, setContainerRect] = useState(null);

//     const { tooltipContent, tooltipAnchor, items } = useMemo(() => {
//         const usersIds = [configBot.id];
//         const dataSource = context[contextKey];
//         const items = usersIds.map((userId) => {
//             const item = filterFn(dataSource[userId], userId, bookName, chapterIndex);
//             return item
//         }).filter(Boolean);

//         let tooltipAnchor, tooltipContent;

//         if (containerRect) {
//             tooltipAnchor = {
//                 x: containerRect.left + containerRect.width / 2,
//                 y: containerRect.top + (tooltipDirection === "down" ? containerRect.height : 0),
//             };
//         }

//         if (items.length > 0) {
//             tooltipContent = items.map(renderTooltipItem);
//         }

//         return { tooltipContent, tooltipAnchor, items };
//     }, [containerRect, context[contextKey], bookName, chapterIndex]);

//     if (items?.length === 0) return null;

//     return (
//         <div
//             onPointerEnter={(e) => setContainerRect(e.currentTarget.getBoundingClientRect())}
//             onPointerLeave={() => setContainerRect(null)}
//             className={className}
//         >
//             {containerRect && tooltipContent && (
//                 <Tooltip direction={tooltipDirection} anchor={tooltipAnchor} content={tooltipContent} />
//             )}
//             {renderContent?.(items)}
//         </div>
//     );
// };

// function GetReadingFixedElapsedTime(timestamp)
// {
//     const now = Date.now();
//     const diff = now - timestamp;
//     const diffInSec = diff / 1000;
//     const diffInMin = diffInSec / 60;
//     const diffInHours = diffInMin / 60;
//     const diffInDays = diffInHours / 24;

//     if(diffInDays >= 1) return {amount: Math.floor(diffInDays), unit: "day"};
//     if(diffInHours >= 1) return {amount: Math.floor(diffInHours), unit: "hour"};
//     if(diffInMin >= 1) return {amount: Math.floor(diffInMin), unit: "minute"};
//     return {amount: 1, unit: "minute"}
// }

// const ReadingHistoryChapterNotificationContainer = ({ bookName, chapterIndex }) => (
//     <ChapterNotificationContainer
//         bookName={bookName}
//         chapterIndex={chapterIndex}
//         contextKey="readingHistory"
//         className="readingHistoryChapterNotificationContainer"
//         tooltipDirection="down"
//         filterFn={ (data, userId, book, chapterIndex) => {
//             const timestamp = data[BibleVizUtils.Data.tags.booksStaticInfo[book].abbreviation]?.[chapterIndex + 1]
//             if(timestamp)
//             {
//                 return {userId, book, chapter: chapterIndex + 1, timestamp}
//             }
//             return null
//         }}
//         renderTooltipItem={(reading) => {
//             const {amount, unit} = GetReadingFixedElapsedTime(reading.timestamp);
//             return (
//                 <span key={reading.userId}>
//                     {reading.userId === configBot.id ? "You" : "Unknown"}
//                     {` read ${amount} ${unit}${amount > 1 ? "s" : ""} ago`}
//                 </span>
//             )
//         }}
//         renderContent={(items) => (
//             <>
//                 <span className="notificationCount">{items.length}</span>
//                 <span className="material-symbols-outlined">history</span>
//             </>
//         )}
//     />
// );
// const UpcomingEventsChapterNotificationContainer = ({ bookName, chapterIndex }) => (
//     <ChapterNotificationContainer
//         bookName={bookName}
//         chapterIndex={chapterIndex}
//         contextKey="upcomingEvents"
//         className="upcomingEventsChapterNotificationContainer"
//         tooltipDirection="down"
//         filterFn={ (entries, _, book, chapterIndex) => {return entries.find((e) => e.book === book && e.chapter === chapterIndex + 1)} }
//         renderTooltipItem={(event) => (
//             <span key={event.user}>
//                 <PresentUserPresenceTooltipIcon user={event.user} />
//                 {`will read in ${event.remainingDays} day${event.remainingDays > 1 ? "s" : ""}`}
//             </span>
//         )}
//         renderContent={(items) => (
//             <>
//                 <span className="notificationCount">{items.length}</span>
//                 <span className="material-symbols-outlined">event</span>
//             </>
//         )}
//     />
// );
// const PresentUserPresenceDotContainer = ({ bookName, chapterIndex, usersInChapter }) => {
//     const { userPresence } = useScriptureMap2DContext();

//     return (
//         <ChapterNotificationContainer
//             bookName={bookName}
//             chapterIndex={chapterIndex}
//             contextKey="userPresence"
//             className="presentUserPresenceDotContainer"
//             filterFn={(_, user, book, chapterIndex) => {
//                 const presence = userPresence[user];
//                 return presence.book === book && presence.chapter === chapterIndex + 1 ? { user } : null;
//             }}
//             renderTooltipItem={({ user }) => (
//                 <span key={user}>
//                     <PresentUserPresenceTooltipIcon user={user} />
//                     {user}
//                 </span>
//             )}
//             renderContent={() =>
//                 usersInChapter.map((user, index) => (
//                     <PresentUserPresenceDot
//                         key={user}
//                         user={user}
//                         index={index}
//                         length={usersInChapter.length}
//                     />
//                 ))
//             }
//         />
//     );
// };
// const PresentUserPresenceDot = ({ user, index, length }) => {

//     const { usersInfo } = useScriptureMap2DContext();

//     return (
//         <div
//             className="presentUserPresenceDot"
//             style={{
//                 backgroundColor: usersInfo[user].color,
//                 marginRight: index > 0 ? "calc(var(--FIXED_SIZE_2) / 2 * (-1))" : null,
//                 zIndex: length - index
//             }}
//         >
//         </div>
//     )
// };

export const Chapter = memo(
  ({ index, bookName, sectionName, historyBackground, historyColor }) => {
    const {
      isUserPresenceEnabled,
      isReadingHistoryEnabled,
      content,
      usersStatus,
      // MAX_CHAPTER_HEAT_COUNT,
      modes,
      // userPresence,
      usersInfo,
      contentVisualization,
      ContentVisualizationType,
      mode,
      selection,
      ScriptureMap2DModes,
      project,
      projectFilters,
      projectStateStyle,
      onChapterClick,
      onChapterClickDependencies,
      onChapterClickAndHold,
      isInSelectionMode,
      CHAPTER_BASE_BACKGROUND_COLOR: baseColor,
    } = useScriptureMap2DContext();

    const { testament } = useTestamentContext();

    const checked = useMemo(() => {
      return (
        selection?.[testament.name]?.[sectionName]?.[bookName]?.[index] ?? false
      );
    }, [selection]);

    const handleChapterClick = useCallback((e) => {
      const key = {
        testamentName: testament.name,
        sectionName,
        bookName,
        chapterIndex: index,
      };
      onChapterClick(e, key, checked);
    }, onChapterClickDependencies);

    const { onHoldStart, onHoldEnd } = useClickAndHold({
      holdTime: 400,
      holdCompleteCallback: (e) => {
        const key = {
          testamentName: testament.name,
          sectionName,
          bookName,
          chapterIndex: index,
        };
        onChapterClickAndHold(e, key);
      },
      holdCancelCallback: (e) => {
        const key = {
          testamentName: testament.name,
          sectionName,
          bookName,
          chapterIndex: index,
        };
        onChapterClick(e, key, checked);
      },
      dependencies: onChapterClickDependencies,
    });

    const {
      background,
      borderStyle,
      borderColor,
      color /*displayContainer, gridColumns, gridRows, filteredUsers*/,
    } = useMemo(() => {
      const baseColorRgb = BibleVizUtils.Functions.HexToRgb({
        hexColor: baseColor,
      });
      const hasProjectContent =
        project &&
        mode === ScriptureMap2DModes.Project &&
        (isInSelectionMode ||
          projectFilters.get(
            project.structure[testament.name][sectionName][bookName][index]
          ));

      const filteredUsers = Array.from(usersStatus).filter(
        ([user, enabled]) => {
          return (
            enabled &&
            content.get(user).books?.[bookName]?.[index + 1]?.length > 0
          );
        }
      );
      // let userPresenceBackground = `rgb(${baseColorRgb[0]}, ${baseColorRgb[1]}, ${baseColorRgb[2]})`;
      // if (modes.get("Content")) {
      //     if (filteredUsers.length === 0) {
      //         userPresenceBackground = `rgb(${baseColorRgb[0]}, ${baseColorRgb[1]}, ${baseColorRgb[2]})`
      //     }
      //     else {
      //         const colors = filteredUsers.map(([user]) => {
      //             const userContent = content.get(user);
      //             const bookContent = userContent.books[bookName];
      //             const entriesCount = Math.min(bookContent[index + 1].length, MAX_CHAPTER_HEAT_COUNT);

      //             const heatMaxColor = HexToRgb(usersInfo[user].color);
      //             const progress = entriesCount / MAX_CHAPTER_HEAT_COUNT;
      //             const deltaColor = [heatMaxColor[0] - baseColorRgb[0], heatMaxColor[1] - baseColorRgb[1], heatMaxColor[2] - baseColorRgb[2]].map((value) => { return Math.floor(value * progress) });
      //             const heatColor = baseColorRgb.map((value, index) => { return value + deltaColor[index] });

      //             return heatColor
      //         })
      //         if (filteredUsers.length === 1) {
      //             userPresenceBackground = `rgb(${colors[0][0]}, ${colors[0][1]}, ${colors[0][2]})`
      //         }
      //         else if (filteredUsers.length === 2) {
      //             userPresenceBackground = `linear-gradient(to right, rgb(${colors[0][0]}, ${colors[0][1]}, ${colors[0][2]}), rgb(${colors[1][0]}, ${colors[1][1]}, ${colors[1][2]}))`
      //         }
      //         else if (filteredUsers.length === 3) {
      //             userPresenceBackground = `linear-gradient(to bottom right, rgb(${colors[0][0]}, ${colors[0][1]}, ${colors[0][2]}), rgb(255 255 255 / 0%) 70%), linear-gradient(to bottom left, rgb(${colors[1][0]}, ${colors[1][1]}, ${colors[1][2]}), rgb(255 255 255 / 0%) 70%), linear-gradient(to top, rgb(${colors[2][0]}, ${colors[2][1]}, ${colors[2][2]}), rgb(255 255 255 / 0%) 70%)`
      //         }
      //         else if (filteredUsers.length > 3) {
      //             userPresenceBackground = `linear-gradient(to bottom right, rgb(${colors[0][0]}, ${colors[0][1]}, ${colors[0][2]}), rgb(255 255 255 / 0%) 70%), linear-gradient(to bottom left, rgb(${colors[1][0]}, ${colors[1][1]}, ${colors[1][2]}), rgb(255 255 255 / 0%) 70%), linear-gradient(to top right, rgb(${colors[2][0]}, ${colors[2][1]}, ${colors[2][2]}), rgb(255 255 255 / 0%) 70%), linear-gradient(to top left, rgb(${colors[3][0]}, ${colors[3][1]}, ${colors[3][2]}), rgb(255 255 255 / 0%) 70%)`
      //         }
      //     }
      // }

      const displayContainer =
        contentVisualization === ContentVisualizationType.Container &&
        filteredUsers.length > 0 &&
        modes.get("Content");

      // const fixedBackground = isUserPresenceEnabled ? (displayContainer ? "transparent" : userPresenceBackground) : historyColors;

      let background = `rgb(${baseColorRgb[0]}, ${baseColorRgb[1]}, ${baseColorRgb[2]})`;
      let borderStyle = "solid";
      let borderColor = `rgb(${baseColorRgb[0]}, ${baseColorRgb[1]}, ${baseColorRgb[2]})`;
      let color = "black";

      switch (mode) {
        case ScriptureMap2DModes.Project:
          {
            if (hasProjectContent || checked) {
              const style =
                projectStateStyle[
                  project.structure[testament.name][sectionName][bookName][
                    index
                  ]
                ];
              background = style?.backgroundColor;
              borderStyle = checked ? "solid" : style?.borderStyle;
              borderColor = checked ? "#2AB80D" : style?.borderColor;
            }
          }
          break;

        case ScriptureMap2DModes.Viewer:
          {
            borderStyle = "hidden";
            if (isReadingHistoryEnabled && historyBackground) {
              background = historyBackground;
              color = historyColor;
            }
          }
          break;

        case ScriptureMap2DModes.Checkbox:
          {
            if (checked) borderColor = "#2AB80D";
          }
          break;
      }

      const chapterEntriesCounts = filteredUsers.map(([user]) => {
        const userContent = content.get(user);
        const bookContent = userContent.books[bookName];
        const entriesCount = bookContent[index + 1].length;
        return entriesCount;
      });
      const gridColumns = displayContainer ? "1fr" : null;
      const gridRows = displayContainer
        ? chapterEntriesCounts
            .map((count) => {
              return `${count}fr`;
            })
            .join(" ")
        : null;

      return {
        background,
        borderStyle,
        borderColor,
        displayContainer,
        gridColumns,
        gridRows,
        filteredUsers,
        color,
      };
    }, [
      isUserPresenceEnabled,
      isReadingHistoryEnabled,
      content,
      usersStatus,
      modes,
      usersInfo,
      contentVisualization,
      ContentVisualizationType,
      project,
      mode,
      projectFilters,
      checked,
      isInSelectionMode,
      historyBackground,
      historyColor,
    ]);

    // const { usersInChapter } = useMemo(() => {
    //     const usersInChapter = Object.keys(userPresence).filter((user) => {
    //         return userPresence[user].book === bookName && userPresence[user].chapter === (index + 1)
    //     })
    //     return { usersInChapter }
    // }, [userPresence, isUserPresenceEnabled, modes])

    /*{mode === ScriptureMap2DModes.Viewer && isUserPresenceEnabled && displayContainer && <div className="contentContainer" style={{
        gridTemplateColumns: gridColumns,
        gridTemplateRows: gridRows
    }}>
        {filteredUsers.map(([user]) => {
            return <div style={{ backgroundColor: usersInfo[user].color }}></div>
        })}
    </div>}

    
    {mode === ScriptureMap2DModes.Viewer && isUserPresenceEnabled && modes.get("Reading") && <>
        <PresentUserPresenceDotContainer bookName={bookName} chapterIndex={index} usersInChapter={usersInChapter} />
        <ReadingHistoryChapterNotificationContainer bookName={bookName} chapterIndex={index} />
        <UpcomingEventsChapterNotificationContainer bookName={bookName} chapterIndex={index} />
    </>}*/
    // {mode === ScriptureMap2DModes.Viewer && isReadingHistoryEnabled && <ReadingHistoryChapterNotificationContainer bookName={bookName} chapterIndex={index} />}
    return (
      <div
        className="chapter"
        onClick={handleChapterClick}
        onPointerDown={onHoldStart}
        onPointerUp={onHoldEnd}
        style={{
          background,
          borderStyle,
          borderColor,
          color,
        }}
      >
        {index + 1}
      </div>
    );
  }
);
