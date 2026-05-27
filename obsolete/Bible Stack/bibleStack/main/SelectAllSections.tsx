import { ExplodeStackActions } from "bibleVizUtils.models.canvas";
import { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";

/**
 * Selects and highlights all sections and books within a StackBibleData's structure.
 *
 * This function iterates through each testament and section in the StackBibleData. It ensures that sections are set into an "exploded view"
 * (expanded) if they are split into books but not yet in the exploded view. If any changes are made, the bot updates its stacks.
 *
 * The function also selects each active testament and section in reverse order, applying the necessary animations.
 *
 * @param {Object} that - Contains bibleData which holds the structure of testaments and sections to be processed.
 * @param {StackBibleData} that.bibleData - The bible data which will be iterated to select all the sections.
 *
 * @returns {Promise<void>} - Returns a promise that resolves when all the selections and animations complete.
 *
 * @example
 * thisBot.SelectAllSections({bibleData: someBibleData});
 */

const {
  bibleData,
  isInstantaneous = false,
}: { bibleData: StackBibleData; isInstantaneous?: boolean } = that;

const callUpdateStacks = bibleData.tryExplodeSplitSections();
if (callUpdateStacks)
  await thisBot.UpdateStacks({
    isInstantaneous,
    speedMultiplier: thisBot.tags.speedMultiplier,
  });

const plan = bibleData.getExplodeAnimationPlan();

for (const command of plan) {
  const { action, piece } = command;
  switch (action) {
    case ExplodeStackActions.ExplodeSection:
      await thisBot.TrySetSectionAsExplodedView({
        section: piece,
        setBibleAnimating: false,
        speedMultiplier: thisBot.tags.speedMultiplier,
        isInstantaneous,
      });
      break;
    case ExplodeStackActions.SelectSection:
      await thisBot.SelectSection({
        bibleData,
        section: piece,
        speedMultiplier: thisBot.tags.speedMultiplier,
        isInstantaneous,
      });
      break;
    case ExplodeStackActions.SelectTestament:
      await thisBot.SelectTestament({
        bibleData,
        testament: piece,
        speedMultiplier: thisBot.tags.speedMultiplier,
        isInstantaneous,
        source: "SelectAllSections",
      });
      break;
  }
}
