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
        if(elementData instanceof ChapterData)
        {
            if(elementData.isSelected)
            {
                if(elementData.element.masks.isOnTheGround) setTagMask(elementData.element, "color", elementData.highlightColor ?? elementData.element.tags.initialColor);
                else setTagMask(elementData.element, "color", elementData.highlightColor ?? elementData.element.tags.selectedColor);
                if(Array.isArray(elementData.element.vars.chunksOfVerses) && elementData.element.vars.chunksOfVerses.length > 0)
                {
                    elementData.element.vars.chunksOfVerses.forEach((chunk) => {
                        if(chunk.masks.isSelected)
                        {
                            if(Array.isArray(chunk.vars.verses) && chunk.vars.verses.length > 0)
                            {
                                chunk.vars.verses.forEach((verse) => {
                                    const chapterData = StacksManager.GetChapterDataById({id: verse.masks.chapterDataId});
                                    const verseHighlightInfo = chapterData.HighlightsInfo.find((currHighlightInfo) => {return currHighlightInfo.key == verse.masks.versePath})
                                    setTagMask(verse, 'color', (verseHighlightInfo ? verseHighlightInfo.color : verse.tags.initialColor))
                                })
                            }
                        }
                        else
                        {
                            const chapterData = StacksManager.GetChapterDataById({id: chunk.masks.chapterDataId});
                            const chunkHighlightInfo = chapterData.HighlightsInfo.find((currHighlightInfo) => {return currHighlightInfo.key == chunk.masks.chunkPath})
                            setTagMask(chunk, "color", (chunkHighlightInfo ? chunkHighlightInfo.color : chunk.tags.initialColor));
                        }
                    })
                }
            }
            else
            {
                setTagMask(elementData.element, "color", elementData.highlightColor ?? elementData.element.tags.initialColor);
            }
        }
        else
        {
            setTagMask(elementData.element, "color", (elementData.highlightColor ?? elementData.element.tags.initialColor));
        }
    }
})