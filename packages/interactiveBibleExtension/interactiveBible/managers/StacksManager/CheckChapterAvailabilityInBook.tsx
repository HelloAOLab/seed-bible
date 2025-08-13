/**
    * Determines if the specified chapter is active in the specified book
    * @param {Object} that - Object that contains important data for the function
    * @param {BookData} that.bookData - The book data to check
    * @param {Number} that.chapterNumber - The number of the chapter to find
    * @example
    * const isChapterAvailable = StacksManager.CheckChapterAvailabilityInBook({bookData: someBookData, chapterNumber: 1}))
*/

const {bookData, chapterNumber} = that;
const chapterData = bookData.childrenData[chapterNumber - 1];
if(chapterData && !chapterData.isHidden) return true;

return false;