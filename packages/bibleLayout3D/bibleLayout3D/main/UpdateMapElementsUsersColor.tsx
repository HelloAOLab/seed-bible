const availableMapChaptersData = thisBot.vars.layoutChaptersData.filter((chapterData) => {
    return chapterData.element 
        && chapterData.element.tags.isInUse
            && chapterData.element.masks.isExpanded 
                && !chapterData.element.masks.isDeselecting 
                    && !chapterData.element.masks.isSelecting
})
const availableMapBooksData = thisBot.vars.layoutBooksData.filter((layoutBookData) => {
    return layoutBookData.element 
        && !layoutBookData.isSelected
});
const availableElementsData = [
    ...availableMapChaptersData,
    ...availableMapBooksData
]
const availableElements = availableElementsData.map((elementData) => {return elementData.element})
InstanceManager.UpdateUsersColorOnElement({elements: availableElements});