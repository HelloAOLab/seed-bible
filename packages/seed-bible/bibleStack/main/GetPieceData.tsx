/**
    * Takes a bible piece and returns the data associated with it
    * @param {Object} that - Object that contains important data for the function
    * @param {Bot} that.piece - The piece which its data is requested
    * @example
    * const data = thisBot.GetPieceData({piece: section});
*/

const {piece} = that;
let data;

switch(piece.tags.typeOfPiece)
{
    case BibleVizUtils.Data.tags.BiblePieceType.StackTestament:
        data = thisBot.vars.stackTestamentsData.find((data) => {return data.isActive && data.piece.id === piece.id})
    break;
    case BibleVizUtils.Data.tags.BiblePieceType.StackSection:
        data = thisBot.vars.stackSectionsData.find((data) => {return data.isActive && data.piece.id === piece.id})
    break;
    case BibleVizUtils.Data.tags.BiblePieceType.StackSectionBook:
        data = thisBot.vars.stackSectionBooksData.find((data) => {return data.isActive && data.piece.id === piece.id})
    break;
    case BibleVizUtils.Data.tags.BiblePieceType.StackBook:
        data = thisBot.vars.stackBooksData.find((data) => {return data.isActive && data.piece.id === piece.id})
    break;
    case BibleVizUtils.Data.tags.BiblePieceType.StackChapter:
        data = thisBot.vars.stackChaptersData.find((data) => {return data.isActive && data.piece.id === piece.id})
    break;
    default: break;
}

return data;