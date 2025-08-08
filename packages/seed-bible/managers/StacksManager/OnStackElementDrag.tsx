/**
    * Handles the dragging of stack elements, managing highlighting and pulling elements from their parent stacks.
    *
    * @param {Object} that - The context object containing the element and its data.
    * @param {Object} that.element - The element being dragged.
    * @param {Object} that.data - The data associated with the element.
    * @returns {Promise<void>} - This function returns a promise that resolves when the drag handling is complete.
    * @example
    * shout("OnStackElementDrag", {element: someStackElement, data: someStackElementData});
*/

import {TestamentData} from "managers.StacksManager.TestamentData"
import {SectionData} from "managers.StacksManager.SectionData"
import {SectionBookData} from "managers.StacksManager.SectionBookData"
import {BookData} from "managers.StacksManager.BookData"
import {ChapterData} from "managers.StacksManager.ChapterData"
const {element, data} = that;
const {bibleData, testamentData, sectionData, sectionBookData, bookData} = StacksManager.GetDataChainFromParentDataIds({parentDataIds: data.parentDataIds});

if(data instanceof ChapterData)
{
    if(data.element.masks.isHighlighted && !data.isSelected)
    {
        await data.element.Unhighlight({chapterData: data});
    }
}
else
{
    await thisBot.TryUnhighlightElement({element, requestSource: StackElementInteractionType.Drag, customDuration: 0});
}
let pulledOutFromParent = false

setTagMask(element, "isOnTheGround", false);
setTagMask(element, 'isBeingDragged', true);
if(!(data instanceof ChapterData)) 
{
    setTagMask(element, "highlightable", false);
}

switch(true)
{
    case data instanceof TestamentData: 
        thisBot.vars.lastInteractedTestamentData = data;
        if(bibleData) pulledOutFromParent = true;
    break;
    case data instanceof SectionData:
        thisBot.vars.lastInteractedSectionData = data;
        if(bibleData || testamentData) pulledOutFromParent = true;
    break;
    case data instanceof SectionBookData: 
        if(bibleData || testamentData) pulledOutFromParent = true;
    break;
    case data instanceof BookData:
        thisBot.vars.lastInteractedBookData = data;
        if(bibleData || testamentData || sectionData) pulledOutFromParent = true;
    break;
    case data instanceof ChapterData:
        if(bibleData || testamentData || sectionData || sectionBookData || bookData) pulledOutFromParent = true;
    break;
    default: break;
}
if(pulledOutFromParent) thisBot.PullOutElementFromParentStack({elementData: data, bibleData, testamentData, sectionData, sectionBookData, bookData});