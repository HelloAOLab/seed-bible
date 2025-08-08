/**
    * Called whenever a book is interacted
    * It is in charge of managing whether to highlight, select, drag or drop the book when possible
    * @param {Object} that - Object that contains important data for the function
    * @param {String} that.typeOfInteraction - Represents the type of interaction. Possible values can be found at globalThis.StackElementInteractionType
    * @param {Object} that.dragInfo? - Is optional and is the information received when the type of interaction is a drag
    * @param {Object} that.dropInfo? - Is optional and is the information received when the type of interaction is a drop
    * @example
    * StacksManager.HandleBookInteraction({book: someBook, typeOfInteraction: StackElementInteractionType.Drag, dragInfo: someDragInfo});
*/

import {SectionBookData} from "managers.StacksManager.SectionBookData"
const {book, typeOfInteraction, dragInfo, dropInfo} = that;
if(thisBot.masks.isBibleAnimating && typeOfInteraction !== StackElementInteractionType.Click && typeOfInteraction !== StackElementInteractionType.Tap && typeOfInteraction !== StackElementInteractionType.PointerUp) return;
const bookData = thisBot.GetBibleElementData({element: book});
const {bibleData, testamentData, sectionData} = StacksManager.GetDataChainFromParentDataIds({parentDataIds: bookData.parentDataIds});

