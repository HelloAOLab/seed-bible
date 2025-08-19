const {element} = that;
let data;

switch(element.tags.typeOfElement)
{
    case BibleVizUtils.Data.tags.BibleElementType.LayoutBook:
        data = thisBot.vars.layoutBooksData.find((data) => {return data.isActive && data.element?.id === element.id})
    break;
    case BibleVizUtils.Data.tags.BibleElementType.LayoutChapter:
        data = thisBot.vars.layoutChaptersData.find((data) => {return data.isActive && data.element.id === element.id})
    break;
    default: break;
}

return data;