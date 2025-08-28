/**
    * This tag handles a book selection. It modify the data of the selected book on the bibleStructure
    * @param {Object} that - Object that contains important data for the function
    * @param {Bot} that.book - The book to select
    * @example
    * thisBot.SelectBook({book})
*/

const { book, setBibleAnimating = true } = that;
const bookData = thisBot.GetPieceData({ piece: book });
thisBot.vars.lastInteractedStackBookData = bookData;
const dimension = os.getCurrentDimension();
if (setBibleAnimating) setTagMask(thisBot, "isBibleAnimating", true);
BibleVizUtils.Functions.TryHideUsersNotificationOnPiece({piece: book});
await thisBot.TryUnhighlightPiece({ piece: book, tryUpdateUsersNotification: false, requestSource: BibleVizUtils.Data.tags.InteractionType.Transition });
bookData.isSelected = true;
shout("OnBiblePieceSelected", {piece: book});
setTagMask(book, "pointable", false);
setTagMask(book, "highlightable", false);
const focusOnRotation = {x: 1.01229, y:0.5};
const cameraFocusDuration = 1;

const bookPosition = getBotPosition(book, dimension);
const { selectedBookHeight } = ComputeSelectedBookLayout(bookData);
let fixedPosition = new Vector3(bookPosition.x, bookPosition.y, bookPosition.z + (selectedBookHeight/2))
if(bookData.parentDataIds.stackBibleId)
{
    const transformerPosition = getBotPosition(bookData.piece.links.transformerLink, dimension);
    fixedPosition = fixedPosition.add(transformerPosition);
}
const desiredFocusOnPosition = BibleVizUtils.Functions.GetFocusOnPositionFromRotation({
    theta: focusOnRotation.y, 
    phi: focusOnRotation.x, 
    botPosition: fixedPosition
});

os.focusOn({x: desiredFocusOnPosition.x, y: desiredFocusOnPosition.y}, {
    duration: cameraFocusDuration,
    easing: {type: "sinusoidal", mode: "inout"},
    rotation: focusOnRotation,
    zoom: 8
})

await thisBot.UpdateStacks();

// if(globalThis?.OpenBibleAt === undefined){
//     shout("runThePage")
//     await os.sleep(1000);
// }
// OpenBibleAt(`${book.tags.bookName} ${1}:0`)
if (setBibleAnimating) setTagMask(thisBot, "isBibleAnimating", false);
thisBot.UpdateStackPiecesUsersNotification();
shout("OnStackBookSelectionComplete", { book });
thisBot.PlaySound({soundName: "BookSelect"});