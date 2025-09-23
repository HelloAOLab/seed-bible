/**
 * Toggles the current stack visualization state between regular and expanded. 
 * If the state is regular, it expands all sections. If the state is expanded, it sets all sections to regular view.
 * 
 * @param {Object} that - The object containing `bibleData`.
 * @param {StackBibleData} that.bibleData - The StackBibleData which Bible's visualization state will be toggled.
 * 
 * @example
 * thisBot.ToggleStackViz({bibleData: someBibleData});
 */

const {bibleData} = that;
setTagMask(thisBot, 'isBibleAnimating', true);
switch(bibleData.currentStackVizState)
{
    case BibleVizUtils.Data.tags.BibleVisualizationState.Regular:
    {
        bibleData.currentStackVizState = BibleVizUtils.Data.tags.BibleVisualizationState.Expanded;
        await thisBot.SelectAllSections({bibleData});
        await thisBot.UpdateStacks();
    }
    break;
    case BibleVizUtils.Data.tags.BibleVisualizationState.Expanded:
    {
        bibleData.currentStackVizState = BibleVizUtils.Data.tags.BibleVisualizationState.Regular;
        thisBot.SetAllSectionsAsRegularView({bibleData});
        await thisBot.UpdateStacks();
    }
    break;
}
setTagMask(thisBot, 'isBibleAnimating', false);