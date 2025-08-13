/**
    * This tag takes a section an set it to exploded view and unset the previous exploded view if it exists
    * @param {Object} that - Object that contains important data for the function
    * @param {Bok} that.section - The section to modify
    * @example
    * shout("TrySetSectionAsExplodedView", {section: someSection});
*/

const {section, setBibleAnimating = true, speedMultiplier, isInstantaneous} = that;
if(thisBot.masks.isBibleAnimating && setBibleAnimating) return false;
const sectionData = thisBot.GetBibleElementData({element: section});
const {bibleData, testamentData} = thisBot.GetDataChainFromParentDataIds({parentDataIds: sectionData.parentDataIds});

if(setBibleAnimating) setTagMask(thisBot, "isBibleAnimating", true);

if(testamentData || (bibleData && bibleData.currentStackVizState === BibleVisualizationState.Regular))
{
    const previousExplodedViewSectionData = thisBot.GetPreviousExplodedViewSectionData({bibleData, testamentData});
    if(previousExplodedViewSectionData) previousExplodedViewSectionData.isInExplodedView = false;
}
sectionData.isInExplodedView = true;
thisBot.vars.lastInteractedSectionData = sectionData;
await thisBot.UpdateStacks({speedMultiplier, isInstantaneous});

if(setBibleAnimating) setTagMask(thisBot, "isBibleAnimating", false);
thisBot.UpdateStackElementsUsersNotification();