/**
 * Handles the completion of the testament selection animation, triggering stack updates and section highlighting.
 *
 * @param {Object} that - Contains the testament data and optional speed multiplier.
 * @param {StackTestamentData} that.testamentData - The data of the selected testament.
 * @param {number} that.speedMultiplier? - Is optional and is the speed multiplier for the animation duration (default is 1).
 * @returns {Promise<boolean>} - Resolves to `true` once all animations are complete.
 *
 * @example
 * shout("OnTestamentSelectionAnimationComplete", {testamentData: someTestamentData, speedMultiplier: 2});
 */

import { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import { BiblePieces } from "bibleVizUtils.models.canvas";
import { CanvasInteractions } from "bibleVizUtils.models.canvas";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";

const {
  testamentData,
  speedMultiplier = 1,
  isInstantaneous = false,
}: {
  testamentData: StackTestamentData;
  speedMultiplier?: number;
  isInstantaneous?: boolean;
} = that;
// const updateStacksTime =  await thisBot.UpdateStacks({speedMultiplier, isInstantaneous});
const animations: Promise<void>[] = [];
if (!isInstantaneous) {
  for (const sectionData of testamentData.getReversedChildren()) {
    animations.push(
      thisBot.TryHighlightPiece({
        speedMultiplier,
        isInstantaneous,
        piece: sectionData.piece,
        highlightRequestSource: CanvasInteractions.Transition,
        unhighlightDelay: 2000,
        typeOfPiece: BiblePieces.StackSection,
      })
    );
    await os.sleep(
      isInstantaneous
        ? 0
        : (((BibleVizDataRepository.getStackAnimationDuration("Highlight") /
            3) *
            2) /
            speedMultiplier) *
            1000
    );
  }
  await Promise.all(animations);
}
setTagMask(thisBot, "isBibleAnimating", false);
thisBot.UpdateStackPiecesActivityNotification();
return true;
