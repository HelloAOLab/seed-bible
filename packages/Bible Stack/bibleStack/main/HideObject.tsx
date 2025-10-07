/**
 * Hides an object by clearing its animations, tag masks, and setting its visibility to false.
 *
 * @param {Object} that - The context object containing the bot to be hidden.
 * @param {Object} that.bot - The bot object to be hidden.
 * @example
 * thisBot.HideObject({bot: someBot});
 */

const { bot } = that;
const dimension = os.getCurrentDimension();

clearAnimations(bot);
clearTagMasks(bot);
setTag(bot, dimension, false);
