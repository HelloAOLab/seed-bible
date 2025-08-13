import {MapBookData} from "interactiveBible.managers.MapsManager.MapBookData"
import {MapChapterData} from "interactiveBible.managers.MapsManager.MapChapterData"

const elementsData = [
    ...thisBot.vars.mapBooksData, 
    ...thisBot.vars.mapChaptersData, 
]

elementsData.forEach((elementData) => {
    const isElementAvailable = elementData.element && elementData.element.tags.isInUse && ((elementData instanceof MapBookData) ? !elementData.isSelected : true)

    if(isElementAvailable)
    {
        if(elementData instanceof MapChapterData && elementData.isSelected)
        {
            const mapData = thisBot.GetMapDataById({mapId: elementData.parentDataIds.mapId});
            setTagMask(elementData.element, 'color', (elementData.isSelected && !elementData.element.masks.isExpanded) ? mapData.chapterSelectColor : (elementData.highlightColor ?? elementData.element.tags.initialColor));

            if(Array.isArray(elementData.element.vars.chunksOfVerses) && elementData.element.vars.chunksOfVerses.length > 0)
            {
                elementData.element.vars.chunksOfVerses.forEach((chunk) => {
                    if(chunk.masks.isSelected)
                    {
                        if(Array.isArray(chunk.vars.verses) && chunk.vars.verses.length > 0)
                        {
                            chunk.vars.verses.forEach((verse) => {
                                const verseHighlightInfo = elementData.GetHighlightInfoByKey(verse.masks.versePath)
                                setTagMask(verse, 'color', (verseHighlightInfo ? verseHighlightInfo.color : verse.tags.initialColor))
                            })
                        }
                    }
                    else
                    {
                        const chunkHighlightInfo = elementData.GetHighlightInfoByKey(chunk.masks.chunkPath)
                        setTagMask(chunk, "color", (chunkHighlightInfo ? chunkHighlightInfo.color : chunk.tags.initialColor));
                    }
                })
            }
        }
        else
        {
            setTagMask(elementData.element, "color", (elementData.highlightColor ?? elementData.element.tags.initialColor));
        }
    }
})