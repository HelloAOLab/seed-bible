/**
    * Calculates the highlight scales for the book based on its selection state and the section view.
    * @returns {Vector2} - A vector representing the X and Y scales for highlighting.
    * @example
    * const highlightScales = book.GetHighlightScales();
*/

import {SectionBookData} from "interactiveBible.managers.StacksManager.SectionBookData"

const bookData = StacksManager.GetBibleElementData({element: thisBot});
const {sectionData} = StacksManager.GetDataChainFromParentDataIds({parentDataIds: bookData.parentDataIds});
let scaleX, scaleY;
if(sectionData?.isInExplodedView && (bookData.isInsideBible || (!bookData.isInsideTestament && !bookData.isInsideSection)))
{
    if(bookData.isSelected)
    {
        scaleX = sectionData.element.tags.initialScaleX;
        scaleY = sectionData.element.tags.initialScaleY;
    }
    else
    {
        if(thisBot.tags.explodedViewCustomScale)
        {
            scaleX = thisBot.tags.explodedViewCustomScale.x * sectionData.element.tags.initialScaleX;
            scaleY = thisBot.tags.explodedViewCustomScale.y * sectionData.element.tags.initialScaleY;
        }
        else
        {
            scaleX = thisBot.tags.initialScaleX;
            scaleY = thisBot.tags.initialScaleY;
            if(bookData instanceof SectionBookData && thisBot.masks.hasBeenScaledAsBook)
            {
                scaleX *= 0.9;
                scaleY *= 0.9;
            }
        }
    }
}
else
{
    scaleX = thisBot.tags.initialScaleX;
    scaleY = thisBot.tags.initialScaleY;
    if(bookData instanceof SectionBookData && thisBot.masks.hasBeenScaledAsBook)
    {
        scaleX *= 0.9;
        scaleY *= 0.9;
    }
}
return new Vector2(scaleX, scaleY);