/**
 * Handles the dragging of stack pieces, managing highlighting and pulling pieces from their parent stacks.
 *
 * @param {Object} that - The context object containing the piece and its data.
 * @param {Object} that.piece - The piece being dragged.
 * @param {Object} that.data - The data associated with the piece.
 * @returns {Promise<void>} - This function returns a promise that resolves when the drag handling is complete.
 * @example
 * shout("OnStackPieceDrag", {piece: someStackPiece, data: someStackPieceData});
 */

const { piece, data } = that;
const { bibleData, testamentData, sectionData, sectionBookData, bookData } =
  thisBot.GetDataChainFromParentDataIds({ parentDataIds: data.parentDataIds });

if (data instanceof StackChapterData) {
  if (data.piece.masks.isHighlighted && !data.isSelected) {
    await data.piece.Unhighlight({ chapterData: data });
  }
} else {
  await thisBot.TryUnhighlightPiece({
    piece,
    requestSource: BibleVizUtils.Data.tags.InteractionType.Drag,
    customDuration: 0,
  });
}
let pulledOutFromParent = false;

setTagMask(piece, "isOnTheGround", false);
setTagMask(piece, "isBeingDragged", true);
if (!(data instanceof StackChapterData)) {
  setTagMask(piece, "highlightable", false);
}

switch (true) {
  case data instanceof StackTestamentData:
    thisBot.vars.lastInteractedStackTestamentData = data;
    if (bibleData) pulledOutFromParent = true;
    break;
  case data instanceof StackSectionData:
    thisBot.vars.lastInteractedStackSectionData = data;
    if (bibleData || testamentData) pulledOutFromParent = true;
    break;
  case data instanceof StackSectionBookData:
    if (bibleData || testamentData) pulledOutFromParent = true;
    break;
  case data instanceof StackBookData:
    thisBot.vars.lastInteractedStackBookData = data;
    if (bibleData || testamentData || sectionData) pulledOutFromParent = true;
    break;
  case data instanceof StackChapterData:
    if (
      bibleData ||
      testamentData ||
      sectionData ||
      sectionBookData ||
      bookData
    )
      pulledOutFromParent = true;
    break;
  default:
    break;
}
if (pulledOutFromParent)
  thisBot.PullOutPieceFromParent({
    pieceData: data,
    bibleData,
    testamentData,
    sectionData,
    sectionBookData,
    bookData,
  });
