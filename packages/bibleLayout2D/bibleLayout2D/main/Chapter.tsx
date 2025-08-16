const { useState, useCallback, useEffect, useMemo } = os.appHooks;
import { useBibleLayout2DContext } from "bibleLayout2D.main.BibleLayout2DContext"
// import { Tooltip } from "bibleLayout2D.main.Tooltip"
// import { PresentUserPresenceTooltipIcon } from "bibleLayout2D.main.PresentUserPresenceIcon"
import { useTestamentContext } from "bibleLayout2D.main.TestamentContext"

import {useClickAndHold} from "bibleLayout2D.main.CustomHooks"

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
//     const context = useBibleLayout2DContext();
//     const [containerRect, setContainerRect] = useState(null);

//     const { tooltipContent, tooltipAnchor, items } = useMemo(() => {
//         const dataSource = context[contextKey];
//         const items = Object.keys(dataSource).map((user) => {
//             const item = filterFn(dataSource[user], user, bookName, chapterIndex);
//             return item && { ...item, user };
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

//     if (items.length === 0) return null;

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
// const ReadingHistoryChapterNotificationContainer = ({ bookName, chapterIndex }) => (
//     <ChapterNotificationContainer
//         bookName={bookName}
//         chapterIndex={chapterIndex}
//         contextKey="readingHistory"
//         className="readingHistoryChapterNotificationContainer"
//         tooltipDirection="down"
//         filterFn={ (entries, _, book, chapterIndex) => {return entries.find((reading) => reading.book === book && reading.chapter === chapterIndex + 1)} }
//         renderTooltipItem={(reading) => (
//             <span key={reading.user}>
//                 <PresentUserPresenceTooltipIcon user={reading.user} />
//                 {`read ${reading.daysAgo} day${reading.daysAgo > 1 ? "s" : ""} ago`}
//             </span>
//         )}
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
//     const { userPresence } = useBibleLayout2DContext();

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

//     const { usersInfo } = useBibleLayout2DContext();

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

