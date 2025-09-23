/**
 * Resets the data for all pieces within the Bible stack, including testaments, sections, books, and chapters.
 * 
 * This function iterates over the Bible's data structure and releases any associated visual pieces back to the object pool. 
 * It also resets various states and properties, including whether pieces are active, selected, split, or hidden.
 * 
 * @param {Object} that - The context object containing the Bible data.
 * @param {StackBibleData} that.bibleData - The data structure representing the current Bible, including testaments and sections.
 * 
 * @example
 * StacksManger.ResetStackData({ bibleData: someBibleData });
 */

const {bibleData} = that;

for(const testamentData of bibleData.childrenData)
{
    if(testamentData.piece)
    {
        ObjectPooler.ReleaseObject({obj: testamentData.piece, tag: testamentData.piece.tags.poolTag});
        testamentData.piece = null;
    }
    testamentData.isSplitIntoSections = true;
    testamentData.isActive = false;
    for(const sectionData of testamentData.childrenData)
    {
        if(sectionData.piece)
        {
            ObjectPooler.ReleaseObject({obj: sectionData.piece, tag: sectionData.piece.tags.poolTag});
            sectionData.piece = null;
        }
        if(sectionData instanceof StackSectionBookData)
        {
            sectionData.isSelected = false;
            sectionData.queuedChapterData = null;
            sectionData.currentSelectedChapterData = null;
            sectionData.currentShape = BibleVizUtils.Data.tags.BookShapeType.Regular;
            sectionData.isActive = false
            for(const chapterData of sectionData.childrenData)
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
            for(const level of sectionData.childrenData)
            {
                for(const bookData of level)
                {
                    if(bookData.piece)
                    {
                        ObjectPooler.ReleaseObject({obj: bookData.piece, tag: bookData.piece.tags.poolTag});
                        bookData.piece = null;
                    }
                    bookData.isActive = false;
                    bookData.isSelected = false;
                    bookData.queuedChapterData = null;
                    bookData.currentSelectedChapterData = null;
                    bookData.currentShape = null;      
                    for(const chapterData of bookData.childrenData)
                    {
                        chapterData.isHidden = false;
                    }
                }
            }
        }
    }
}