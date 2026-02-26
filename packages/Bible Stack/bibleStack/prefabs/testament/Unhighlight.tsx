import { LabelsRepository } from "bibleVizUtils.data.LabelsRepository";
/**
 * Reverses the highlight effect on the testament by animating its opacity and scale back to the initial state.
 * The associated info label transformer is hidden and released back to the object pool.
 *
 * @param {object} [that] - Object containing important data for the function
 * @param {number} [that.customDuration] - Custom duration for the animation
 * @param {number} [that.speedMultiplier=1] - Multiplier to adjust the animation speed
 *
 * @returns {Promise<boolean>} - Resolves to true after the unhighlight animation completes
 *
 * @example
 * testament.Unhighlight()
 */

const {
  customDuration,
  speedMultiplier = 1,
  isInstantaneous = false,
} = that ?? {};
// const dimension = os.getCurrentDimension();
const duration = isInstantaneous
  ? 0
  : (customDuration ??
      BibleVizUtils.Data.tags.StackAnimationsDuration.Unhighlight) /
    speedMultiplier;
const easing = { type: "sinusoidal", mode: "inout" };
const infoLabelTransformer =
  LabelsRepository.getLabelTransformerByOwner(thisBot);

setTagMask(thisBot, "isUnhighlighting", true);
setTagMask(thisBot, "isHighlighted", false);

try {
  await Promise.all([
    animateTag(thisBot, {
      fromValue: {
        scaleX: thisBot.tags.scaleX,
        scaleY: thisBot.tags.scaleY,
      },
      toValue: {
        scaleX: thisBot.tags.initialScaleX,
        scaleY: thisBot.tags.initialScaleY,
      },
      duration,
      easing,
    }),
    infoLabelTransformer.Hide({ duration }),
  ]).then(() => {
    ObjectPooler.ReleaseObject({
      obj: infoLabelTransformer,
      tag: infoLabelTransformer.tags.poolTag,
    });
  });
} catch (error) {
  throw new Error(error);
} finally {
  setTagMask(thisBot, "isUnhighlighting", false);
}

return true;
