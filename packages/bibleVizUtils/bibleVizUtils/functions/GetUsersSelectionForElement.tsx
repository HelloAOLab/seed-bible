// const {piece} = that;

// let key;
// let typeOfPiece;
// switch(piece.tags.typeOfPiece)
// {
//     case BibleVizUtils.Data.tags.BiblePieceType.Testament: 
//         key = piece.tags.testamentName; 
//         typeOfPiece = BibleVizUtils.Data.tags.BiblePieceType.Testament;
//     break;
//     case BibleVizUtils.Data.tags.BiblePieceType.Section: 
//         key = piece.tags.sectionName; 
//         typeOfPiece = BibleVizUtils.Data.tags.BiblePieceType.Section;
//     break;
//     case BibleVizUtils.Data.tags.BiblePieceType.SectionBook:
//     case BibleVizUtils.Data.tags.BiblePieceType.Book:
//     case BibleVizUtils.Data.tags.BiblePieceType.LayoutBook:
//         key = piece.tags.bookName; 
//         typeOfPiece = BibleVizUtils.Data.tags.BiblePieceType.Book;
//     break;
//     case BibleVizUtils.Data.tags.BiblePieceType.Chapter:
//     case BibleVizUtils.Data.tags.BiblePieceType.LayoutChapter:
//         key = `${piece.tags.parentBookName} ${piece.tags.chapterNumber}`;
//         typeOfPiece = BibleVizUtils.Data.tags.BiblePieceType.Chapter;
//     break;
//     default: break;
// }

// const selections = BibleVizUtils.masks.usersLastSelection.slice().filter((selection) => {
//     return selection.selectionPath.some((pieceInfo) => {
//         return pieceInfo.typeOfPiece == typeOfPiece && pieceInfo.key == key
//     })
// })

return [] // selections;