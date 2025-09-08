if(thisBot.masks.isBibleAnimating) return false;
setTagMask(thisBot, 'isBibleAnimating', true);
const {bookName, chapterNumber} = that;
const numberOfChapters = thisBot.GetNumberOfChaptersByName({name: bookName});
if(chapterNumber < 1 || chapterNumber > numberOfChapters) return false;
if( thisBot.vars.lastInteractedBookData && 
    thisBot.vars.lastInteractedBookData.elementInfo.commonName === bookName &&
    thisBot.vars.lastInteractedBookData.isActive &&
    thisBot.CheckChapterAvailabilityInBook({bookData: thisBot.vars.lastInteractedBookData, chapterNumber}))
{
    if(!thisBot.vars.lastInteractedBookData.isSelected) await thisBot.SelectBook({book: thisBot.vars.lastInteractedBookData.element, setBibleAnimating: false});
    await thisBot.EjectChapter({bookData: thisBot.vars.lastInteractedBookData, chapterNumber});
}
else
{
    let bookData = thisBot.vars.lastInteractedSectionData ? thisBot.vars.lastInteractedSectionData.childrenData.flat().find((currBookData) => {return currBookData.elementInfo.commonName === bookName}) : null
    if( thisBot.vars.lastInteractedSectionData && 
        thisBot.vars.lastInteractedSectionData.isActive &&
        bookData &&
        (!thisBot.vars.lastInteractedSectionData.isSplitIntoBooks || (thisBot.vars.lastInteractedSectionData.isInExplodedView && bookData.isActive)) &&
        thisBot.CheckChapterAvailabilityInBook({bookData, chapterNumber}))
    {
        if(!thisBot.vars.lastInteractedSectionData.isSplitIntoBooks) await thisBot.SelectSection({section: thisBot.vars.lastInteractedSectionData.element})
        else if(!thisBot.vars.lastInteractedSectionData.isInExplodedView) await thisBot.TrySetSectionAsExplodedView({
            section: thisBot.vars.lastInteractedSectionData.element, 
            setBibleAnimating: false
        })
        await thisBot.SelectBook({book: bookData.element, setBibleAnimating: false});
        await thisBot.EjectChapter({bookData, chapterNumber});
    }
    else
    {
        await thisBot.SpawnBookAndEjectChapter({bookName, chapterNumber})
    }
}

setTagMask(thisBot, 'isBibleAnimating', false);
return true;