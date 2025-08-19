import {LayoutBookData} from "bibleVizUtils.classes.LayoutBookData"
import {LayoutChapterData} from "bibleVizUtils.classes.LayoutChapterData"


const elementsData = [
    ...thisBot.vars.layoutBooksData, 
    ...thisBot.vars.layoutChaptersData, 
]
elementsData.forEach((elementData) => {
    const isElementAvailable = elementData.element && elementData.element.tags.isInUse && ((elementData instanceof LayoutBookData) ? !elementData.isSelected : true)
    if(isElementAvailable)
    {
        const color = BibleVizUtils.Functions.GetHistoryColor({element: elementData.element})
        setTagMask(elementData.element, 'color', color);
        if(elementData instanceof LayoutChapterData)
        {
            if(elementData.isSelected && Array.isArray(elementData.element.vars.chunksOfVerses) && elementData.element.vars.chunksOfVerses.length > 0)
            {
                elementData.element.vars.chunksOfVerses.forEach((chunk) => {
                    if(chunk.masks.isSelected)
                    {
                        if(Array.isArray(chunk.vars.verses) && chunk.vars.verses.length > 0)
                        {
                            chunk.vars.verses.forEach((verse) => {
                                setTagMask(verse, 'color', BibleVizUtils.Functions.GetHistoryColor({element: verse}));
                            })
                        }
                    }
                    else
                    {
                        setTagMask(chunk, 'color', BibleVizUtils.Functions.GetHistoryColor({element: chunk}));
                    }
                })
            }
        }
    }
})