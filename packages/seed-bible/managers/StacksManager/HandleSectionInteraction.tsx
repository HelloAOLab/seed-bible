/**
    * This tag is called whenever a section is interacted by clicking or hovering it
    * It is in charge of managing whether to highlight or select a section
    * @param {Object} that - Object that contains important data for the function
    * @param {String} that.typeOfInteraction - Represents the type of interaction. Possible values can be found at globalThis.StackElementInteractionType
    * @param {Object} that.dragInfo? - Is optional and is the information received when the type of interaction is a drag
    * @param {Object} that.dropInfo? - Is optional and is the information received when the type of interaction is a drop
    * @example
    * StacksManager.HandleSectionInteraction({section: someSection, typeOfInteraction: StackElementInteractionType.Drag, dragInfo: someDraginfo});
*/

const {section, typeOfInteraction, dragInfo, dropInfo} = that;
if(thisBot.masks.isBibleAnimating && typeOfInteraction !== StackElementInteractionType.PointerUp) return;
const sectionData = thisBot.GetBibleElementData({element: section});
const {bibleData} = StacksManager.GetDataChainFromParentDataIds({parentDataIds: sectionData.parentDataIds});

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
                    InstanceManager.HighlightBibleElement({data: sectionData});
                }
                else
                {
                    if(section.masks.isHighlighted)
                    {
                        if(!sectionData.isSplitIntoBooks)
                        {
                            thisBot.SelectSection({section});
                        }
                    }
                    else
                    {
                        thisBot.TryHighlightElement({element: section, highlightRequestSource: StackElementInteractionType.Click, typeOfElement: BibleElementType.Section});
                    }
                }
            }
            break;
            case StackElementInteractionType.Tap: 
            {
                
                if(InstanceManager.masks.isHighlightToolEnabled)
                {
                    InstanceManager.HighlightBibleElement({data: sectionData});
                }
                else
                {
                    thisBot.SelectSection({section});

                }
            }
            break;
            case StackElementInteractionType.HoverBegin:
            {
                thisBot.TryHighlightElement({element: section, highlightRequestSource: StackElementInteractionType.HoverBegin, typeOfElement: BibleElementType.Section});
            }
            break;
            case StackElementInteractionType.HoverEnd:
            {
                thisBot.TryUnhighlightElement({element: section, delay: 2000, requestSource: StackElementInteractionType.HoverEnd});
            }
            break;
            // case StackElementInteractionType.SearchBarSelection:
            // {
            //     return thisBot.SelectSection({section});
            // }
            case StackElementInteractionType.Drag:
            {
                if(section.tags.draggable) shout("OnStackElementDrag", {element: section, data: sectionData});
            }
            break;
            case StackElementInteractionType.Dragging:
            {
                shout('OnStackElementDragging', {element: section, dragInfo})
            }
            break;
            case StackElementInteractionType.Drop:
            {
                shout('OnStackElementDrop', {element: section, dropInfo});
            }
            break;
            case StackElementInteractionType.PointerUp:
            {
                shout('OnStackElementPointerUp', {element: section});
            }
            break;
            default: break;
        }
    }
}