/**
    * Removes the given element from the highlightedElements list if it is included
    * @param {Object} that - Object that contains important data for the function
    * @param {Bot} that.element - The bot to be checked
    * @example
    * thisBot.RemoveElementFromHighlightedList({element: someBot});
*/

const {element} = that;
const highlightedElement = thisBot.vars.highlightedElements.find((highlightedElement) => {
    return highlightedElement.id === element.id
})
if(highlightedElement)
{
    const indexOfElement = thisBot.vars.highlightedElements.indexOf(highlightedElement);
    thisBot.vars.highlightedElements.splice(indexOfElement, 1);
}