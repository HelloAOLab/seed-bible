/**
    * Clears the specified unhighlight delay.
    * @param {Object} that - Object that contains important data for the function
    * @param {UnhighlightDelayInfo} that.unhighlightDelayInfo - The object containing the info of the unhighlight delay
    * @param {Number} that.unhighlightDelayInfoIndex - The index of the instance of UnhighlightDelayInfo in thisBot.vars.unhighlightDelaysInfo
    * @example
    * thisBot.ClearUnhighlightDelay({unhighlightDelayInfo: someUnhighlightDelayInfo, unhighlightDelayInfoIndex: someUnhighlightDelayInfoIndex});
*/

const {unhighlightDelayInfo, unhighlightDelayInfoIndex} = that;

clearTimeout(unhighlightDelayInfo.timeoutId);
thisBot.vars.unhighlightDelaysInfo.splice(unhighlightDelayInfoIndex, 1);