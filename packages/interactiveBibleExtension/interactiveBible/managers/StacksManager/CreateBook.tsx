/**
    * Creates a new `BookData` instance, populates it with chapter information, and stores it in the bot's books data.
    * 
    * @param {Object} that - Context containing various data properties.
    * @param {number} that.arrangementIndex - Index of the current arrangement.
    * @param {number} that.testamentIndex - Index of the current testament.
    * @param {string} that.sectionIndex - Index of the section within the testament.
    * @param {number} that.levelIndex - Index of the level to which the book belongs to within the stack.
    * @param {number} that.bookIndex - Index of the book in the section.
    * @param {number} that.bookLevelIndex - Index of the book inside the level.
    * @param {number} that.levelsLenght - Amount of levels in the section.
    * @param {boolean} that.isInsideBible - Flag indicating if the current data is inside the Bible.
    * @param {boolean} that.isInsideTestament - Flag indicating if the current data is inside the Testament.
    * @param {boolean} that.isInsideSection - Flag indicating if the current data is inside the Section.
    * @param {BibleData} that.bibleData? - Is optional and is the BibleData instance to where the BookData will be linked to.
    * @param {TestamentData} that.testamentData? - Is optional and is the TestamentData instance to where the BookData will be linked to.
    * @param {SectionData} that.sectionData? - Is optional and is the SectionData instance to where the BookData will be linked to.
    * @param {boolean} that.isHidden? - Flag indicating whether the book should be hidden.
    * 
    * @returns {BookData} bookData - The newly created `BookData` object with chapter data included.
    * @throws {Error} - If the creation of chapter data fails.
    * 
    * @example
    * const bookData = await StacksManager.CreateBook({
    *     arrangementIndex: someArrangementIndex, 
    *     testamentIndex: someTestamentIndex, 
    *     sectionIndex: someSectionIndex, 
    *     levelIndex: someLevelIndex, 
    *     bookIndex: someBookIndex, 
    *     bookLevelIndex: someBookLevelIndex, 
    *     levelsLenght: someLevelsLenght, 
    *     isInsideBible: true, 
    *     isInsideTestament: true, 
    *     isInsideSection: true,
    *     bibleData: someBibleData,
    *     testamentData: someTestamentData,
    *     sectionData: someSectionData,
    *     isHidden: false
    * });
*/

import {BookData} from "interactiveBible.managers.StacksManager.BookData"
import {ParentDataIds} from "interactiveBible.managers.StacksManager.ParentDataIds"

const {
    arrangementIndex, 
    testamentIndex, 
    sectionIndex, 
    levelIndex, 
    bookIndex, 
    bookLevelIndex,
    levelsLenght, 
    isInsideBible, 
    isInsideTestament, 
    isInsideSection,
    bibleData,
    testamentData,
    sectionData,
    isHidden = false,
} = that;
const bookInfo = InstanceManager.vars.fixedArrangementsInfo[arrangementIndex].testaments[testamentIndex].sections[sectionIndex].books[bookIndex];
const parentDataIds = new ParentDataIds({bibleId: bibleData?.id, testamentId: testamentData?.id, sectionId: sectionData?.id});
const creationInfo = {arrangementIndex, testamentIndex, sectionIndex, levelIndex, bookIndex, bookLevelIndex, levelsLenght};
const bookData = new BookData({
    element: null, 
    elementInfo: bookInfo, 
    id: uuid(), 
    isInsideBible, 
    isInsideTestament, 
    isInsideSection, 
    parentDataIds, 
    creationInfo
});
let chaptersData = await Promise.all(StacksManager.tags.booksStaticInfo[bookInfo.commonName].chaptersInfo.map((chapterInfo) => {
    return thisBot.CreateChapter({
        chapterInfo, 
        isInsideBible: true, 
        isInsideBook: true, 
        bibleData, 
        testamentData, 
        sectionData, 
        bookData, 
        isHidden
    })
}))

bookData.SetChildrenData(chaptersData);
thisBot.vars.booksData.push(bookData);
return bookData;