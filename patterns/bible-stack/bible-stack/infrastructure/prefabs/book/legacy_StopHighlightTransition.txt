/**
    * Stops the highlight transition for the book and its associated labels.
    * Resets the opacity and scale animations for the book and its info labels.
    * @example
    * book.StopHighlightTransition();
*/

const infoLabelTransformer = getBot(byTag("isInfoLabelTransformer", true), byTag("ownerBotId", getID(thisBot)));
const infoLabel = getBot(byTag("isInfoLabel", true), byTag("transformer", getID(infoLabelTransformer)));
const infoLabelTail = getBot(byTag("isInfoLabelTail", true), byTag("transformer", getID(infoLabelTransformer)));

animateTag(thisBot, "formOpacity", null);
animateTag(thisBot, "scaleX", null);
animateTag(thisBot, "scaleY", null);
if(infoLabelTransformer)
{
    animateTag(infoLabel, "formOpacity", null);
    animateTag(infoLabel, "labelOpacity", null);
    animateTag(infoLabelTail, "formOpacity", null);
}