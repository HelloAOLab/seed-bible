/**
 * Updates the position of a dragged stack piece based on the provided drag information.
 * The function sets the position of the piece in the current dimension.
 *
 * @param {Object} that - The context object containing the piece and its drag information.
 * @param {Object} that.piece - The piece being dragged.
 * @param {Object} that.dragEvent - The information related to the drag action, including target coordinates.
 * @param {Object} that.data - The data associated with the piece.
 * @example
 * shout('OnStackPieceDragging', {piece: someStackPiece, data: someStackPieceData, dragEvent: someDragInfo})
 */

import type { DraggingEvent } from "bibleVizUtils.models.casualos";
import type { Bot } from "../../../../typings/AuxLibraryDefinitions";

const {
  piece,
  draggingEvent,
}: {
  piece: Bot;
  draggingEvent: DraggingEvent;
} = that;

if (!piece.masks.isBeingDragged) return;
const dimension = os.getCurrentDimension();
setTagMask(piece, dimension + "X", draggingEvent.to.x);
setTagMask(piece, dimension + "Y", draggingEvent.to.y);
setTagMask(piece, dimension + "Z", 0);
