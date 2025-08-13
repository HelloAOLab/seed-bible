/**
    * This tag checks if the given bot match the conditions to decrease its highlight, if so, then the bot's highlight gets decreased
    * @param {Object} that - Object that contains important data for the function
    * @param {Bot} that.element - The bot to decrease its highlight
    * @example
    * thisBot.TryDecreaseElementHighlight({someElement});
*/

const {element} = that;
if(element.masks.isHighlighted && !element.masks.isHighlightDecreased)
{
    element.DecreaseHighlight();
}