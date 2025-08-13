/**
    * Takes a bible element and returns the data associated with it
    * @param {Object} that - Object that contains important data for the function
    * @param {Bot} that.element - The element which its data is requested
    * @example
    * const data = StacksManager.GetBibleElementData({element: section});
*/

const {element} = that;
let data;

switch(element.tags.typeOfElement)
{
    case BibleElementType.Testament:
        data = thisBot.vars.testamentsData.find((data) => {return data.isActive && data.element.id === element.id})
    break;
    case BibleElementType.Section:
        data = thisBot.vars.sectionsData.find((data) => {return data.isActive && data.element.id === element.id})
    break;
    case BibleElementType.SectionBook:
        data = thisBot.vars.sectionBooksData.find((data) => {return data.isActive && data.element.id === element.id})
    break;
    case BibleElementType.Book:
        data = thisBot.vars.booksData.find((data) => {return data.isActive && data.element.id === element.id})
    break;
    case BibleElementType.Chapter:
        data = thisBot.vars.chaptersData.find((data) => {return data.isActive && data.element.id === element.id})
    break;
    default: break;
}

return data;