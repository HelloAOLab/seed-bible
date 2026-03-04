/**
 * Toggles the stack visualization of the Bible. This method handles the animation
 * of the cross lines used in the visualization. It ensures that toggles cannot happen
 * while another animation is in progress or if the Bible state is not open.
 *
 * @param {Object} that - The object containing parameters for toggling the stack visualization.
 * @param {StackBibleData} that.bibleData - StackBibleData which Bible's visualization will be toggled.
 *
 * @example
 * thisBot.TryToggleStackViz({ bibleData: someBibleData });
 */

const { bibleData } = that;
if (
  thisBot.masks.isBibleAnimating ||
  thisBot.masks.isTryingToToggleStackViz ||
  thisBot.masks.isStoppingStackVizToggle ||
  bibleData.currentState !== BibleVizUtils.Data.tags.BibleState.Open
)
  return;

setTagMask(thisBot, "isTryingToToggleStackViz", true);
thisBot.vars.lastInteractedStackBibleData = bibleData;
const firstAnimationDuration = 1;
const secondAnimationDuration = 0.25;
const endingColor = [255, 255, 255];
const crossLines = [
  bibleData.staticBiblePieces.crossVerticalLine,
  bibleData.staticBiblePieces.crossHorizontalLine,
];
await Promise.all(
  crossLines.map((crossLine) => {
    return ColorLerper.LerpTag({
      startingColor: BibleVizUtils.Functions.HexToRgb({
        hexColor: crossLine.tags.initialColor,
      }),
      endingColor,
      durationInSeconds: firstAnimationDuration,
      bot: crossLine,
      tag: BibleVizUtils.Data.tags.InterpolatableColorTags.Color,
    });
  })
).then(() => {
  setTagMask(thisBot, "isTryingToToggleStackViz", false);
  thisBot.ToggleStackViz({ bibleData });
  crossLines.forEach((crossLine) => {
    ColorLerper.LerpTag({
      startingColor: endingColor,
      endingColor: BibleVizUtils.Functions.HexToRgb({
        hexColor: crossLine.tags.initialColor,
      }),
      durationInSeconds: secondAnimationDuration,
      bot: crossLine,
      tag: BibleVizUtils.Data.tags.InterpolatableColorTags.Color,
    });
  });
});
