/**
    * This tag takes a section an set it to exploded view and unset the previous exploded view if it exists
    * @param {Object} that - Object that contains important data for the function
    * @param {Bok} that.section - The section to modify
    * @example
    * shout("TrySetSectionAsExplodedView", {section: someSection});
*/

const {section, setBibleAnimating = true, speedMultiplier, isInstantaneous} = that;
if(thisBot.masks.isBibleAnimating && setBibleAnimating) return false;
const sectionData = thisBot.GetPieceData({piece: section});
const {bibleData, testamentData} = thisBot.GetDataChainFromParentDataIds({parentDataIds: sectionData.parentDataIds});

if(setBibleAnimating) setTagMask(thisBot, "isBibleAnimating", true);

if(testamentData || (bibleData && bibleData.currentStackVizState === BibleVizUtils.Data.tags.BibleVisualizationState.Regular))
{
    const previousExplodedViewSectionData = thisBot.GetPreviousExplodedViewSectionData({bibleData, testamentData});
    if(previousExplodedViewSectionData) previousExplodedViewSectionData.isInExplodedView = false;
}
sectionData.isInExplodedView = true;
thisBot.vars.lastInteractedStackSectionData = sectionData;
await thisBot.UpdateStacks({speedMultiplier, isInstantaneous});

if(setBibleAnimating) setTagMask(thisBot, "isBibleAnimating", false);
thisBot.UpdateStackPiecesActivityNotification();

const activeTab = thisBot.vars.tabsContext.tabs.find((tab) => {return tab.id === thisBot.vars.tabsContext.activeTab});

if(activeTab)
{
    const activeBook = sectionData.childrenData.flat().find((bookData) => {
        return bookData.pieceInfo.commonName === activeTab.data.book && bookData.isActive && bookData.isSelected
    })

    if(activeBook) thisBot.UpdateStackTabsVisualization({source: "OnStackBookSelectionComplete"});
}