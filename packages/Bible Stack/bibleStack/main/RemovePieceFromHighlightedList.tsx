/**
    * Removes the given piece from the highlightedPieces list if it is included
    * @param {Object} that - Object that contains important data for the function
    * @param {Bot} that.piece - The bot to be checked
    * @example
    * thisBot.RemovePieceFromHighlightedList({piece: someBot});
*/

const {piece} = that;
const highlightedPiece = thisBot.vars.highlightedPieces.find((highlightedPiece) => {
    return highlightedPiece.id === piece.id
})
if(highlightedPiece)
{
    const indexOfPiece = thisBot.vars.highlightedPieces.indexOf(highlightedPiece);
    thisBot.vars.highlightedPieces.splice(indexOfPiece, 1);
}