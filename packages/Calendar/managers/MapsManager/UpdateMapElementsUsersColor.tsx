const availableMapChaptersData = thisBot.vars.mapChaptersData.filter(
  (mapChapterData: any) => {
    return (
      mapChapterData.element &&
      mapChapterData.element.tags.isInUse &&
      mapChapterData.element.masks.isExpanded &&
      !mapChapterData.element.masks.isDeselecting &&
      !mapChapterData.element.masks.isSelecting
    );
  }
);
const availableMapBooksData = thisBot.vars.mapBooksData.filter(
  (mapBookData: any) => {
    return mapBookData.element && !mapBookData.isSelected;
  }
);
const availableElementsData = [
  ...availableMapChaptersData,
  ...availableMapBooksData,
];
const availableElements = availableElementsData.map((elementData) => {
  return elementData.element;
});
InstanceManager.UpdateUsersColorOnElement({ elements: availableElements });
