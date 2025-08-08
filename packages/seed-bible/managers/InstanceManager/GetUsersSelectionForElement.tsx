const {element} = that;

let key;
let typeOfElement;
switch(element.tags.typeOfElement)
{
    case BibleElementType.Testament: 
        key = element.tags.testamentName; 
        typeOfElement = BibleElementType.Testament;
    break;
    case BibleElementType.Section: 
        key = element.tags.sectionName; 
        typeOfElement = BibleElementType.Section;
    break;
    case BibleElementType.SectionBook:
    case BibleElementType.Book:
    case BibleElementType.MapBook:
        key = element.tags.bookName; 
        typeOfElement = BibleElementType.Book;
    break;
    case BibleElementType.Chapter:
    case BibleElementType.MapChapter:
        key = `${element.tags.parentBookName} ${element.tags.chapterNumber}`;
        typeOfElement = BibleElementType.Chapter;
    break;
    default: break;
}

let selections = thisBot.masks.usersLastSelection.slice().filter((selection) => {
    return selection.selectionPath.some((elementInfo) => {
        return elementInfo.typeOfElement == typeOfElement && elementInfo.key == key
    })
})

return selections;