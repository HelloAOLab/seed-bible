const {piece} = that;

let key;
switch(piece.tags.typeOfPiece)
{
    case BibleVizUtils.Data.tags.BiblePieceType.Testament: 
        key = piece.tags.testamentName; 
    break;
    case BibleVizUtils.Data.tags.BiblePieceType.Section: 
        key = piece.tags.sectionName; 
    break;
    case BibleVizUtils.Data.tags.BiblePieceType.SectionBook:
    case BibleVizUtils.Data.tags.BiblePieceType.Book:
    case BibleVizUtils.Data.tags.BiblePieceType.LayoutBook:
        key = piece.tags.bookName; 
    break;
    case BibleVizUtils.Data.tags.BiblePieceType.Chapter:
    case BibleVizUtils.Data.tags.BiblePieceType.LayoutChapter:
        key = `${piece.tags.parentBookName} ${piece.tags.chapterNumber}`;
    break;
    case BibleVizUtils.Data.tags.BiblePieceType.ChunkOfVerses:
        key = piece.masks.chunkPath
    break;
    case BibleVizUtils.Data.tags.BiblePieceType.Verse:
        key = piece.masks.versePath;
    break;
    default: break;
}

const actualTypeOfElement = (piece.tags.typeOfPiece === BibleVizUtils.Data.tags.BiblePieceType.LayoutBook ||piece.tags.typeOfPiece ===  BibleVizUtils.Data.tags.BiblePieceType.SectionBook) ? BibleVizUtils.Data.tags.BiblePieceType.Book : 
    (piece.tags.typeOfPiece === BibleVizUtils.Data.tags.BiblePieceType.LayoutChapter) ? BibleVizUtils.Data.tags.BiblePieceType.Chapter : piece.tags.typeOfPiece
return thisBot.GetHistoryEntries({typeOfPiece: actualTypeOfElement, key});