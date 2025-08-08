/**
 * Updates all stacks (Bibles, Testaments, Sections, and Books) with proper animations and interactions.
 * Ensures that stack elements are not interactable during the update process and re-enables them once the updates are completed.
 * If another update is queued during execution, it will trigger again upon completion.
 *
 * @param {Object} that - Optional parameter containing the speed multiplier for the animations.
 * @param {number} that.speedMultiplier - Is optional and is a multiplier to adjust the speed of the update animations.
 * @returns {Promise<void>} Resolves once all stack updates and animations are completed.
 *
 * @example
 * shout("UpdateStacks");
 */

import {SectionData} from "managers.StacksManager.SectionData"
import {SectionBookData} from "managers.StacksManager.SectionBookData"

if(thisBot.masks.isUpdatingStack) 
{
    setTagMask(thisBot, "isUpdateStackQueued", true);
    return;
}

const {speedMultiplier = 1, isInstantaneous = false} = that ?? {}
let stacksUpdates = [];
setTagMask(thisBot, "isUpdatingStack", true);
SetBibleElementsInteractable(false);

stacksUpdates = thisBot.vars.biblesData.map((bibleData) => {return thisBot.UpdateBibleStack({bibleData, speedMultiplier, isInstantaneous})})
.concat(
    thisBot.vars.testamentsData.filter((testamentData) => {return !testamentData.parentDataIds.bibleId}).map((testamentData) => {return thisBot.UpdateTestamentStack({testamentData, speedMultiplier, isInstantaneous})}),
    thisBot.vars.sectionsData.filter((sectionData) => {return !sectionData.parentDataIds.testamentId}).map((sectionData) => {return thisBot.UpdateSectionStack({sectionData, speedMultiplier, isInstantaneous})}),
    thisBot.vars.sectionBooksData.filter((sectionBookData) => {return !sectionBookData.parentDataIds.testamentId}).map((sectionBookData) => {return thisBot.UpdateBookStack({bookData: sectionBookData, speedMultiplier, isInstantaneous})}),
    thisBot.vars.booksData.filter((bookData) => {return !bookData.parentDataIds.sectionId}).map((bookData) => {return thisBot.UpdateBookStack({bookData, speedMultiplier, isInstantaneous})})
);

await Promise.all(stacksUpdates);

SetBibleElementsInteractable(true);
setTagMask(thisBot, "isUpdatingStack", false);

if(thisBot.masks.isUpdateStackQueued)
{
    setTagMask(thisBot, "isUpdateStackQueued", false);
    thisBot.UpdateStacks({speedMultiplier, isInstantaneous});
}

function SetBibleElementsInteractable(value = true)
{
    thisBot.vars.biblesData.forEach((bibleData) => {
        const actualValue = bibleData.bibleType === BibleType.PlatformerGame ? false : value
        bibleData.childrenData.forEach((testamentData) => {
            if(testamentData.isActive && !testamentData.element.masks.isBeingDragged && !testamentData.isSplitIntoSections) SetElementInteractable({element: testamentData.element, args: {value: actualValue}})
            if(testamentData.isSplitIntoSections) testamentData.childrenData.forEach((sectionData) => {
                if(!(sectionData instanceof SectionBookData && sectionData.isSelected) && sectionData.isActive && !sectionData.element.masks.isBeingDragged && !sectionData.isSplitIntoBooks) SetElementInteractable({element: sectionData.element, args: {value: actualValue}})
                if(sectionData instanceof SectionData && sectionData.isSplitIntoBooks) sectionData.childrenData.flat().forEach((bookData) => {
                    if(!bookData.isSelected && bookData.isActive && !bookData.element.masks.isBeingDragged) SetElementInteractable({element: bookData.element, args: {value: actualValue}})
                })
            })
        })
    })
    thisBot.vars.testamentsData.forEach((testamentData) => {
        if(!testamentData.parentDataIds.bibleId)
        {
            if(testamentData.isActive && !testamentData.element.masks.isBeingDragged && !testamentData.isSplitIntoSections) SetElementInteractable({element: testamentData.element, args: {value}})
            if(testamentData.isSplitIntoSections) testamentData.childrenData.forEach((sectionData) => {
                if(!(sectionData instanceof SectionBookData && sectionData.isSelected) && sectionData.isActive && !sectionData.element.masks.isBeingDragged && !sectionData.isSplitIntoBooks) SetElementInteractable({element: sectionData.element, args: {value}})
                if(sectionData instanceof SectionData && sectionData.isSplitIntoBooks) sectionData.childrenData.flat().forEach((bookData) => {
                    if(!bookData.isSelected && bookData.isActive && !bookData.element.masks.isBeingDragged) SetElementInteractable({element: bookData.element, args: {value}})
                })
            })
        }
    })
}

function SetElementInteractable(data)
{
    const {element, args} = data;
    const {value} = args;

    setTagMask(element, "draggable", thisBot.masks.areBibleElementsDraggable ? value : false);
    setTagMask(element, "pointable", value);
    setTagMask(element, "highlightable", value);
}