import { useTestamentContext } from "interactiveBible.managers.MapsManager.TestamentContext"
import { useMapToolContext } from "interactiveBible.managers.MapsManager.MapToolContext"
import { Book } from "interactiveBible.managers.MapsManager.Book"
import {useResizeObserver} from "interactiveBible.managers.MapsManager.CustomHooks"
import {SectionToggle} from "interactiveBible.managers.MapsManager.SectionToggle"
const { useMemo, useCallback, useState, useEffect, useRef } = os.appHooks;

export const TestamentContent = ({hidden}) => {

    const {
        arrangementIndex,
        SIZE_RATIO_4,
        getRawSizeByRatio,
        scaleFactor,
        showLabels
    } = useMapToolContext();

    const contentRef = useRef(null);
    const {width: contentWidth} = useResizeObserver(contentRef);
    const { testament, testamentIndex } = useTestamentContext()
    
    const reversedSections = useMemo(() => {
        return testament.sections.toReversed()
    }, []);
    let sectionLevelsColorsMap = useMemo(() => {
        const map = new Map();
        
        reversedSections.forEach((section, sectionIndex) => {
            const levelColorsKey = `${testamentIndex} ${sectionIndex}`
            const sectionLevelsColors = GetChildrenLevelColors({
                sectionColorRGB: HexToRgb(section.color), 
                colorRange: section.customColorRange ?? 70, 
                levelsLength: section.books.length
            })
            map.set(levelColorsKey, sectionLevelsColors);
        })
        return map;
    }, [reversedSections])

    const [sectionsShown, setSectionsShown] = useState(new Map(reversedSections.map((section) => {return [section, true]})))
    const toggleShowSection = useCallback((section) => {
        const copy = new Map(sectionsShown);
        copy.set(section, !copy.get(section));
        setSectionsShown(copy);
    }, [testament, sectionsShown])

    const getFittingItemCount = useCallback((containerWidth, itemWidth, gapWidth) => {
        if (itemWidth <= 0) return 0;
        
        const totalSpacePerItem = itemWidth + gapWidth;
        const maxCount = Math.floor((containerWidth + gapWidth) / totalSpacePerItem);
        
        return Math.max(0, maxCount);
    }, [])
    
    const { fittingBooksCount, rowPairCount } = useMemo(() => {
        const bookWidth = getRawSizeByRatio(MapElementMeasurements.BookScaleX);
        const gridGap = getRawSizeByRatio(SIZE_RATIO_4);
        const fittingBooksCount = getFittingItemCount(contentWidth, bookWidth, gridGap);
        const totalBooks = reversedSections.flatMap((section) => {return section.books}).length;
        const rowPairCount = Math.ceil(totalBooks / fittingBooksCount);

        return { fittingBooksCount, rowPairCount }
    }, [scaleFactor, contentWidth, testament]);

    const renderSections = useCallback(() => {

        let elements = [];
        let sectionIndex = 0;
        let bookIndex = 0;
        let currentBookColumn = 1;

        if(fittingBooksCount === 0) return elements


        for( let i = 1 ; i <= rowPairCount ; i++ )
        {
            while(currentBookColumn <= fittingBooksCount && sectionIndex < reversedSections.length)
            {
                if(bookIndex === 0 && showLabels)
                {
                    const sectionOcupiedColumns = Math.min(fittingBooksCount - (currentBookColumn - 1), reversedSections[sectionIndex].books.length);
                    elements.push(<SectionToggle
                        key={`${arrangementIndex} ${testamentIndex} ${sectionIndex}`}
                        section={reversedSections[sectionIndex]}
                        toggleShowSection={toggleShowSection}
                        showingContent={sectionsShown.get(reversedSections[sectionIndex])}
                        style={{
                            backgroundColor: `${reversedSections[sectionIndex].color}80`,
                            borderBottomColor: reversedSections[sectionIndex].color,
                            gridRow: `${(i * 2) - 1} / ${i * 2}`,
                            gridColumn: `${currentBookColumn} / ${sectionsShown.get(reversedSections[sectionIndex]) ? (currentBookColumn + sectionOcupiedColumns) : (currentBookColumn + 1)}`
                        }}
                    />)
                }

                if(sectionsShown.get(reversedSections[sectionIndex]))
                {
                    const levelColorsKey = `${testamentIndex} ${sectionIndex}`
                    const color = reversedSections[sectionIndex].books.toReversed()[bookIndex].customColor ?? sectionLevelsColorsMap.get(levelColorsKey).toReversed()[bookIndex];

                    elements.push(
                        <Book 
                            key={`${arrangementIndex} ${testamentIndex} ${sectionIndex} ${bookIndex}`}
                            bookInfo={reversedSections[sectionIndex].books.toReversed()[bookIndex]} 
                            bookCoverBackgroundColor={color}
                            sectionName={reversedSections[sectionIndex].name}
                            style={{
                                gridRow: `${i * 2} / ${(i * 2) + 1}`,
                                gridColumn: `${currentBookColumn} / ${currentBookColumn + 1}`
                            }}
                        />
                    )
                    bookIndex++
                    if(bookIndex === reversedSections[sectionIndex].books.length)
                    {
                        bookIndex = 0;
                        sectionIndex++;
                    }
                }
                else sectionIndex++;

                currentBookColumn++
            }
            currentBookColumn = 1;
        }
        return elements
    }, [fittingBooksCount, rowPairCount, reversedSections, sectionLevelsColorsMap, sectionsShown, showLabels])

    return (
        <div 
            className={`testamentContent ${hidden ? "hidden" : ""}`} ref={contentRef} 
            style={{
                
            }}
        >
            {renderSections()}
        </div>
    )
}
                    