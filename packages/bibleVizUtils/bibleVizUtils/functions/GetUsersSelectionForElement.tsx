const {piece} = that;

let key;
let typeOfElement;
switch(piece.tags.typeOfElement)
{
    case BibleVizUtils.Data.tags.BibleElementType.Testament: 
        key = piece.tags.testamentName; 
        typeOfElement = BibleVizUtils.Data.tags.BibleElementType.Testament;
    break;
    case BibleVizUtils.Data.tags.BibleElementType.Section: 
        key = piece.tags.sectionName; 
        typeOfElement = BibleVizUtils.Data.tags.BibleElementType.Section;
    break;
    case BibleVizUtils.Data.tags.BibleElementType.SectionBook:
    case BibleVizUtils.Data.tags.BibleElementType.Book:
    case BibleVizUtils.Data.tags.BibleElementType.LayoutBook:
        key = piece.tags.bookName; 
        typeOfElement = BibleVizUtils.Data.tags.BibleElementType.Book;
    break;
    case BibleVizUtils.Data.tags.BibleElementType.Chapter:
    case BibleVizUtils.Data.tags.BibleElementType.LayoutChapter:
        key = `${piece.tags.parentBookName} ${piece.tags.chapterNumber}`;
        typeOfElement = BibleVizUtils.Data.tags.BibleElementType.Chapter;
    break;
    default: break;
}

const selections = BibleVizUtils.masks.usersLastSelection.slice().filter((selection) => {
    return selection.selectionPath.some((pieceInfo) => {
        return pieceInfo.typeOfElement == typeOfElement && pieceInfo.key == key
    })
})

return selections;