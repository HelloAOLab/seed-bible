/**
    * Retrieves the unhighlight delay information for a given element, including its index in the delay info array.
    *
    * @param {Object} that - The context object containing the element.
    * @param {Object} that.element - The element for which to retrieve unhighlight delay information.
    * @returns {Object} - An object containing the unhighlight delay information and its index.
    * @returns {Object} returns.unhighlightDelayInfo - The unhighlight delay information for the element, or `undefined` if not found.
    * @returns {number} returns.unhighlightDelayInfoIndex - The index of the unhighlight delay information in the array, or `-1` if not found.
    * @example
    * const {unhighlightDelayInfo, unhighlightDelayInfoIndex} = thisBot.GetUnhighlightDelayInfo({element: someElement});
*/

const {element} = that;
const unhighlightDelayInfo = thisBot.vars.unhighlightDelaysInfo.find((info) => {return info.element.id === element.id});
const unhighlightDelayInfoIndex = thisBot.vars.unhighlightDelaysInfo.indexOf(unhighlightDelayInfo);

return {unhighlightDelayInfo, unhighlightDelayInfoIndex};