import {TestamentData} from "managers.StacksManager.TestamentData"
import {SectionData} from "managers.StacksManager.SectionData"
import {SectionBookData} from "managers.StacksManager.SectionBookData"
import {BookData} from "managers.StacksManager.BookData"
import {ChapterData} from "managers.StacksManager.ChapterData"

const elementsData = [
    ...thisBot.vars.testamentsData, 
    ...thisBot.vars.sectionsData, 
    ...thisBot.vars.sectionBooksData, 
    ...thisBot.vars.booksData, 
    ...thisBot.vars.chaptersData
]
elementsData.forEach((elementData) => {
    const isElementAvailable = elementData.element && ((elementData instanceof TestamentData) ? !elementData.isSplitIntoSections :
        (elementData instanceof SectionData) ? !elementData.isSplitIntoBooks :
            ((elementData instanceof SectionBookData) || (elementData instanceof BookData)) ? !elementData.isSelected : true)
    if(isElementAvailable)
    {
        let color = GetHistoryColor({element: elementData.element})
        setTagMask(elementData.element, 'color', color);
        if(color != InstanceManager.tags.historyNullColor)
        {
            if(elementData instanceof ChapterData)
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
    }
})