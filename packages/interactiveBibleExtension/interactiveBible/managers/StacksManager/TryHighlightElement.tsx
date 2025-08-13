/**
    * Highlights a Bible element if possible
    * @param {Object} that - Object that contains important data for the function
    * @param {Bot} that.element - The bot to be highlgihted
    * @param {String} that.highlightRequestSource - The source the highlight request comes from. Available values can be found at globalThis.StackElementInteractionType
    * @param {Number} that.unhighlightDelay - Is optional and is a delay in miliseconds before unhighlighting the element
    * @param {String} that.typeOfElement - The type of element. Available values can be found at globalThis.BibleElementType
    * @param {Number} that.customUnhighlightDuration? - Is optional and is a custom duration for the unhighlight animation
    * @example
    * shout("TryHighlightElement", {element: section, highlightRequestSource: StackElementInteractionType.Click, unhighlightDelay: 4000, typeOfElement: BibleElementType.Testament, customUnhighlightDuration: 1});
*/

const {element, highlightRequestSource, unhighlightDelay, typeOfElement, customUnhighlightDuration, speedMultiplier = 1, isInstantaneous = false} = that;

const {unhighlightDelayInfo, unhighlightDelayInfoIndex} = thisBot.GetUnhighlightDelayInfo({element});
const data = thisBot.GetBibleElementData({element});
const {bibleData} = thisBot.GetDataChainFromParentDataIds({parentDataIds: data.parentDataIds});

if((thisBot.IsBibleElementHighlighted({element}) && !unhighlightDelayInfo && !element.masks.isUnhighlighting)   || 
    (thisBot.masks.isBibleAnimating && highlightRequestSource !== StackElementInteractionType.Transition)       || 
    (bibleData && bibleData.currentState !== BibleState.Open)                                            || 
    !element.masks.highlightable
) return

switch(typeOfElement)
{
    case BibleElementType.Book: thisBot.vars.lastInteractedBookData = data;
    break;
    case BibleElementType.Section: thisBot.vars.lastInteractedSectionData = data;
    break;
    case BibleElementType.Testament: thisBot.vars.lastInteractedTestamentData = data;
}

if(unhighlightDelayInfo)
{
    if(typeOfElement === BibleElementType.Book)
    {
        thisBot.TryIncreaseElementHighlight({element, speedMultiplier, isInstantaneous});
    }
    thisBot.ClearUnhighlightDelay({unhighlightDelayInfo, unhighlightDelayInfoIndex});
}
else
{
    let highlightAction;
    if(element.masks.isUnhighlighting)
    {
        element.StopHighlightTransition();
        highlightAction = element.Rehighlight({speedMultiplier, isInstantaneous});
    }
    else
    {
        thisBot.vars.highlightedElements.push(element);
        InstanceManager.TryHideUsersNotificationOnElement({element})
        highlightAction = element.Highlight({speedMultiplier, isInstantaneous});
    }

    switch(typeOfElement)
    {
        case BibleElementType.Testament: {
            if(data.parentDataIds.bibleId && highlightRequestSource !== StackElementInteractionType.Transition)
            {
                const otherBotsToUnhighlight = thisBot.vars.highlightedElements.filter((currentElement) => {
                    return currentElement !== element 
                        && !currentElement.masks.isOnTheGround 
                        && !currentElement.masks.isUnhighlighting
                        && currentElement.tags.typeOfElement === BibleElementType.Testament
                        && thisBot.AreElementsOnSameBible({elements: [currentElement, element]})
                    }
                );

                if(otherBotsToUnhighlight.length > 0)
                {
                    otherBotsToUnhighlight.forEach((element) => {
                        thisBot.TryUnhighlightElement({element, speedMultiplier, isInstantaneous});
                    })
                }
            }
        }
        break;
        default: break;
    }

    await highlightAction.then(() => {
        switch(highlightRequestSource)
        {
            case StackElementInteractionType.HoverBegin: 
                if(!element.masks.isBeingHovered) thisBot.TryUnhighlightElement({element, delay: 2000, customDuration: customUnhighlightDuration});
            break;
            case StackElementInteractionType.Click:
            case StackElementInteractionType.Tap:
                if(unhighlightDelay && !element.masks.isBeingHovered) thisBot.TryUnhighlightElement({element, delay: unhighlightDelay, customDuration: customUnhighlightDuration});
            break;
            case StackElementInteractionType.GridClick:
                if(unhighlightDelay) thisBot.TryUnhighlightElement({element, delay: unhighlightDelay, customDuration: customUnhighlightDuration});
            break;
            case StackElementInteractionType.Transition:
                thisBot.TryUnhighlightElement({element, delay: unhighlightDelay ?? 4000, requestSource: StackElementInteractionType.Transition, customDuration: customUnhighlightDuration});
            break;
        }
    })
}
