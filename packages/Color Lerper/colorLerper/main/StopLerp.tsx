/**
 * Stops a color lerp in progress for the specified bot and tag. If there is an existing lerp,
 * it clears the lerp data, cancels the lerp, and stops the associated interval.
 *
 * @param {object} that - The parameters object.
 * @param {Bot} that.bot - The bot for which the color lerp is being stopped.
 * @param {string} that.tag - The tag associated with the color lerp.
 *
 * @example
 * LerpColorManager.StopLerp({bot: someBot, tag: InterpolatableColorTags.color});
 */

const { bot, tag } = that;
const previousBotLerpData = currentLerps.GetColorLerpData({
  bot: bot,
  tag: tag,
});
if (previousBotLerpData) {
  currentLerps.ClearColorLerpData(previousBotLerpData);
  previousBotLerpData.reject("Color lerp has been canceled");
  clearInterval(previousBotLerpData.lerpIntervalId);
}
