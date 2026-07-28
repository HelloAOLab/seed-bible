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

import type { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";
import { BibleVisualizationStates } from "bibleVizUtils.models.canvas";

const { bibleData }: { bibleData: StackBibleData } = that;
setTagMask(thisBot, "isBibleAnimating", true);
switch (bibleData.currentStackVizState) {
  case BibleVisualizationStates.Regular:
    {
      bibleData.changeVizState(BibleVisualizationStates.Expanded);
      await thisBot.SelectAllSections({ bibleData });
      await thisBot.UpdateStacks();
    }
    break;
  case BibleVisualizationStates.Expanded:
    {
      bibleData.changeVizState(BibleVisualizationStates.Regular);
      thisBot.SetAllSectionsAsRegularView({ bibleData });
      await thisBot.UpdateStacks();
    }
    break;
}
setTagMask(thisBot, "isBibleAnimating", false);
