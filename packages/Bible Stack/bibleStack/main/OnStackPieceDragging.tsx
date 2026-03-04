/**
    * Updates the position of a dragged stack piece based on the provided drag information.
    * The function sets the position of the piece in the current dimension.
    *
    * @param {Object} that - The context object containing the piece and its drag information.
    * @param {Object} that.piece - The piece being dragged.
    * @param {Object} that.dragInfo - The information related to the drag action, including target coordinates.
    * @param {Object} that.data - The data associated with the piece.
    * @example
    * shout('OnStackPieceDragging', {piece: someStackPiece, data: someStackPieceData, dragInfo: someDragInfo})
*/

const {piece, dragInfo} = that;

if(!piece.masks.isBeingDragged) return;
const dimension = os.getCurrentDimension();
setTagMask(piece, dimension + "X", dragInfo.to.x);
setTagMask(piece, dimension + "Y", dragInfo.to.y);
setTagMask(piece, dimension + "Z", 0);