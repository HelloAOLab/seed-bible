/**
    * Called whenever a chunk of verses is interacted
    * It is in charge of managing whether to select, highlight, unhighlight a chunk of verses if possible.
    * @param {Object} that - Object that contains important data for the function
    * @param {String} that.typeOfInteraction - The type of interaction made. Available values can be found at globalThis.StackElementInteractionType
    * @example
    * shout("HandleChunkOfVersesInteraction", {typeOfInteraction: StackElementInteractionType.Click});
*/

const {typeOfInteraction, chunk} = that;
if(thisBot.masks.isBibleAnimating) return;

switch(typeOfInteraction)
{
    case StackElementInteractionType.Click:
    {
        if(InstanceManager.masks.isHighlightToolEnabled)
        {
            InstanceManager.HighlightBibleElement({element: chunk});
        }
        else
        {
            if(!chunk.masks.isSelected)
            {
                shout("OnBibleElementSelected", {element: chunk});
                setTagMask(thisBot, "isBibleAnimating", true);
                await chunk.Select();
                setTagMask(thisBot, "isBibleAnimating", false);
            }
        }
    }
    break;
    case StackElementInteractionType.HoverBegin:
    {
        if(!chunk.masks.isSelected && !chunk.masks.isBeingDragged) chunk.Highlight();
    }
    break;
    case StackElementInteractionType.HoverEnd:
    {
        if(!chunk.masks.isSelected && !chunk.masks.isBeingDragged) chunk.Unhighlight();
    }
    break;
    default: break;
}