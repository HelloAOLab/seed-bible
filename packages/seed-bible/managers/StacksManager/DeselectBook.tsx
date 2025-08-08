/**
    * Handles a book deselection. It modify the data of the selected book on the bibleStructure
    * @param {Object} that - Object that contains important data for the function
    * @param {BookData} that.bookData - The book data of the book to select
    * @example
    * StacksManager.DeselectBook({bookData})
*/

const {bookData} = that;
thisBot.vars.lastInteractedBookData = bookData;
setTagMask(thisBot, "isBibleAnimating", true);
bookData.isSelected = false;
bookData.childrenData.forEach((chapterData) => {
    chapterData.isSelected = false;
})
await thisBot.UpdateStacks();
setTagMask(bookData.element, "pointable", true);
setTagMask(bookData.element, "highlightable", true);
setTagMask(thisBot, "isBibleAnimating", false);
InstanceManager.UpdateUsersNotificationOnElements({elementsData: [bookData]})
shout("OnBookDeselectionComplete", {book: bookData.element});