if(!bibleData || bibleData.currentState === BibleState.Open)
{
    switch(typeOfInteraction)
    {
        case StackElementInteractionType.Click:
        {
            if(InstanceManager.masks.isHighlightToolEnabled)
            {
                InstanceManager.HighlightBibleElement({data: bookData});
            }
            else
            {
                if(!bookData?.isSelected)
                {
                    if(thisBot.masks.isASectionMakingTourGuide)
                    {
                        if(thisBot.vars.currentSectionMakingTourGuide && sectionData?.element.id === thisBot.vars.currentSectionMakingTourGuide.id)
                        {
                            thisBot.StopCurrentTourGuide();
                        }
                    }
                    else
                    {
                        if(book.masks.isHighlighted)
                        {
                            thisBot.SelectBook({book})
                        }
                        else
                        {
                            thisBot.TryHighlightElement({element: book, highlightRequestSource: StackElementInteractionType.Click, typeOfElement: BibleElementType.Book});
                        }
                    }
                }
            }
        }
        break;
        case StackElementInteractionType.Tap: 
        {
            if(InstanceManager.masks.isHighlightToolEnabled)
            {
                InstanceManager.HighlightBibleElement({data: bookData});
            }
            else
            {
                if(!sectionData || sectionData.isInExplodedView)
                {
                    if(bookData.isSelected)
                    {
                        thisBot.DeselectBook({bookData});
                    }
                    else
                    {
                        thisBot.SelectBook({book})
                    }
                }
                else if(bookData.parentDataIds.bibleId && bibleData.currentStackVizState === BibleVisualizationState.Regular)
                {
                    thisBot.TrySetSectionAsExplodedView({section: sectionData.element})
                }
            }
        }
        break;
        case StackElementInteractionType.HoverBegin:
        {
            if(!(thisBot.masks.isASectionMakingTourGuide && thisBot.vars.currentSectionMakingTourGuide && sectionData?.element.id === thisBot.vars.currentSectionMakingTourGuide.id))
            {
                if(bookData instanceof SectionBookData)
                {
                    thisBot.TryHighlightElement({element: book, highlightRequestSource: StackElementInteractionType.HoverBegin, typeOfElement: BibleElementType.SectionBook});
                }
                else
                {
                    if(sectionData && !sectionData.isInExplodedView && bookData?.parentDataIds.testamentId && (!bibleData || bibleData.currentStackVizState === BibleVisualizationState.Regular) && (bookData.currentShape === BookShapeType.Regular || bookData.currentShape === BookShapeType.RegularSelected))
                    {
                        thisBot.TrySetSectionAsExplodedView({section: sectionData.element})
                    }
                    else if(!bookData.isSelected)
                    {
                        if(bibleData || testamentData || sectionData)
                        {
                            const booksToUnhighlight = sectionData.childrenData
                                .flat()
                                .filter((currentBookData) => {return currentBookData !== bookData 
                                    && currentBookData.isActive
                                    && !currentBookData.element.masks.isOnTheGround 
                                    && AreBothBooksInSamePlace(currentBookData, bookData)})
                                .map((currentBookData) => (currentBookData.element));
                            booksToUnhighlight.forEach((book) => {thisBot.TryUnhighlightElement({element: book, requestSource: StackElementInteractionType.HoverBegin});})
                            if(testamentData)
                            {
                                const sectionsToCheck = bibleData ? (
                                    bibleData.childrenData.flatMap((currentTestamentData) => {return currentTestamentData.childrenData})
                                        .filter((currentSectionData) => {
                                            return  !(currentSectionData instanceof SectionBookData) &&
                                                    currentSectionData != sectionData &&
                                                    currentSectionData.isActive && 
                                                    currentSectionData.isSplitIntoBooks
                                        })
                                ) : (
                                    testamentData.childrenData.filter((currentSectionData) => {
                                        return  !(currentSectionData instanceof SectionBookData) &&
                                                currentSectionData != sectionData &&
                                                currentSectionData.isActive && 
                                                currentSectionData.isSplitIntoBooks
                                    })
                                );
                                const unhighlightDelay = 7500;
                                const booksToDecreaseHighlight = sectionsToCheck.map((currentSectionData) => {return currentSectionData.childrenData})
                                    .flat(2)
                                    .filter((currentBookData) => {return currentBookData.isActive && currentBookData.parentDataIds.bibleId && currentBookData.element.masks.isHighlighted && !currentBookData.element.masks.isHighlightDecreased})
                                    .map((currentBookData) => {return currentBookData.element});
                                booksToDecreaseHighlight.forEach((currentBook) => {
                                    const {unhighlightDelayInfo} = thisBot.GetUnhighlightDelayInfo({element: currentBook});
                                    thisBot.TryDecreaseElementHighlight({element: currentBook});
                                    if(!unhighlightDelayInfo)
                                    {
                                        thisBot.TryUnhighlightElement({element: currentBook, delay: unhighlightDelay, requestSource: StackElementInteractionType.HoverBegin});
                                    }
                                })
                            }
                        }
                        thisBot.TryHighlightElement({element: book, highlightRequestSource: StackElementInteractionType.HoverBegin, typeOfElement: BibleElementType.Book});
                    }
                }                    
            }
            
        }
        break;
        case StackElementInteractionType.HoverEnd:
        {
            if(!bookData.isSelected && !(thisBot.masks.isASectionMakingTourGuide && thisBot.vars.currentSectionMakingTourGuide && sectionData?.element.id === thisBot.vars.currentSectionMakingTourGuide.id))
            {
                if(bookData instanceof SectionBookData || !bookData.parentDataIds.bibleId)
                {
                    thisBot.TryUnhighlightElement({element: book, delay: 2000, requestSource: StackElementInteractionType.HoverEnd});
                }
            }
        }
        break;
        // case StackElementInteractionType.SearchBarSelection:
        // {
        //     if(!sectionData.isSectionBook && !sectionData.isInExplodedView && bookData.parentDataIds.bibleId && stackData.currentStackVizState === BibleVisualizationState.Regular)
        //     {
        //         return thisBot.TrySetSectionAsExplodedView({section: sectionData.section}).then(() => {return thisBot.SelectBook({book})})
        //     }
        //     else
        //     {
        //         return thisBot.SelectBook({book})
        //     }
        // }
        case StackElementInteractionType.Drag:
        {
            if(book.tags.draggable) shout("OnStackElementDrag", {element: book, data: bookData});
        }
        break;
        case StackElementInteractionType.Dragging:
        {
            shout('OnStackElementDragging', {element: book, dragInfo})
        }
        break;
        case StackElementInteractionType.Drop:
        {
            shout('OnStackElementDrop', {element: book, dropInfo});
        }
        break;
        case StackElementInteractionType.PointerUp:
        {
            shout('OnStackElementPointerUp', {element: book});
        }
        break;
        default: break;
    }
}

function AreBothBooksInSamePlace(bookData1, bookData2)
{
    return (bookData1.parentDataIds.bibleId && bookData2.parentDataIds.bibleId) || (bookData1.parentDataIds.testamentId && bookData2.parentDataIds.testamentId) || (bookData1.parentDataIds.sectionId && bookData2.parentDataIds.sectionId)
}