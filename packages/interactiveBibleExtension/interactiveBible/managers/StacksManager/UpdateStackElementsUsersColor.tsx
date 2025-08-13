const availableChaptersData = thisBot.vars.chaptersData.filter((chapterData) => {
    return chapterData.element 
        && chapterData.element.tags.isInUse
            && chapterData.element.masks.isExpanded 
                && !chapterData.element.masks.isDeselecting 
                    && !chapterData.element.masks.isSelecting
})
const availableElementsData = [
    ...availableChaptersData
]
const availableElements = availableElementsData.map((elementData) => {return elementData.element})
InstanceManager.UpdateUsersColorOnElement({elements: availableElements});