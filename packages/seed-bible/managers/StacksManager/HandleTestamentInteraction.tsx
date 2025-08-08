/**
    * This tag is called whenever a testament is interacted by clicking or hovering it
    * It is in charge of managing whether to highlight or select a testament
    * @param {Object} that - Object that contains important data for the function
    * @param {String} that.typeOfInteraction - Represents the type of interaction. Possible values can be found on managers.StackManager.DefineGlobals on StackElementInteractionType
    * @param {Object} that.dragInfo? - Is optional and is the information received when the type of interaction is a drag
    * @param {Object} that.dropInfo? - Is optional and is the information received when the type of interaction is a drop
    * @example
    * StacksManager.HandleTestamentInteraction({testament: someTestament, typeOfInteraction: StackElementInteractionType.Drag, dragInfo: someDragInfo});
*/

const {testament, typeOfInteraction, dragInfo, dropInfo} = that;
if(thisBot.masks.isBibleAnimating && typeOfInteraction !== StackElementInteractionType.PointerUp) return;
const testamentData = thisBot.GetBibleElementData({element: testament});
const {bibleData} = StacksManager.GetDataChainFromParentDataIds({parentDataIds: testamentData.parentDataIds});

if(!bibleData || bibleData.currentState === BibleState.Open)
{
    if(!thisBot.masks.isASectionMakingTourGuide)
    {
        switch(typeOfInteraction)
        {
            case StackElementInteractionType.Click:
            {
                if(InstanceManager.masks.isHighlightToolEnabled)
                {
                    InstanceManager.HighlightBibleElement({data: testamentData});
                }
                else
                {
                    if(testament.tags.isHighlighted)
                    {
                        thisBot.SelectTestament({testament});
                    }
                    else
                    {
                        thisBot.TryHighlightElement({element: testament, highlightRequestSource: StackElementInteractionType.Click, typeOfElement: BibleElementType.Testament});
                    }
                }
            }
            break;
            case StackElementInteractionType.Tap: 
            {
                if(InstanceManager.masks.isHighlightToolEnabled)
                {
                    InstanceManager.HighlightBibleElement({data: testamentData});
                }
                else
                {
                    thisBot.SelectTestament({testament});
                }
            }
            break;
            case StackElementInteractionType.HoverBegin:
            {
                thisBot.TryHighlightElement({element: testament, highlightRequestSource: StackElementInteractionType.HoverBegin, typeOfElement: BibleElementType.Testament});
            }
            break;
            case StackElementInteractionType.Drag:
            {
                if(testament.tags.draggable)
                {
                    shout("OnStackElementDrag", {element: testament, data: testamentData});
                }
            }
            break;
            case StackElementInteractionType.Dragging:
            {
                shout('OnStackElementDragging', {element: testament, dragInfo});
            }
            break;
            case StackElementInteractionType.Drop:
            {
                shout('OnStackElementDrop', {element: testament, dropInfo});
            }
            break;
            case StackElementInteractionType.PointerUp:
            {
                shout('OnStackElementPointerUp', {element: testament});
            }
            break;
            // case StackElementInteractionType.SearchBarSelection:
            // {
            //     return thisBot.SelectTestament({testament});
            // }
            default: break;
        }
    }
}