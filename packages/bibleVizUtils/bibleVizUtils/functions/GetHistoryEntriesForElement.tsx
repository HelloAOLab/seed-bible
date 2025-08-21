const {piece} = that;

let key;
switch(piece.tags.typeOfElement)
{
    case BibleVizUtils.Data.tags.BibleElementType.Testament: 
        key = piece.tags.testamentName; 
    break;
    case BibleVizUtils.Data.tags.BibleElementType.Section: 
        key = piece.tags.sectionName; 
    break;
    case BibleVizUtils.Data.tags.BibleElementType.SectionBook:
    case BibleVizUtils.Data.tags.BibleElementType.Book:
    case BibleVizUtils.Data.tags.BibleElementType.LayoutBook:
        key = piece.tags.bookName; 
    break;
    case BibleVizUtils.Data.tags.BibleElementType.Chapter:
    case BibleVizUtils.Data.tags.BibleElementType.LayoutChapter:
        key = `${piece.tags.parentBookName} ${piece.tags.chapterNumber}`;
    break;
    case BibleVizUtils.Data.tags.BibleElementType.ChunkOfVerses:
        key = piece.masks.chunkPath
    break;
    case BibleVizUtils.Data.tags.BibleElementType.Verse:
        key = piece.masks.versePath;
    break;
    default: break;
}

const actualTypeOfElement = (piece.tags.typeOfElement === BibleVizUtils.Data.tags.BibleElementType.LayoutBook ||piece.tags.typeOfElement ===  BibleVizUtils.Data.tags.BibleElementType.SectionBook) ? BibleVizUtils.Data.tags.BibleElementType.Book : 
    (piece.tags.typeOfElement === BibleVizUtils.Data.tags.BibleElementType.LayoutChapter) ? BibleVizUtils.Data.tags.BibleElementType.Chapter : piece.tags.typeOfElement
return thisBot.GetHistoryEntries({typeOfElement: actualTypeOfElement, key});