export const Chapter = ({ index, bookName, sectionName}) => {

    const {
        unsubscribeFromHistoryUpdate,
        subscribeToHistoryUpdate,
        isUserPresenceEnabled,
        content,
        usersStatus,
        // maxChapterHeatCount,
        modes,
        // userPresence,
        usersInfo,
        contentVisualization,
        ContentVisualizationType,
        // readingHistory,
        mode,
        selection,
        BibleLayout2DModes,
        project,
        projectFilters,
        projectStateStyle,
        onChapterClick,
        onChapterClickDependencies,
        onChapterClickAndHold,
        isInSelectionMode
    } = useBibleLayout2DContext();

    const { testament } = useTestamentContext();
    
    const checked = useMemo(() => { return selection[testament.name][sectionName][bookName][index] }, [selection])

    // const handleChapterClick = useCallback((e) => {
    //     const key = {testamentName: testament.name, sectionName, bookName, chapterIndex: index}
    //     onChapterClick(e, key, checked) 
    // }, onChapterClickDependencies);
    
    const {onHoldStart, onHoldEnd} = useClickAndHold({
        holdTime: 400, 
        holdCompleteCallback: (e) => { 
            const key = {testamentName: testament.name, sectionName, bookName, chapterIndex: index}
            onChapterClickAndHold(e, key) 
        },
        holdCancelCallback: (e) => {
            const key = {testamentName: testament.name, sectionName, bookName, chapterIndex: index}
            onChapterClick(e, key, checked) 
        },
        dependencies: onChapterClickDependencies
    })

    const getChapterHistoryColor = useCallback(() => {
        return GetHistoryColor({ data: { typeOfElement: BibleElementType.Chapter, key: `${bookName} ${index + 1}` } })
    }, [])

    const [historyColor, setHistoryColor] = useState(getChapterHistoryColor())

    const updateHistoryColor = useCallback(() => {
        setHistoryColor(getChapterHistoryColor())
    }, [])

    useEffect(() => {
        subscribeToHistoryUpdate(updateHistoryColor)
        return () => { unsubscribeFromHistoryUpdate(updateHistoryColor) }
    }, [])

    const { background, borderStyle, borderColor, /*displayContainer, gridColumns, gridRows, filteredUsers*/ } = useMemo(() => {

        const baseColor = [227, 227, 227];
        const hasProjectContent = project && mode === BibleLayout2DModes.Project && (isInSelectionMode || projectFilters.get(project.structure[testament.name][sectionName][bookName][index]));

        const filteredUsers = Array.from(usersStatus).filter(([user, enabled]) => {
            return enabled && content.get(user).books?.[bookName]?.[index + 1]?.length > 0
        });
        // let userPresenceBackground = `rgb(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]})`;
        // if (modes.get("Content")) {
        //     if (filteredUsers.length === 0) {
        //         userPresenceBackground = `rgb(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]})`
        //     }
        //     else {
        //         const colors = filteredUsers.map(([user]) => {
        //             const userContent = content.get(user);
        //             const bookContent = userContent.books[bookName];
        //             const entriesCount = Math.min(bookContent[index + 1].length, maxChapterHeatCount);

        //             const heatMaxColor = HexToRgb(usersInfo[user].color);
        //             const progress = entriesCount / maxChapterHeatCount;
        //             const deltaColor = [heatMaxColor[0] - baseColor[0], heatMaxColor[1] - baseColor[1], heatMaxColor[2] - baseColor[2]].map((value) => { return Math.floor(value * progress) });
        //             const heatColor = baseColor.map((value, index) => { return value + deltaColor[index] });

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

        const displayContainer = contentVisualization === ContentVisualizationType.Container && filteredUsers.length > 0 && modes.get("Content")

        // const fixedBackground = isUserPresenceEnabled ? (displayContainer ? "transparent" : userPresenceBackground) : historyColor;

        let background = `rgb(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]})`
        let borderStyle = "solid";
        let borderColor = `rgb(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]})`;

        switch(mode)
        {
            case BibleLayout2DModes.Project: {
                if(hasProjectContent || checked)
                {
                    const style = projectStateStyle[project.structure[testament.name][sectionName][bookName][index]];
                    background = style?.backgroundColor;
                    borderStyle = checked ? "solid" : style?.borderStyle;
                    borderColor = checked ? "#2AB80D" : style?.borderColor;
                }
            }
            break;

            // case BibleLayout2DModes.Viewer: {

            // }
            // break;

            case BibleLayout2DModes.Checkbox: {
                if(checked) borderColor = "#2AB80D"
            }
            break;
        }

        const chapterEntriesCounts = filteredUsers.map(([user]) => {
            const userContent = content.get(user);
            const bookContent = userContent.books[bookName];
            const entriesCount = bookContent[index + 1].length;
            return entriesCount;
        })
        const gridColumns = displayContainer ? "1fr" : null;
        const gridRows = displayContainer ? chapterEntriesCounts.map((count) => { return `${count}fr` }).join(' ') : null;

        return { background, borderStyle, borderColor, displayContainer, gridColumns, gridRows, filteredUsers }
    }, [
        historyColor,
        isUserPresenceEnabled,
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
        isInSelectionMode
    ])

    // const { usersInChapter } = useMemo(() => {
    //     const usersInChapter = Object.keys(userPresence).filter((user) => {
    //         return userPresence[user].book === bookName && userPresence[user].chapter === (index + 1)
    //     })
    //     return { usersInChapter }
    // }, [userPresence, isUserPresenceEnabled, modes])

    /*{mode === BibleLayout2DModes.Viewer && isUserPresenceEnabled && displayContainer && <div className="contentContainer" style={{
        gridTemplateColumns: gridColumns,
        gridTemplateRows: gridRows
    }}>
        {filteredUsers.map(([user]) => {
            return <div style={{ backgroundColor: usersInfo[user].color }}></div>
        })}
    </div>}

    
    {mode === BibleLayout2DModes.Viewer && isUserPresenceEnabled && modes.get("Reading") && <>
        <PresentUserPresenceDotContainer bookName={bookName} chapterIndex={index} usersInChapter={usersInChapter} />
        <ReadingHistoryChapterNotificationContainer bookName={bookName} chapterIndex={index} />
        <UpcomingEventsChapterNotificationContainer bookName={bookName} chapterIndex={index} />
    </>}*/
    return (
        <div
            className="chapter"
            onClick={() => {} /*handleChapterClick*/}
            onPointerDown={onHoldStart}
            onPointerUp={onHoldEnd}
            style={{
                background,
                borderStyle,
                borderColor
            }}
        >
            {index + 1}
        </div>
    )
}