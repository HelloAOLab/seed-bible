/**
 * Toggles the current stack visualization state between regular and expanded. 
 * If the state is regular, it expands all sections. If the state is expanded, it sets all sections to regular view.
 * 
 * @param {Object} that - The object containing `bibleData`.
 * @param {BibleData} that.bibleData - The BibleData which Bible's visualization state will be toggled.
 * 
 * @example
 * StacksManager.ToggleStackViz({bibleData: someBibleData});
 */

const {bibleData} = that;
setTagMask(thisBot, 'isBibleAnimating', true);
switch(bibleData.currentStackVizState)
{
    case BibleVisualizationState.Regular:
    {
        bibleData.currentStackVizState = BibleVisualizationState.Expanded;
        await thisBot.SelectAllSections({bibleData});
        await thisBot.UpdateStacks();
    }
    break;
    case BibleVisualizationState.Expanded:
    {
        bibleData.currentStackVizState = BibleVisualizationState.Regular;
        thisBot.SetAllSectionsAsRegularView({bibleData});
        await thisBot.UpdateStacks();
    }
    break;
}
setTagMask(thisBot, 'isBibleAnimating', false);