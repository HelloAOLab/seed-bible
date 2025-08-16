const {element} = that;

let key;
switch(element.tags.typeOfElement)
{
    case BibleVizUtils.Data.tags.BibleElementType.Testament: 
        key = element.tags.testamentName; 
    break;
    case BibleVizUtils.Data.tags.BibleElementType.Section: 
        key = element.tags.sectionName; 
    break;
    case BibleVizUtils.Data.tags.BibleElementType.SectionBook:
    case BibleVizUtils.Data.tags.BibleElementType.Book:
    case BibleVizUtils.Data.tags.BibleElementType.MapBook:
        key = element.tags.bookName; 
    break;
    case BibleVizUtils.Data.tags.BibleElementType.Chapter:
    case BibleVizUtils.Data.tags.BibleElementType.MapChapter:
        key = `${element.tags.parentBookName} ${element.tags.chapterNumber}`;
    break;
    case BibleVizUtils.Data.tags.BibleElementType.ChunkOfVerses:
        key = element.masks.chunkPath
    break;
    case BibleVizUtils.Data.tags.BibleElementType.Verse:
        key = element.masks.versePath;
    break;
    default: break;
}

const actualTypeOfElement = (element.tags.typeOfElement === BibleVizUtils.Data.tags.BibleElementType.MapBook ||element.tags.typeOfElement ===  BibleVizUtils.Data.tags.BibleElementType.SectionBook) ? BibleVizUtils.Data.tags.BibleElementType.Book : 
    (element.tags.typeOfElement === BibleVizUtils.Data.tags.BibleElementType.MapChapter) ? BibleVizUtils.Data.tags.BibleElementType.Chapter : element.tags.typeOfElement
return thisBot.GetHistoryEntries({typeOfElement: actualTypeOfElement, key});