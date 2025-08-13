/**
 * Attempts to eject a chapter from a specified book. It ensures that the Bible is not currently animating
 * and checks various conditions to determine if the chapter can be ejected.
 * 
 * @param {Object} that - The object containing parameters for the operation.
 * @param {string} that.bookName - The name of the book from which to eject the chapter.
 * @param {number} that.chapterNumber - The chapter number to eject.
 * @returns {boolean} - Returns true if the chapter was successfully ejected, otherwise false.
 * 
 * @example
 * const success = StacksManager.TryPickChapter({bookName: "Genesis", chapterNumber: 5});
 */

import {SectionBookData} from 'interactiveBible.managers.StacksManager.SectionBookData'

if(thisBot.masks.isBibleAnimating) return false;
setTagMask(thisBot, 'isBibleAnimating', true);
const {bookName, chapterNumber} = that;
const numberOfChapters = thisBot.GetNumberOfChaptersByName({name: bookName});
const {arrangementIndex, testamentIndex, sectionIndex} = thisBot.GetBookInfoPathByName({name: bookName});
if(chapterNumber > 0 && chapterNumber <= numberOfChapters)
{
    if( thisBot.vars.lastInteractedBookData && 
        thisBot.vars.lastInteractedBookData.elementInfo.commonName === bookName &&
        thisBot.vars.lastInteractedBookData.isActive &&
        thisBot.CheckChapterAvailabilityInBook({bookData: thisBot.vars.lastInteractedBookData, chapterNumber}))
    {
        if(!thisBot.vars.lastInteractedBookData.isSelected) await thisBot.SelectBook({book: thisBot.vars.lastInteractedBookData.element, setBibleAnimating: false});
        await thisBot.PickChapter({bookData: thisBot.vars.lastInteractedBookData, chapterNumber});
    }
    else
    {
        let bookData = thisBot.vars.lastInteractedSectionData?.childrenData.flat().find((currBookData) => {return currBookData.elementInfo.commonName === bookName});
        if( thisBot.vars.lastInteractedSectionData &&
            thisBot.vars.lastInteractedSectionData.isActive && 
            bookData && 
            (!thisBot.vars.lastInteractedSectionData.isSplitIntoBooks || (thisBot.vars.lastInteractedSectionData.isInExplodedView && bookData.isActive)) &&
            thisBot.CheckChapterAvailabilityInBook({bookData, chapterNumber})
        )
        {
            if(!thisBot.vars.lastInteractedSectionData.isSplitIntoBooks) await thisBot.SelectSection({section: thisBot.vars.lastInteractedSectionData.element})
            else if(!thisBot.vars.lastInteractedSectionData.isInExplodedView) await thisBot.TrySetSectionAsExplodedView({
                section: thisBot.vars.lastInteractedSectionData.element, 
                setBibleAnimating: false
            })
            if(!bookData.isSelected) await thisBot.SelectBook({book: bookData.element, setBibleAnimating: false});
            await thisBot.PickChapter({bookData, chapterNumber});
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
                    (!thisBot.vars.lastInteractedTestamentData.isSplitIntoSections || !sectionData.isSplitIntoBooks || bookData.isActive) &&
                    thisBot.CheckChapterAvailabilityInBook({bookData, chapterNumber})
                )
                {
                    if(!thisBot.vars.lastInteractedTestamentData.isSplitIntoSections) await thisBot.SelectTestament({testament: thisBot.vars.lastInteractedTestamentData.element})
                    if(!sectionData.isSplitIntoBooks) await thisBot.SelectSection({section: sectionData.element})
                    else if(!sectionData.isInExplodedView) await thisBot.TrySetSectionAsExplodedView({
                        section: sectionData.element, 
                        setBibleAnimating: false
                    })
                    if(!bookData.isSelected) await thisBot.SelectBook({book: bookData.element, setBibleAnimating: false});
                    await thisBot.PickChapter({bookData, chapterNumber});

                }
                else
                {
                    await thisBot.SpawnBookAndPickChapter({bookName, chapterNumber})
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
                    (!thisBot.vars.lastInteractedTestamentData.isSplitIntoSections || sectionBookData.isActive) && 
                    thisBot.CheckChapterAvailabilityInBook({bookData: sectionBookData, chapterNumber})
                )
                {
                    if(!thisBot.vars.lastInteractedTestamentData.isSplitIntoSections) await thisBot.SelectTestament({testament: thisBot.vars.lastInteractedTestamentData.element})
                    if(!sectionBookData.isSelected) await thisBot.SelectBook({book: sectionBookData.element, setBibleAnimating: false});
                    await thisBot.PickChapter({bookData: sectionBookData, chapterNumber});
                }
                else
                {
                    await thisBot.SpawnBookAndPickChapter({bookName, chapterNumber})
                }
            }
        }
    }
}

setTagMask(thisBot, 'isBibleAnimating', false);
return true;