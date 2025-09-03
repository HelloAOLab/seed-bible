// const {piece} = that;

// let key;
// let typeOfPiece;
// switch(piece.tags.typeOfPiece)
// {
//     case BibleVizUtils.Data.tags.BiblePieceType.StackTestament: 
//         key = piece.tags.testamentName; 
//         typeOfPiece = BibleVizUtils.Data.tags.BiblePieceType.StackTestament;
//     break;
//     case BibleVizUtils.Data.tags.BiblePieceType.StackSection: 
//         key = piece.tags.sectionName; 
//         typeOfPiece = BibleVizUtils.Data.tags.BiblePieceType.StackSection;
//     break;
//     case BibleVizUtils.Data.tags.BiblePieceType.StackSectionBook:
//     case BibleVizUtils.Data.tags.BiblePieceType.StackBook:
//     case BibleVizUtils.Data.tags.BiblePieceType.LayoutBook:
//         key = piece.tags.bookName; 
//         typeOfPiece = BibleVizUtils.Data.tags.BiblePieceType.StackBook;
//     break;
//     case BibleVizUtils.Data.tags.BiblePieceType.StackChapter:
//     case BibleVizUtils.Data.tags.BiblePieceType.LayoutChapter:
//         key = `${piece.tags.parentBookName} ${piece.tags.chapterNumber}`;
//         typeOfPiece = BibleVizUtils.Data.tags.BiblePieceType.StackChapter;
//     break;
//     default: break;
// }

// const selections = BibleVizUtils.masks.usersLastSelection.slice().filter((selection) => {
//     return selection.selectionPath.some((pieceInfo) => {
//         return pieceInfo.typeOfPiece == typeOfPiece && pieceInfo.key == key
//     })
// })

return [] // selections;