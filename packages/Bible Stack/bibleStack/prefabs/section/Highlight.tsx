import { GetBotScales } from "bibleVizUtils.functions.index";
import { CapitalizeFirstLetter } from "bibleVizUtils.functions.index";
import { SpawnLabelForPiece } from "bibleVizUtils.controllers.label.lifecycle";
import { LabelPosition } from "bibleVizUtils.models.label.models";
import { PieceDataRepository } from "bibleStack.services.PieceDataRepository";

/**
 * Highlights the section by animating its opacity and scale, and shows the associated info label.
 * The speed of the animation can be adjusted with a speed multiplier.
 *
 * @param {object} that - Object containing important data for the function
 * @param {number} [that.speedMultiplier=1] - Multiplier to adjust the animation speed
 *
 * @example
 * section.Highlight({speedMultiplier: 1.5})
 */

const { speedMultiplier = 1, isInstantaneous = false } = that ?? {};
const dimension = os.getCurrentDimension();
const animationDuration = isInstantaneous
  ? 0
  : BibleVizUtils.Data.tags.StackAnimationsDuration.Highlight / speedMultiplier;
const thisBotScales = GetBotScales(thisBot);
const animationEasing = { type: "sinusoidal", mode: "inout" };
const label = CapitalizeFirstLetter(
  thisBot.tags.sectionName.split("-").join(" ")
);
const sectionData = PieceDataRepository.getPieceData({ piece: thisBot });
const { infoLabelTransformer } = SpawnLabelForPiece({
  piece: thisBot,
  label,
  color: "white",
  labelColor: sectionData.highlightColor ?? thisBot.tags.labelTextColor,
  dimension,
  labelPositioning: thisBot.masks.isOnTheGround
    ? LabelPosition.Top
    : LabelPosition.LeftSided,
  isAnimatable: true,
});

setTagMask(thisBot, "isHighlighting", true);
setTagMask(thisBot, "isHighlighted", true);

try {
  await Promise.all([
    animateTag(thisBot, {
      fromValue: {
        formOpacity: thisBot.tags.formOpacity,
        scaleX: thisBotScales.x,
        scaleY: thisBotScales.y,
      },
      toValue: {
        formOpacity: thisBot.tags.hoveredOpacity,
        scaleX: thisBot.tags.hoveredScaleX,
        scaleY: thisBot.tags.hoveredScaleY,
      },
      duration: animationDuration,
      easing: animationEasing,
    }),
    infoLabelTransformer.Show({ manager: BibleStackManager }),
  ]);
} catch (error) {
  throw new Error(error);
} finally {
  setTagMask(thisBot, "isHighlighting", false);
}
