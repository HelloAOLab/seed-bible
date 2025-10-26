import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext"
import { Chapter } from "scriptureMap2D.main.Chapter"
import { PresentUserPresenceBookIcon } from "scriptureMap2D.main.PresentUserPresenceIcon"
import { useTestamentContext } from "scriptureMap2D.main.TestamentContext"
import {useClickAndHold} from "scriptureMap2D.main.CustomHooks"
import { useTimeContext } from "scriptureMap2D.main.TimeContext"
const { useMemo, useState, useEffect, useCallback } = os.appHooks;

export const Book = ({
    bookInfo,
    bookCoverBackgroundColor,
    style,
    key,
    sectionName
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
        readingHistoryRange
    } = useScriptureMap2DContext();
    const { testament } = useTestamentContext() 
    const { tick } = useTimeContext();
    
    const [showChapters, setShowChapters] = useState(showingAllChapters);
    const {chaptersCount, shortName} = useMemo(() => { 
        return {
            chaptersCount: BibleVizUtils.Data.tags.booksStaticInfo[bookInfo.commonName].numberOfChapters,
            shortName: BibleVizUtils.Data.tags.booksStaticInfo[bookInfo.commonName].abbreviation
        } 
    }, [])

    const getBookHeight = useCallback(() => {
        
        const {chaptersInfo} = BibleVizUtils.Data.tags.booksStaticInfo[bookInfo.commonName];
        const amountOfRows = Math.ceil(chaptersInfo.length / BibleVizUtils.Data.tags.BibleLayoutMeasurements.Book2DMaxAmountOfColumns);
        const height = (amountOfRows * chapterHeight) + (chapterPadding * 2) + (chapterGap * (amountOfRows - 1))
        return height;

    }, [scaleFactor, chapterGap, chapterPadding, chapterHeight])
    
    const bookCoverHeight = useMemo(() => { return `${ getBookHeight() }px` }, [scaleFactor, getBookHeight, chapterGap, chapterPadding, chapterHeight]);

    const checked = useMemo(() => {
        return selection?.[testament.name]?.[sectionName]?.[bookInfo.commonName]?.every((chapter) => {return chapter});
    }, [selection])

    const {onHoldStart, onHoldEnd} = useClickAndHold({
        holdTime: 500, 
        holdCompleteCallback: () => {
            const key = {testamentName: testament.name, sectionName, bookName: bookInfo.commonName}
            onBookNameClickAndHold(showChapters, key, checked);
        },
        holdCancelCallback: () => { setShowChapters(prev => !prev) },
        dependencies: [...onBookNameClickAndHoldDependencies, checked, showChapters]
    })

    useEffect(() => {
        setShowChapters(showingAllChapters);
    }, [showingAllChapters])

    const { fixedBackground, gridRows, displayContainer, gridColumns, filteredUsers } = useMemo(() => {

        const baseColor = [211, 211, 211];

        let userPresenceBackground = `rgb(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]})`;

        const filteredUsers = Array.from(usersStatus).filter(([user, enabled]) => {
            const bookContent = content.get(user).books?.[bookInfo.commonName]
            return enabled && bookContent && Object.keys(bookContent).some((key) => {return bookContent[key].length > 0})
        });

        if(modes.get("Content"))
        {
            if(filteredUsers.length === 0)
            {
                userPresenceBackground = `rgb(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]})`
            }
            else
            {
                const colors = filteredUsers.map(([user]) => {
                    const userContent = content.get(user);
                    const bookContent = userContent.books[bookInfo.commonName];
                    const entriesCount = Object.keys(bookContent).reduce((currentValue, key) => {
                        return currentValue + Math.min(bookContent[key].length, MAX_CHAPTER_HEAT_COUNT)
                    }, 0)
                    
                    const heatMaxColor = HexToRgb(usersInfo[user].color);
                    const normalizer = 3;
                    const progress = Math.min(entriesCount / (MAX_CHAPTER_HEAT_COUNT * chaptersCount / normalizer), 1);
                    const deltaColor = [heatMaxColor[0] - baseColor[0], heatMaxColor[1] - baseColor[1], heatMaxColor[2] - baseColor[2]].map((value) => {return Math.floor(value * progress)});
                    const heatColor = baseColor.map((value, index) => {return value + deltaColor[index]});

                    return heatColor
                })
                if(filteredUsers.length === 1)
                {
                    userPresenceBackground = `rgb(${colors[0][0]}, ${colors[0][1]}, ${colors[0][2]})`
                }
                else if(filteredUsers.length === 2)
                {
                    userPresenceBackground = `linear-gradient(to right, rgb(${colors[0][0]}, ${colors[0][1]}, ${colors[0][2]}), rgb(${colors[1][0]}, ${colors[1][1]}, ${colors[1][2]}))`
                }
                else if(filteredUsers.length === 3)
                {
                    userPresenceBackground = `linear-gradient(to bottom right, rgb(${colors[0][0]}, ${colors[0][1]}, ${colors[0][2]}), rgb(255 255 255 / 0%) 70%), linear-gradient(to bottom left, rgb(${colors[1][0]}, ${colors[1][1]}, ${colors[1][2]}), rgb(255 255 255 / 0%) 70%), linear-gradient(to top, rgb(${colors[2][0]}, ${colors[2][1]}, ${colors[2][2]}), rgb(255 255 255 / 0%) 70%)`
                }
                else if(filteredUsers.length > 3)
                {
                    userPresenceBackground = `linear-gradient(to bottom right, rgb(${colors[0][0]}, ${colors[0][1]}, ${colors[0][2]}), rgb(255 255 255 / 0%) 70%), linear-gradient(to bottom left, rgb(${colors[1][0]}, ${colors[1][1]}, ${colors[1][2]}), rgb(255 255 255 / 0%) 70%), linear-gradient(to top right, rgb(${colors[2][0]}, ${colors[2][1]}, ${colors[2][2]}), rgb(255 255 255 / 0%) 70%), linear-gradient(to top left, rgb(${colors[3][0]}, ${colors[3][1]}, ${colors[3][2]}), rgb(255 255 255 / 0%) 70%)`
                }
            }
        }

        const displayContainer = contentVisualization === ContentVisualizationType.Container && filteredUsers.length > 0 && modes.get("Content")

        const fixedBackground = isUserPresenceEnabled ? (displayContainer ?  "transparent" : userPresenceBackground) : bookCoverBackgroundColor;
        
        const bookEntriesCounts = filteredUsers.map(([user]) => {
            const userContent = content.get(user);
            const bookContent = userContent.books[bookInfo.commonName];
            const entriesCount = Object.keys(bookContent).reduce((currentValue, key) => {
                return currentValue + bookContent[key].length
            }, 0)
            return entriesCount;
        })
        const gridColumns = displayContainer && !showChapters ? "1fr" : null;
        const gridRows = displayContainer && !showChapters ? bookEntriesCounts.map((count) => {return `${count}fr`}).join(' ') : null

        return { fixedBackground, gridRows, displayContainer, gridColumns, filteredUsers }
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
        showChapters
    ])

    const usersInBook = useMemo(() => {
        return Object.keys(userPresence).filter((user) => {
            return userPresence[user].book === bookInfo.commonName
        })
    }, [userPresence, isUserPresenceEnabled, modes])

    const chapterUserEntriesMap = useMemo(() => {
        return new Map([...Array(chaptersCount)].map((_, index) => {
            const chapter = index + 1;
            const userEntries = Object.keys(filteredReadingHistory).map((userId) => {
                const entries = filteredReadingHistory[userId]?.[shortName]?.[chapter];
                if(entries && (!readingHistoryRange || entries.some((entry) => {return BibleVizUtils.Functions.IsValueBetween({value: entry.start, min: readingHistoryRange.start, max: readingHistoryRange.end}) || BibleVizUtils.Functions.IsValueBetween({value: entry.end, min: readingHistoryRange.start, max: readingHistoryRange.end})})))
                {
                    return {userId, entries}
                }
                return null
            }).filter(Boolean)
            return [chapter, userEntries]
        }))

    }, [filteredReadingHistory, readingHistoryRange])

    const historyColorsMap = useMemo(() => {

        if(!isReadingHistoryEnabled) return null;

        return new Map([...Array(chaptersCount)].map((_, index) => {
            const chapter = index + 1;
            const userEntries = chapterUserEntriesMap.get(chapter)
            let colors;

            if(userEntries.length === 0) colors = [CHAPTER_BASE_BACKGROUND_COLOR]
            else
            {
                colors = userEntries.map(({userId, entries}) => {    
                    return BibleVizUtils.Functions.GetHistoryColor({
                        baseColor: CHAPTER_BASE_BACKGROUND_COLOR, 
                        userColor: userId === configBot.id ? BibleVizUtils.Data.tags.myUserColor : (BibleVizUtils.Data.vars.userPresenceData?.[userId]?.user?.color ?? thisBot.vars.FakeReadingHistoryUsersColorMap?.get(userId) ?? "pink"), 
                        reading: entries,
                        range: readingHistoryRange
                    })
                })
            }
    
            return [chapter, colors];
        }))


    }, [readingHistoryRange, chapterUserEntriesMap, tick, isReadingHistoryEnabled])

    return (
        <div 
            className={`mapBookContainer${showChapters ? "" : " pointable"}`} 
            style={style}
            key={key}
            onClick={() => {
                if(!showChapters) setShowChapters(true)
            }}
        >
            <span className="bookName" 
                onPointerDown={(e) => {
                    e.stopPropagation();
                    onHoldStart(e)
                }}
                onPointerUp={(e) => {
                    e.stopPropagation();
                    onHoldEnd(e)
                }}
                onClick={(e) => {e.stopPropagation()}}
            >
                {shortName}
            </span>
            <div 
                className={`bookCover${showChapters ? " invisible" : (displayContainer ? " displayingContainer" : "")}`}
                style={{
                    height: bookCoverHeight,
                    background: fixedBackground,
                    gridTemplateColumns: gridColumns,
                    gridTemplateRows: gridRows
                }}
            >
                {showChapters ? [...Array(chaptersCount)].map((_, index) => {
                    const chapter = index + 1
                    let historyBackground = null;
                    let historyColor = null;
                    
                    if(isReadingHistoryEnabled)
                    {
                        historyBackground = BibleVizUtils.Functions.GetHistoryColorConicGradient(historyColorsMap.get(chapter));
                        historyColor = BibleVizUtils.Functions.GetTextColorBasedOnBackground({backgroundColor: historyColorsMap.get(chapter)});
                    }

                    return <Chapter 
                        key={`${shortName}-${chapter}`} 
                        sectionName={sectionName} 
                        bookName={bookInfo.commonName} 
                        index={index}  
                        historyBackground={historyBackground}
                        historyColor={historyColor}
                    />
                }) : (<>
                    {isUserPresenceEnabled && modes.get("Reading") && usersInBook?.length > 0 && usersInBook.map((user, index) => {
                        return <PresentUserPresenceBookIcon index={index} user={user} length={usersInBook.length} />
                    })}
                    {isUserPresenceEnabled && displayContainer && filteredUsers.map(([user]) => {
                        return <div style={{backgroundColor: usersInfo[user].color}}></div>
                    })}
                </>)}
            </div>
        </div>
    )
}