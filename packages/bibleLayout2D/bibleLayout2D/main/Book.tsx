import { useBibleLayout2DContext } from "bibleLayout2D.main.BibleLayout2DContext"
import { Chapter } from "bibleLayout2D.main.Chapter"
import { PresentUserPresenceBookIcon } from "bibleLayout2D.main.PresentUserPresenceIcon"
import { useTestamentContext } from "bibleLayout2D.main.TestamentContext"
import {useClickAndHold} from "bibleLayout2D.main.CustomHooks"
const { useMemo, useState, useEffect, useCallback } = os.appHooks;

export const Book = ({
    bookInfo,
    bookCoverBackgroundColor,
    style,
    key,
    sectionName
}) => {

    const { 
        scaleFactor, 
        showingAllChapters, 
        isUserPresenceEnabled, 
        content, 
        modes, 
        usersStatus, 
        maxChapterHeatCount, 
        userPresence,
        usersInfo,
        contentVisualization,
        ContentVisualizationType,
        // mode,
        // BibleLayout2DModes,
        selection,
        // handleCheckboxChange,
        // isInSelectionMode,
        // setIsInSelectionMode,

        onBookNameClickAndHold,
        onBookNameClickAndHoldDependencies,

        chapterGap,
        chapterPadding,
    } = useBibleLayout2DContext();
    const { testament } = useTestamentContext() 
    
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
                        return currentValue + Math.min(bookContent[key].length, maxChapterHeatCount)
                    }, 0)
                    
                    const heatMaxColor = HexToRgb(usersInfo[user].color);
                    const normalizer = 3;
                    const progress = Math.min(entriesCount / (maxChapterHeatCount * chaptersCount / normalizer), 1);
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

    return (
        <div 
            className={`layoutBookContainer${showChapters ? "" : " pointable"}`} 
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
                    return <Chapter sectionName={sectionName} bookName={bookInfo.commonName} index={index} />
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