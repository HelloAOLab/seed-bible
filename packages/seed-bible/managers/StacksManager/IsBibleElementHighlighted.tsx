/**
    * Return true if the given Bible element is highlighted
    * @param {Object} that - Object that contains important data for the function
    * @param {Bot} that.element - The bot to be checked
    * @example
    * const isElementHighlighted = thisBot.IsBibleElementHighlighted({element: someBot});
*/

const {element} = that;
return thisBot.vars.highlightedElements.some((highlightedElement) => {
    return highlightedElement.id === element.id
})