import {LayoutBookData} from "bibleLayout3D.main.LayoutBookData"
import {LayoutChapterData} from "bibleLayout3D.main.LayoutChapterData"

const elementsData = [
    ...thisBot.vars.layoutBooksData, 
    ...thisBot.vars.layoutChaptersData, 
]

elementsData.forEach((elementData) => {
    const isElementAvailable = elementData.element && elementData.element.tags.isInUse && ((elementData instanceof LayoutBookData) ? !elementData.isSelected : true)

    if(isElementAvailable)
    {
        if(elementData instanceof LayoutChapterData && elementData.isSelected)
        {
            const layoutData = thisBot.GetLayoutDataById({layoutId: elementData.parentDataIds.layoutId});
            setTagMask(elementData.element, 'color', (elementData.isSelected && !elementData.element.masks.isExpanded) ? layoutData.chapterSelectColor : (elementData.highlightColor ?? elementData.element.tags.initialColor));

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