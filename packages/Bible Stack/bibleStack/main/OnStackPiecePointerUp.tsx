/**
 * Handles the pointer-up event on a stack piece, setting the cursor style to "pointer".
 *
 * @param {Object} that - The context object containing the piece.
 * @param {Object} that.piece - The piece on which the pointer-up event occurred.
 * @example
 * shout("OnStackPiecePointerUp", {piece: somePiece});
 */

const { piece } = that;
setTag(piece, "cursor", "pointer");
