/**
    * Creates a new `StackChapterData` instance and stores it in the bot's chapters data.
    * 
    * @param {Object} that - Context containing various data properties.
    * @param {Object} that.chapterInfo - Information related to the chapter being created.
    * @param {boolean} that.isInsideBible - Flag indicating if the chapter is inside the Bible.
    * @param {boolean} that.isInsideBook - Flag indicating if the chapter is inside the Book.
    * @param {StackBibleData} that.bibleData? - Is optional and is the StackBibleData instance to where the Chapterdata will be linked to.
    * @param {StackTestamentData} that.testamentData? - Is optional and is the StackTestamentData instance to where the Chapterdata will be linked to.
    * @param {StackSectionData} that.sectionData? - Is optional and is the StackSectionData instance to where the Chapterdata will be linked to.
    * @param {StackSectionBookData} that.sectionBookData? - Is optional and is the StackSectionBookData instance to where the Chapterdata will be linked to.
    * @param {StackBookData} that.bookData? - Is optional and is the StackBookData instance to where the Chapterdata will be linked to.
    * @param {boolean} that.isHidden? - Flag indicating whether the chapter should be hidden.
    * 
    * @returns {StackChapterData} chapterData - The newly created `StackChapterData` object.
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

const {chapterInfo, isInsideBible, isInsideBook, bibleData, testamentData, sectionData, sectionBookData, bookData, isHidden = false} = that;
const parentDataIds = new ParentDataIds({
    stackBibleId: bibleData?.id, 
    stackTestamentId: testamentData?.id, 
    stackSectionBookId: sectionBookData?.id, 
    stackSectionId: sectionData?.id, 
    stackBookId: bookData?.id
});

const creationInfo = {bookName: bookData?.pieceInfo.commonName ?? sectionBookData.pieceBookInfo.commonName}
const chapterData = new StackChapterData({
    id: uuid(), 
    pieceInfo: chapterInfo, 
    parentDataIds, 
    isInsideBible, 
    isInsideBook, 
    isHidden,
    creationInfo
})
thisBot.vars.stackChaptersData.push(chapterData);
return chapterData;