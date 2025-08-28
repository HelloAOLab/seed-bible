/**
 * Updates all stacks (Bibles, Testaments, Sections, and Books) with proper animations and interactions.
 * Ensures that stack pieces are not interactable during the update process and re-enables them once the updates are completed.
 * If another update is queued during execution, it will trigger again upon completion.
 *
 * @param {Object} that - Optional parameter containing the speed multiplier for the animations.
 * @param {number} that.speedMultiplier - Is optional and is a multiplier to adjust the speed of the update animations.
 * @returns {Promise<void>} Resolves once all stack updates and animations are completed.
 *
 * @example
 * shout("UpdateStacks");
 */

import {StackSectionData} from "bibleVizUtils.classes.StackSectionData"
import {StackSectionBookData} from "bibleVizUtils.classes.StackSectionBookData"

if(thisBot.masks.isUpdatingStack) 
{
    setTagMask(thisBot, "isUpdateStackQueued", true);
    return;
}

const {speedMultiplier = 1, isInstantaneous = false} = that ?? {}
let stacksUpdates = [];
setTagMask(thisBot, "isUpdatingStack", true);
SetBiblePiecesInteractable(false);

stacksUpdates = thisBot.vars.stackBiblesData.map((bibleData) => {return thisBot.UpdateBibleStack({bibleData, speedMultiplier, isInstantaneous})})
.concat(
    thisBot.vars.stackTestamentsData.filter((testamentData) => {return !testamentData.parentDataIds.stackBibleId}).map((testamentData) => {return thisBot.UpdateTestamentStack({testamentData, speedMultiplier, isInstantaneous})}),
    thisBot.vars.stackSectionsData.filter((sectionData) => {return !sectionData.parentDataIds.stackTestamentId}).map((sectionData) => {return thisBot.UpdateSectionStack({sectionData, speedMultiplier, isInstantaneous})}),
    thisBot.vars.stackSectionBooksData.filter((sectionBookData) => {return !sectionBookData.parentDataIds.stackTestamentId}).map((sectionBookData) => {return thisBot.UpdateBookStack({bookData: sectionBookData, speedMultiplier, isInstantaneous})}),
    thisBot.vars.stackBooksData.filter((bookData) => {return !bookData.parentDataIds.stackSectionId}).map((bookData) => {return thisBot.UpdateBookStack({bookData, speedMultiplier, isInstantaneous})})
);

await Promise.all(stacksUpdates);

SetBiblePiecesInteractable(true);
setTagMask(thisBot, "isUpdatingStack", false);

if(thisBot.masks.isUpdateStackQueued)
{
    setTagMask(thisBot, "isUpdateStackQueued", false);
    thisBot.UpdateStacks({speedMultiplier, isInstantaneous});
}

function SetBiblePiecesInteractable(value = true)
{
    thisBot.vars.stackBiblesData.forEach((bibleData) => {
        const actualValue = bibleData.bibleType === BibleVizUtils.Data.tags.BibleType.PlatformerGame ? false : value
        bibleData.childrenData.forEach((testamentData) => {
            if(testamentData.isActive && !testamentData.piece.masks.isBeingDragged && !testamentData.isSplitIntoSections) SetPieceInteractable({piece: testamentData.piece, args: {value: actualValue}})
            if(testamentData.isSplitIntoSections) testamentData.childrenData.forEach((sectionData) => {
                if(!(sectionData instanceof StackSectionBookData && sectionData.isSelected) && sectionData.isActive && !sectionData.piece.masks.isBeingDragged && !sectionData.isSplitIntoBooks) SetPieceInteractable({piece: sectionData.piece, args: {value: actualValue}})
                if(sectionData instanceof StackSectionData && sectionData.isSplitIntoBooks) sectionData.childrenData.flat().forEach((bookData) => {
                    if(!bookData.isSelected && bookData.isActive && !bookData.piece.masks.isBeingDragged) SetPieceInteractable({piece: bookData.piece, args: {value: actualValue}})
                })
            })
        })
    })
    thisBot.vars.stackTestamentsData.forEach((testamentData) => {
        if(!testamentData.parentDataIds.stackBibleId)
        {
            if(testamentData.isActive && !testamentData.piece.masks.isBeingDragged && !testamentData.isSplitIntoSections) SetPieceInteractable({piece: testamentData.piece, args: {value}})
            if(testamentData.isSplitIntoSections) testamentData.childrenData.forEach((sectionData) => {
                if(!(sectionData instanceof StackSectionBookData && sectionData.isSelected) && sectionData.isActive && !sectionData.piece.masks.isBeingDragged && !sectionData.isSplitIntoBooks) SetPieceInteractable({piece: sectionData.piece, args: {value}})
                if(sectionData instanceof StackSectionData && sectionData.isSplitIntoBooks) sectionData.childrenData.flat().forEach((bookData) => {
                    if(!bookData.isSelected && bookData.isActive && !bookData.piece.masks.isBeingDragged) SetPieceInteractable({piece: bookData.piece, args: {value}})
                })
            })
        }
    })
}

function SetPieceInteractable(data)
{
    const {piece, args} = data;
    const {value} = args;

    setTagMask(piece, "draggable", thisBot.masks.areBiblePiecesDraggable ? value : false);
    setTagMask(piece, "pointable", value);
    setTagMask(piece, "highlightable", value);
}