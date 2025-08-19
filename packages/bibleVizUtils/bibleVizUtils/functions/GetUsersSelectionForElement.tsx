const {element} = that;

let key;
let typeOfElement;
switch(element.tags.typeOfElement)
{
    case BibleVizUtils.Data.tags.BibleElementType.Testament: 
        key = element.tags.testamentName; 
        typeOfElement = BibleVizUtils.Data.tags.BibleElementType.Testament;
    break;
    case BibleVizUtils.Data.tags.BibleElementType.Section: 
        key = element.tags.sectionName; 
        typeOfElement = BibleVizUtils.Data.tags.BibleElementType.Section;
    break;
    case BibleVizUtils.Data.tags.BibleElementType.SectionBook:
    case BibleVizUtils.Data.tags.BibleElementType.Book:
    case BibleVizUtils.Data.tags.BibleElementType.LayoutBook:
        key = element.tags.bookName; 
        typeOfElement = BibleVizUtils.Data.tags.BibleElementType.Book;
    break;
    case BibleVizUtils.Data.tags.BibleElementType.Chapter:
    case BibleVizUtils.Data.tags.BibleElementType.LayoutChapter:
        key = `${element.tags.parentBookName} ${element.tags.chapterNumber}`;
        typeOfElement = BibleVizUtils.Data.tags.BibleElementType.Chapter;
    break;
    default: break;
}

const selections = BibleVizUtils.masks.usersLastSelection.slice().filter((selection) => {
    return selection.selectionPath.some((elementInfo) => {
        return elementInfo.typeOfElement == typeOfElement && elementInfo.key == key
    })
})

return selections;