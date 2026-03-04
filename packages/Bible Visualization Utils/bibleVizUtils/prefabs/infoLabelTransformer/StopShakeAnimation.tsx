/**
    * Stops the shaking animation for the info label and its tail if it is currently active.
    * Clears the interval associated with the shake animation.
    * 
    * @param {object} that - Object containing important data for the function
    * @param {number} that.shakeIntervalId - ID of the interval for the shake animation
    * 
    * @example
    * infoLabelTransformer.StopShakeAnimation()
*/

if(!thisBot.tags.shakeIntervalId) return;

clearInterval(thisBot.tags.shakeIntervalId);
setTag(thisBot, "shakeIntervalId", null);