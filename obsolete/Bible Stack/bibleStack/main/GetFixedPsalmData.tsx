/**
    * Receives the number of the chapter and returns the corresponding name and chapterNumber for the Psalm
    * @param {Object} that - Object that contains important data for the function
    * @param {Number} that.chapterNumber - The number of the chapter
    * @example
    * const {book, chapter} = StackManager.GetFixedPsalmData({book, chapter});
*/

const {chapter} = that;
const psalmInfo = BibleVizUtils.Data.tags.psalmsInfo.find((psalmInfo) => {return chapter >= psalmInfo.chapters.start && chapter <= psalmInfo.chapters.end});
return {fixedBook: psalmInfo.name, fixedChapter: (chapter - psalmInfo.chapters.start + 1)};