/**
    * Determine if a list of elements belongs to the same Bible stack.
    * @param {Object} that - Object that contains important data for the function
    * @param {Array} that.elements - List of elements to be compared
    * @example
    * const areElementsOnSameBible = StacksManager.AreElementsOnSameBible({elements: [elementOne, elementTwo]})
*/

const {elements} = that;
const elementsData = elements.map((element) => {return thisBot.GetBibleElementData({element})});
return elementsData.every((elementData) => {return elementData.parentDataIds.bibleId === elementsData[0].parentDataIds.bibleId});