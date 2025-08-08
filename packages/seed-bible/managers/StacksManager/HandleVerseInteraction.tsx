const {typeOfInteraction, verse} = that;
if(thisBot.masks.isBibleAnimating) return;

switch(typeOfInteraction)
{
    case StackElementInteractionType.Click:
    {
        if(InstanceManager.masks.isHighlightToolEnabled)
        {
            InstanceManager.HighlightBibleElement({element: verse});
        }
        else
        {
            shout("OnBibleElementSelected", {element: verse});
        }
    }
    break;
    default: break;
}