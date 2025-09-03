/**
    * Handles a book deselection. It modify the data of the selected book on the bibleStructure
    * @param {Object} that - Object that contains important data for the function
    * @param {StackBookData} that.bookData - The book data of the book to select
    * @example
    * thisBot.DeselectBook({bookData})
*/

const {bookData} = that;
thisBot.vars.lastInteractedStackBookData = bookData;
setTagMask(thisBot, "isBibleAnimating", true);
bookData.isSelected = false;
bookData.childrenData.forEach((chapterData) => {
    chapterData.isSelected = false;
})
await thisBot.UpdateStacks();
setTagMask(bookData.piece, "pointable", true);
setTagMask(bookData.piece, "highlightable", true);
setTagMask(thisBot, "isBibleAnimating", false);
BibleVizUtils.Functions.UpdateUsersNotificationOnPieces({piecesData: [bookData], manager: thisBot})
shout("OnStackBookDeselectionComplete", {book: bookData.piece});