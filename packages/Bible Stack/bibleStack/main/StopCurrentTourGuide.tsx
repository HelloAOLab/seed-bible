/**
 * Stops the current tour guide by clearing its interval, rejecting the promise, and resetting the tour guide data.
 * 
 * @example
 * shout("StopCurrentTourGuide");
 */

os.focusOn(null);
if(thisBot.vars.currentTourGuideData)
{
    clearInterval(thisBot.vars.currentTourGuideData.intervalId);
    thisBot.vars.currentTourGuideData.promiseReject();
    thisBot.vars.currentTourGuideData = null;
}