/**
    * Handles the dropping of a stack element, updating its position and managing interactions based on the drop info.
    *
    * @param {Object} that - The context object containing the element, data, and drop information.
    * @param {Object} that.element - The element being dropped.
    * @param {Object} that.data - The data associated with the element being dropped.
    * @param {Object} that.dropInfo - Information about where the element is being dropped.
    * @example
    * shout('OnStackElementDrop', {data: someStackElementData, element: someStackElement, dropInfo: someDropInfo});
*/

import {ChapterData} from "managers.StacksManager.ChapterData"
import {SectionData} from "managers.StacksManager.SectionData"
import {BookData} from "managers.StacksManager.BookData"
import {TestamentData} from "managers.StacksManager.TestamentData"

const {element, data, dropInfo} = that;
const dimension = os.getCurrentDimension();
const elementPosition = getBotPosition(element, dimension);
let newPosition;
let justGrounded;
setTagMask(element, 'isBeingDragged', false);
if(!dropInfo?.to.bot && !element.masks.isOnTheGround)
{
    justGrounded = true;
    setTagMask(element, "isOnTheGround", true);
    if(!(data instanceof ChapterData)) setTagMask(element, "highlightable", true);
}
if(element.tags.transformer)
{
    const transformer = getBot(byID(element.tags.transformer));
    const transformerPosition = getBotPosition(transformer, dimension);
    newPosition = elementPosition.add(transformerPosition);
    setTag(element, "transformer", null);
    setTagMask(element, dimension + "X", newPosition.x);
    setTagMask(element, dimension + "Y", newPosition.y);
    setTagMask(element, dimension + "Z", newPosition.z);
}
if(data instanceof ChapterData && data.isSelected && justGrounded)
{
    const {sectionBookData, bookData} = StacksManager.GetDataChainFromParentDataIds({parentDataIds: data.parentDataIds});
    const actualData = bookData ?? sectionBookData;
    thisBot.DeselectChapter({chapterData: data, setBibleAnimating: true}).then(() => {
        thisBot.TrySelectChapter({chapterData: data, bookData: actualData});
    });
}
else
{
    setTag(element, "desiredPositionZ", newPosition ? newPosition.z : elementPosition.z);
    if(element.masks.isBeingHovered)
    {
        thisBot.TryHighlightElement({element, highlightRequestSource: StackElementInteractionType.Drop, typeOfElement: BibleElementType.Testament});
    }
}

switch(true)
{
    case data instanceof TestamentData:
        thisBot.vars.lastInteractedTestamentData = data;
    break;
    case data instanceof SectionData:
        thisBot.vars.lastInteractedSectionData = data;
    break;
    case data instanceof BookData:
        thisBot.vars.lastInteractedBookData = data;
        break;
    default: break;
}