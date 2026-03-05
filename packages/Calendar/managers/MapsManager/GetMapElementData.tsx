const { element } = that;
let data;

switch (element.tags.typeOfElement) {
  case BibleElementType.MapBook:
    data = thisBot.vars.mapBooksData.find((data: any) => {
      return data.isActive && data.element?.id === element.id;
    });
    break;
  case BibleElementType.MapChapter:
    data = thisBot.vars.mapChaptersData.find((data: any) => {
      return data.isActive && data.element.id === element.id;
    });
    break;
  default:
    break;
}

return data;
