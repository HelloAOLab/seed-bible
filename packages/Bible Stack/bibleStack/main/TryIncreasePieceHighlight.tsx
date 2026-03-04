/**
    * This tag checks if the given bot match the conditions to increase its highlight, if so, then the bot's highlight gets increased
    * @param {Object} that - Object that contains important data for the function
    * @param {Bot} that.piece - The bot to increase its highlight
    * @example
    * thisBot.TryIncreasePieceHighlight({somePiece});
*/

const {piece, speedMultiplier = 1, isInstantaneous = false} = that;
if(piece.masks.isHighlighted && piece.masks.isHighlightDecreased)
{
    piece.IncreaseHighlight({speedMultiplier, isInstantaneous});
}