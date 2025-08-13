/**
    * This tag checks if the given bot match the conditions to increase its highlight, if so, then the bot's highlight gets increased
    * @param {Object} that - Object that contains important data for the function
    * @param {Bot} that.element - The bot to increase its highlight
    * @example
    * thisBot.TryIncreaseElementHighlight({someElement});
*/

const {element, speedMultiplier = 1, isInstantaneous = false} = that;
if(element.masks.isHighlighted && element.masks.isHighlightDecreased)
{
    element.IncreaseHighlight({speedMultiplier, isInstantaneous});
}