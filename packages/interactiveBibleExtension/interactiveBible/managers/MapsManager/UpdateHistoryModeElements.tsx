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
        const color = GetHistoryColor({element: elementData.element})
        setTagMask(elementData.element, 'color', color);
        if(elementData instanceof MapChapterData)
        {
            if(elementData.isSelected && Array.isArray(elementData.element.vars.chunksOfVerses) && elementData.element.vars.chunksOfVerses.length > 0)
            {
                elementData.element.vars.chunksOfVerses.forEach((chunk) => {
                    if(chunk.masks.isSelected)
                    {
                        if(Array.isArray(chunk.vars.verses) && chunk.vars.verses.length > 0)
                        {
                            chunk.vars.verses.forEach((verse) => {
                                setTagMask(verse, 'color', GetHistoryColor({element: verse}));
                            })
                        }
                    }
                    else
                    {
                        setTagMask(chunk, 'color', GetHistoryColor({element: chunk}));
                    }
                })
            }
        }
    }
})