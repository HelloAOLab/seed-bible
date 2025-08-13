/**
    * Creates a new `ChapterData` instance and stores it in the bot's chapters data.
    * 
    * @param {Object} that - Context containing various data properties.
    * @param {Object} that.chapterInfo - Information related to the chapter being created.
    * @param {boolean} that.isInsideBible - Flag indicating if the chapter is inside the Bible.
    * @param {boolean} that.isInsideBook - Flag indicating if the chapter is inside the Book.
    * @param {BibleData} that.bibleData? - Is optional and is the BibleData instance to where the Chapterdata will be linked to.
    * @param {TestamentData} that.testamentData? - Is optional and is the TestamentData instance to where the Chapterdata will be linked to.
    * @param {SectionData} that.sectionData? - Is optional and is the SectionData instance to where the Chapterdata will be linked to.
    * @param {SectionBookData} that.sectionBookData? - Is optional and is the SectionBookData instance to where the Chapterdata will be linked to.
    * @param {BookData} that.bookData? - Is optional and is the BookData instance to where the Chapterdata will be linked to.
    * @param {boolean} that.isHidden? - Flag indicating whether the chapter should be hidden.
    * 
    * @returns {ChapterData} chapterData - The newly created `ChapterData` object.
    * 
    * @example
    * const chapterData = thisBot.CreateChapter({
    *     chapterInfo: someChapterInfo, 
    *     isInsideBible: true, 
    *     isInsideBook: true, 
    *     bibleData: someBibleData, 
    *     testamentData: someTestamentData, 
    *     sectionData: someSectionData, 
    *     bookData: someBookData, 
    *     isHidden: false
    * })
*/

import {ParentDataIds} from "interactiveBible.managers.StacksManager.ParentDataIds"
import {ChapterData} from "interactiveBible.managers.StacksManager.ChapterData"

const {chapterInfo, isInsideBible, isInsideBook, bibleData, testamentData, sectionData, sectionBookData, bookData, isHidden = false} = that;
const parentDataIds = new ParentDataIds({
    bibleId: bibleData?.id, 
    testamentId: testamentData?.id, 
    sectionBookId: sectionBookData?.id, 
    sectionId: sectionData?.id, 
    bookId: bookData?.id
});
const chapterData = new ChapterData({id: uuid(), elementInfo: chapterInfo, parentDataIds, isInsideBible, isInsideBook, isHidden})
thisBot.vars.chaptersData.push(chapterData);
return chapterData;