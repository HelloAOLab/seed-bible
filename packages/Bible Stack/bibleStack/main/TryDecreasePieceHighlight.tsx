/**
    * This tag checks if the given bot match the conditions to decrease its highlight, if so, then the bot's highlight gets decreased
    * @param {Object} that - Object that contains important data for the function
    * @param {Bot} that.piece - The bot to decrease its highlight
    * @example
    * thisBot.TryDecreasePieceHighlight({somePiece});
*/

const {piece} = that;
if(piece.masks.isHighlighted && !piece.masks.isHighlightDecreased)
{
    piece.DecreaseHighlight();
}