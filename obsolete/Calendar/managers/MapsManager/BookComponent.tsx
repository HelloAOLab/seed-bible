import { useMapPanelContext } from "managers.MapsManager.MapPanelContext"
import { Chapter } from "managers.MapsManager.ChapterComponent"
const { useMemo, useState, useCallback, useEffect } = os.appHooks;

export const Book = ({
    section,
    mapPanelBookInfo,
    bookIndex,
    isLastSectionInTestament,
    isFirstSectionInTestament,
    bookCoverBackgroundColor,
    toggleShowSection,
    isFirstBookInSection,
    showingSection,
    hidden
}) => {

    const { scaleFactor, showLabels, showingAllChapters } = useMapPanelContext();
    
    const [showChapters, setShowChapters] = useState(false);
    const [sectionNameHovered, setSectionNameHovered] = useState(false);

    const chaptersCount = useMemo(() => { return StacksManager.tags.booksStaticInfo[mapPanelBookInfo.name].numberOfChapters }, [])
    const shortName = useMemo(() => { return StacksManager.tags.booksStaticInfo[mapPanelBookInfo.name].abbreviation; }, [])
    const bookCoverHeight = useMemo(() => { return `${Math.round(thisBot.GetMapBookHeightByName({bookName: mapPanelBookInfo.name})  * scaleFactor)}px` }, [scaleFactor])
    const isLastBookInSection = useMemo(() => { return bookIndex == (section.books.length - 1) }, [])
    const isOnlyBook = useMemo(() => { return isFirstBookInSection && isLastBookInSection }, [])
    const isMiddleBook = useMemo(() => { return (!isFirstBookInSection || !isFirstSectionInTestament) && (!isLastBookInSection || !isLastSectionInTestament) }, []);


    const handlePointerEnter = useCallback(() => {
        if(isFirstBookInSection) setSectionNameHovered(true)
    }, [isFirstBookInSection])

    const handlePointerLeave = useCallback(() => {
        if(isFirstBookInSection) setSectionNameHovered(false)
    }, [isFirstBookInSection])

    const sectionNameTextColor = useMemo(() => {
        return GetTextColorBasedOnBackground(section.color)
    }, [])

    useEffect(() => {
        setShowChapters(showingAllChapters);
    }, [showingAllChapters])

    return (
        <div className={`mapBookContainer${hidden ? " hidden" : ""}${showingSection ? "" : " collapsed"}${isLastSectionInTestament ? " lastSection" : ""}${isFirstSectionInTestament ? " firstSection" : ""}${isFirstBookInSection ? " firstBook" : ""}${isLastBookInSection ? " lastBook" : ""}${isOnlyBook ? " onlyBook" : ""}${isMiddleBook ? " middleBook" : ""}`}>
            { showLabels && <div 
                className="sectionNameContainer"
                onPointerEnter={handlePointerEnter}
                onPointerLeave={handlePointerLeave}
                onClick={() => {if(isFirstBookInSection) toggleShowSection(section)}}
                style={{
                    borderColor: isFirstBookInSection && section.color,
                    backgroundColor: isFirstBookInSection && (sectionNameHovered ? "#FFFFFF" : section.color)
                }}
            >
                <span style={{
                    color: sectionNameHovered ? section.color : sectionNameTextColor,
                }}>
                    { isFirstBookInSection && section.name }
                </span>
            </div> }
            { showingSection && <div 
                className={`mapBook${showChapters ? "" : " pointable"}`}
                onClick={() => {if(!showChapters) setShowChapters(true)}} 
                style={{ borderTopColor: showLabels ? section.color : "transparent" }}
            >
                <span className="bookName" onClick={() => {setShowChapters(prev => !prev)}}>
                    {shortName}
                </span>
                <div 
                    className={`bookCover${showChapters ? " invisible" : ""}`}
                    style={{
                        height: bookCoverHeight, 
                        backgroundColor: bookCoverBackgroundColor
                    }}
                >
                    {showChapters && [...Array(chaptersCount)].map((_, index) => {
                        return <Chapter bookName={mapPanelBookInfo.name} index={index} />
                    })}
                </div>
            </div> }
        </div>
    )
}