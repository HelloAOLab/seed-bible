/**
 * Resets the data for all elements within the Bible stack, including testaments, sections, books, and chapters.
 * 
 * This function iterates over the Bible's data structure and releases any associated visual elements back to the object pool. 
 * It also resets various states and properties, including whether elements are active, selected, split, or hidden.
 * 
 * @param {Object} that - The context object containing the Bible data.
 * @param {BibleData} that.bibleData - The data structure representing the current Bible, including testaments and sections.
 * 
 * @example
 * StacksManger.ResetStackData({ bibleData: someBibleData });
 */

import {SectionBookData} from 'managers.StacksManager.SectionBookData'

const {bibleData} = that;

for(let testamentData of bibleData.childrenData)
{
    if(testamentData.element)
    {
        ObjectPooler.ReleaseObject({obj: testamentData.element, tag: testamentData.element.tags.poolTag});
        testamentData.element = null;
    }
    testamentData.isSplitIntoSections = true;
    testamentData.isActive = false;
    for(let sectionData of testamentData.childrenData)
    {
        if(sectionData.element)
        {
            ObjectPooler.ReleaseObject({obj: sectionData.element, tag: sectionData.element.tags.poolTag});
            sectionData.element = null;
        }
        if(sectionData instanceof SectionBookData)
        {
            sectionData.isSelected = false;
            sectionData.queuedChapterData = null;
            sectionData.currentSelectedChapterData = null;
            sectionData.currentShape = BookShapeType.Regular;
            sectionData.isActive = false
            for(let chapterData of sectionData.childrenData)
            {
                chapterData.isHidden = false;
            }
        }
        else
        {
            sectionData.shadow = null;
            sectionData.isInExplodedView = false;
            sectionData.isSplitIntoBooks = false;
            sectionData.isActive = false
            for(let level of sectionData.childrenData)
            {
                for(let bookData of level)
                {
                    if(bookData.element)
                    {
                        ObjectPooler.ReleaseObject({obj: bookData.element, tag: bookData.element.tags.poolTag});
                        bookData.element = null;
                    }
                    bookData.isActive = false;
                    bookData.isSelected = false;
                    bookData.queuedChapterData = null;
                    bookData.currentSelectedChapterData = null;
                    bookData.currentShape = null;      
                    for(let chapterData of bookData.childrenData)
                    {
                        chapterData.isHidden = false;
                    }
                }
            }
        }
    }
}