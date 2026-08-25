/**ication$0
 * Handles a book deselection. It modify the data of the selected book on the bibleStructure
 * @param {Object} that - Object that contains important data for the function
 * @param {StackBookData} that.bookData - The book data of the book to select
 * @example
 * thisBot.DeselectBook({bookData})
 */

import { StackBookData } from "bibleVizUtils.models.entities.StackBookData";

const { bookData }: { bookData: StackBookData } = that;
thisBot.vars.lastInteractedStackBookData = bookData;
setTagMask(thisBot, "isBibleAnimating", true);
bookData.deselect();
bookData.childrenData.forEach((chapterData) => {
  chapterData.deselect();
});
await thisBot.UpdateStacks();
const piece = bookData.piece;
if (!piece) {
  console.warn("Piece not found at DeselectBook");
  return;
}
setTagMask(piece, "pointable", true);
setTagMask(piece, "highlightable", true);
setTagMask(thisBot, "isBibleAnimating", false);
shout("OnStackBookDeselectionComplete", { book: piece });
