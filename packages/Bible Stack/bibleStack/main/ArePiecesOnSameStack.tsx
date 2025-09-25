/**
    * Determine if a list of pieces belongs to the same Bible stack.
    * @param {Object} that - Object that contains important data for the function
    * @param {Array} that.pieces - List of pieces to be compared
    * @example
    * const arePiecesOnSameBible = thisBot.ArePiecesOnSameStack({pieces: [pieceOne, pieceTwo]})
*/

const {pieces} = that;
const piecesData = pieces.map((piece) => {return thisBot.GetPieceData({piece})});
return piecesData.every((pieceData) => {return pieceData.parentDataIds.stackBibleId === piecesData[0].parentDataIds.stackBibleId});