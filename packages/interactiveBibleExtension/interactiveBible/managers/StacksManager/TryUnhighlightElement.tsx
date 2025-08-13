/**
    * Unhighlights a Bible element if possible
    *
    * @param {Object} that - Object that contains important data for the function
    * @param {Bot} that.element - The bot to be unhighlgihted
    * @param {Number} that.delay - Is optional and is a delay before unhighlighting the bot
    * @param {String} that.requestSource? - Is optional and is the source of the unhighlight request. Available values can be found at globalThis.StackElementInteractionType
    * @param {Number} that.customDuration? - Is optional and is a custom duration for the unhighlight animation
    *
    * @example
    * shout("TryUnhighlightElement", {element: someBot, delay: 4000, requestSource: StackElementInteractionType.Transition, customDuration: 1});
*/

import {UnhighlightDelayInfo} from "interactiveBible.managers.StacksManager.UnhighlightDelayInfo"

let {element, tryUpdateUsersNotification = true, delay, requestSource, customDuration, speedMultiplier = 1, isInstantaneous = false} = that;
const data = thisBot.GetBibleElementData({element});
const {bibleData} = thisBot.GetDataChainFromParentDataIds({parentDataIds: data.parentDataIds});
const {unhighlightDelayInfo: currentUnhighlightDelayInfo, unhighlightDelayInfoIndex: currentUnhighlightDelayInfoIndex} = thisBot.GetUnhighlightDelayInfo({element});
if(!thisBot.IsBibleElementHighlighted({element}) || ((element.masks.isUnhighlighting || thisBot.masks.isBibleAnimating) && requestSource !== StackElementInteractionType.Transition) || (bibleData && bibleData.currentState !== BibleState.Open) || !element.masks.highlightable) return;

if(element.masks.isUnhighlighting)
{
    element.StopHighlightTransition();
}
if(currentUnhighlightDelayInfo)
{
    thisBot.ClearUnhighlightDelay({unhighlightDelayInfo: currentUnhighlightDelayInfo, unhighlightDelayInfoIndex: currentUnhighlightDelayInfoIndex});
}
if(delay)
{
    delay /= speedMultiplier;
    const timeoutId = setTimeout(() => {
        if(element.tags.isInUse)
        {
            const {unhighlightDelayInfo, unhighlightDelayInfoIndex} = thisBot.GetUnhighlightDelayInfo({element});
            thisBot.ClearUnhighlightDelay({unhighlightDelayInfo, unhighlightDelayInfoIndex});
            element.StopHighlightTransition();
            element.Unhighlight({customDuration, isInstantaneous, speedMultiplier}).then(() => {
                thisBot.RemoveElementFromHighlightedList({element})
                if(tryUpdateUsersNotification) InstanceManager.UpdateUsersNotificationOnElements({elementsData: [data]})
            });
        }
    }, delay);
    thisBot.vars.unhighlightDelaysInfo.push(new UnhighlightDelayInfo({element, timeoutId}))
}
else
{
    element.StopHighlightTransition();
    await element.Unhighlight({customDuration, speedMultiplier, isInstantaneous}).then(() => {
        thisBot.RemoveElementFromHighlightedList({element})
        if(tryUpdateUsersNotification) InstanceManager.UpdateUsersNotificationOnElements({elementsData: [data]})
    });
}