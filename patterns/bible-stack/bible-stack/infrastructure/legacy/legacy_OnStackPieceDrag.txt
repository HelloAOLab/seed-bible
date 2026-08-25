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

import type { Bot } from "../../../../typings/AuxLibraryDefinitions";
import { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import { StackChapterData } from "bibleVizUtils.models.entities.StackChapterData";
import { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";
import { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import type { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";
import { CanvasInteractions } from "bibleVizUtils.models.canvas";

const {
  piece,
  data,
}: {
  piece: Bot;
  data:
    | StackBookData
    | StackChapterData
    | StackSectionBookData
    | StackSectionData
    | StackTestamentData;
} = that;
const { bibleData, testamentData, sectionData, sectionBookData, bookData } =
  await (thisBot.GetDataChainFromParentDataIds({
    parentDataIds: data.parentDataIds,
  }) as Promise<{
    bibleData: StackBibleData | undefined;
    testamentData: StackTestamentData | undefined;
    sectionData: StackSectionData | undefined;
    sectionBookData: StackSectionBookData | undefined;
    bookData: StackBookData | undefined;
  }>);

if (data instanceof StackChapterData) {
  if (data.isPieceHighlighted() && !data.isSelected) {
    await data.piece?.Unhighlight({ chapterData: data });
  }
} else {
  await thisBot.TryUnhighlightPiece({
    piece,
    requestSource: CanvasInteractions.Drag,
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
