/**
 * Attempts to eject a book from a specified section. It ensures that the Bible is not currently animating
 * and checks various conditions to determine if the book can be ejected.
 * 
 * @param {Object} that - The object containing parameters for the operation.
 * @param {number} that.bookName - The name of the book to eject.
 * @returns {boolean} - Returns true if the book was successfully ejected, otherwise false.
 * 
 * @example
 * const success = StacksManager.TryPickBook({sectionName: "Law", bookName: "Genesis"});
 */

import {SectionBookData} from 'interactiveBible.managers.StacksManager.SectionBookData'

if(thisBot.masks.isBibleAnimating) return false;
setTagMask(thisBot, 'isBibleAnimating', true);
const {sectionName, bookName} = that;
const {arrangementIndex, testamentIndex, sectionIndex, found} = thisBot.GetBookInfoPathByName({name: bookName});
if(found)
{
    let bookData = thisBot.vars.lastInteractedSectionData?.childrenData.flat().find((currBookData) => {return currBookData.elementInfo.commonName === bookName});
    if( thisBot.vars.lastInteractedSectionData &&
        thisBot.vars.lastInteractedSectionData.isActive && 
        bookData && 
        (!thisBot.vars.lastInteractedSectionData.isSplitIntoBooks || bookData.isActive)
    )
    {
        if(!thisBot.vars.lastInteractedSectionData.isSplitIntoBooks) await thisBot.SelectSection({section: thisBot.vars.lastInteractedSectionData.element})
        else if(!thisBot.vars.lastInteractedSectionData.isInExplodedView) await thisBot.TrySetSectionAsExplodedView({
            section: thisBot.vars.lastInteractedSectionData.element, 
            setBibleAnimating: false
        })
        await thisBot.PickBook({sectionData: thisBot.vars.lastInteractedSectionData, bookName})
    }
    else
    {
        if(InstanceManager.vars.fixedArrangementsInfo[arrangementIndex].testaments[testamentIndex].sections[sectionIndex].books.length > 1)
        {
            const sectionData = thisBot.vars.lastInteractedTestamentData?.childrenData.find((currSectionData) => {
                return currSectionData.childrenData.flat().some((currBookData) => {
                    return currBookData.elementInfo.commonName === bookName;
                })
            })
            bookData = sectionData?.childrenData.flat().find((currBookData) => {
                return currBookData.elementInfo.commonName === bookName;
            })
            if( thisBot.vars.lastInteractedTestamentData &&
                thisBot.vars.lastInteractedTestamentData.isActive && 
                bookData &&
                (!thisBot.vars.lastInteractedTestamentData.isSplitIntoSections || (thisBot.vars.lastInteractedTestamentData.isSplitIntoSections && (!sectionData.isSplitIntoBooks || bookData.isActive)))
            )
            {
                if(!thisBot.vars.lastInteractedTestamentData.isSplitIntoSections) await thisBot.SelectTestament({testament: thisBot.vars.lastInteractedTestamentData.element})
                if(!sectionData.isSplitIntoBooks) await thisBot.SelectSection({section: sectionData.element})
                else if(!sectionData.isInExplodedView) await thisBot.TrySetSectionAsExplodedView({
                    section: sectionData.element,
                    setBibleAnimating: false
                })
                await thisBot.PickBook({sectionData, bookName})
            }
            else
            {
                await thisBot.SpawnSectionAndPickBook({ sectionName, bookName });
            }
        }
        else
        {
            const sectionBookData = thisBot.vars.lastInteractedTestamentData?.childrenData.find((currSectionData) => {
                return (currSectionData instanceof SectionBookData) && currSectionData.elementBookInfo.commonName === bookName
            })
            if( thisBot.vars.lastInteractedTestamentData &&
                thisBot.vars.lastInteractedTestamentData.isActive && 
                sectionBookData &&
                (!thisBot.vars.lastInteractedTestamentData.isSplitIntoSections || (thisBot.vars.lastInteractedTestamentData.isSplitIntoSections && sectionBookData.isActive))
            )
            {
                if(!thisBot.vars.lastInteractedTestamentData.isSplitIntoSections) await thisBot.SelectTestament({testament: thisBot.vars.lastInteractedTestamentData.element})
                await thisBot.PickSection({testamentData:thisBot.vars.lastInteractedTestamentData, sectionName})

            }
            else
            {
                await thisBot.SpawnTestamentAndPickSection({testamentName: InstanceManager.vars.fixedArrangementsInfo[arrangementIndex].testaments[testamentIndex].name, sectionName});
            }
        }
    }
}

setTagMask(thisBot, 'isBibleAnimating', false);
return true;