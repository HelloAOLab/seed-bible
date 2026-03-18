import type { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";
import { HexToRgb } from "bibleVizUtils.functions.index";
import { ColorLerpTags } from "bibleVizUtils.models.canvas";

/**
 * Attempts to stop the toggle of the stack visualization. This method manages the
 * color transition of the cross lines used in the visualization, ensuring that the
 * toggle action is properly animated and preventing further toggles while the animation
 * is in progress.
 *
 * @param {Object} that - The object containing parameters for stopping the stack visualization toggle.
 * @param {StackBibleData} that.bibleData - StackBibleData which Bible's visualization will be toggled.
 *
 * @example
 * thisBot.TryStopStackVizToggle({ bibleData: someBibleData });
 */

const { bibleData }: { bibleData: StackBibleData } = that;

if (
  !thisBot.masks.isTryingToToggleStackViz ||
  thisBot.masks.isStoppingStackVizToggle
)
  return;

setTagMask(thisBot, "isStoppingStackVizToggle", true);
const animationDuration = 0.25;
const crossLines = [
  bibleData.getStaticPiece("crossVerticalLine"),
  bibleData.getStaticPiece("crossHorizontalLine"),
];
await Promise.all(
  crossLines.map((crossLine) => {
    if (!crossLine) return Promise.resolve();

    return ColorLerper.LerpTag({
      startingColor: HexToRgb({
        hexColor: crossLine.masks.color ?? crossLine.tags.color,
      }),
      endingColor: HexToRgb({ hexColor: crossLine.tags.initialColor }),
      durationInSeconds: animationDuration,
      bot: crossLine,
      tag: ColorLerpTags.color,
    });
  })
);

setTagMask(thisBot, "isTryingToToggleStackViz", false);
setTagMask(thisBot, "isStoppingStackVizToggle", false);
