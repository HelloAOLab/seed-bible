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

const { testamentData, speedMultiplier = 1, isInstantaneous = false } = that;
// const updateStacksTime =  await thisBot.UpdateStacks({speedMultiplier, isInstantaneous});
const animations = [];
if (!isInstantaneous) {
  for (const sectionData of testamentData.childrenData.toReversed()) {
    animations.push(
      thisBot.TryHighlightPiece({
        speedMultiplier,
        isInstantaneous,
        piece: sectionData.piece,
        highlightRequestSource:
          BibleVizUtils.Data.tags.InteractionType.Transition,
        unhighlightDelay: 2000,
        typeOfPiece: BibleVizUtils.Data.tags.BiblePieceType.StackSection,
      })
    );
    await os.sleep(
      isInstantaneous
        ? 0
        : (((BibleVizUtils.Data.tags.StackAnimationsDuration.Highlight / 3) *
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
