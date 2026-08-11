/**
 * Return true if the given Bible piece is highlighted
 * @param {Object} that - Object that contains important data for the function
 * @param {Bot} that.piece - The bot to be checked
 * @example
 * const isPieceHighlighted = thisBot.IsBiblePieceHighlighted({piece: someBot});
 */

const { piece } = that;
return thisBot.vars.highlightedPieces.some((highlightedPiece) => {
  return highlightedPiece.id === piece.id;
});
