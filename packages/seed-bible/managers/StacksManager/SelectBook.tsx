/**
    * This tag handles a book selection. It modify the data of the selected book on the bibleStructure
    * @param {Object} that - Object that contains important data for the function
    * @param {Bot} that.book - The book to select
    * @example
    * thisBot.SelectBook({book})
*/

const { book, setBibleAnimating = true } = that;
const bookData = thisBot.GetBibleElementData({ element: book });
thisBot.vars.lastInteractedBookData = bookData;
if (setBibleAnimating) setTagMask(thisBot, "isBibleAnimating", true);
InstanceManager.TryHideUsersNotificationOnElement({element: book});
await thisBot.TryUnhighlightElement({ element: book, tryUpdateUsersNotification: false, requestSource: StackElementInteractionType.Transition });
bookData.isSelected = true;
shout("OnBibleElementSelected", {element: book});
setTagMask(book, "pointable", false);
setTagMask(book, "highlightable", false);
await thisBot.UpdateStacks();
// if(globalThis?.OpenBibleAt === undefined){
//     shout("runThePage")
//     await os.sleep(1000);
// }
// OpenBibleAt(`${book.tags.bookName} ${1}:0`)
if (setBibleAnimating) setTagMask(thisBot, "isBibleAnimating", false);
thisBot.UpdateStackElementsUsersNotification();
shout("OnBookSelectionComplete", { book });