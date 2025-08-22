/**
    * Stops the highlight transition for the testament and its associated labels.
    * Resets the opacity and scale animations for the testament and its info labels.
    * @example
    * testament.StopHighlightTransition();
*/

// const dimension = os.getCurrentDimension();

const infoLabelTransformer = GetCurrentInfoLabelTransformer(thisBot);
const {infoLabel, infoLabelTail} = infoLabelTransformer.GetLabelElements();
animateTag(thisBot, "scaleX", null);
animateTag(thisBot, "scaleY", null);
if(infoLabelTransformer)
{
    animateTag(infoLabel, "formOpacity", null);
    animateTag(infoLabel, "labelOpacity", null);
    animateTag(infoLabelTail, "formOpacity", null)
}