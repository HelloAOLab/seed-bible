/**
 * Animates the book's position and scale to the desired target values based on the current section's state.
 * @param {Object} that - Contextual object containing parameters for the animation.
 * @param {number} [that.speedMultiplier=1] - Multiplier that affects the animation speed.
 * @returns {boolean} - Returns true upon completion of the animation.
 * @example
 * book.AnimateToDesiredPosition({speedMultiplier: 2});
 */

const { speedMultiplier = 1, isInstantaneous = false } = that;
const dimension = os.getCurrentDimension();
const bookData = BibleStackManager.GetPieceData({ piece: thisBot });
const { sectionData } = BibleStackManager.GetDataChainFromParentDataIds({
  parentDataIds: bookData.parentDataIds,
});
const sectionPosition = sectionData
  ? getBotPosition(sectionData.piece, dimension)
  : null;
const animationDuration = 0.5 / speedMultiplier;
const bookPosition = getBotPosition(thisBot, dimension);
const bookScales = BibleVizUtils.Functions.GetBotScales(thisBot);
const easeInOutSine = { type: "sinusoidal", mode: "inout" };
if (isInstantaneous) {
  if (sectionData?.isInExplodedView) {
    setTag(
      thisBot,
      dimension + "X",
      thisBot.tags.explodedViewPosition.x *
        sectionData.piece.tags.initialScaleX +
        sectionPosition.x
    );
    setTag(
      thisBot,
      dimension + "Y",
      thisBot.tags.explodedViewPosition.y *
        sectionData.piece.tags.initialScaleY +
        sectionPosition.y
    );
    setTag(
      thisBot,
      "scaleX",
      thisBot.tags.explodedViewCustomScale
        ? thisBot.tags.explodedViewCustomScale.x *
            sectionData.piece.tags.initialScaleX
        : thisBot.tags.initialScaleX
    );
    setTag(
      thisBot,
      "scaleY",
      thisBot.tags.explodedViewCustomScale
        ? thisBot.tags.explodedViewCustomScale.y *
            sectionData.piece.tags.initialScaleY
        : thisBot.tags.initialScaleY
    );
    setTag(thisBot, "scaleZ", thisBot.tags.initialScaleZ);
  }
  setTag(thisBot, dimension + "Z", thisBot.tags.desiredPositionZ);
  setTag(thisBot, "formOpacity", thisBot.tags.unhoveredOpacity);
} else {
  await Promise.all([
    animateTag(thisBot, {
      fromValue: {
        [dimension + "X"]: sectionData?.isInExplodedView
          ? bookPosition.x
          : null,
        [dimension + "Y"]: sectionData?.isInExplodedView
          ? bookPosition.y
          : null,
        [dimension + "Z"]: bookPosition.z,
        scaleX: sectionData?.isInExplodedView ? bookScales.x : null,
        scaleY: sectionData?.isInExplodedView ? bookScales.y : null,
        scaleZ: sectionData?.isInExplodedView ? bookScales.z : null,
        formOpacity: thisBot.tags.formOpacity,
      },
      toValue: {
        [dimension + "X"]: sectionData?.isInExplodedView
          ? thisBot.tags.explodedViewPosition.x *
              sectionData.piece.tags.initialScaleX +
            sectionPosition.x
          : null,
        [dimension + "Y"]: sectionData?.isInExplodedView
          ? thisBot.tags.explodedViewPosition.y *
              sectionData.piece.tags.initialScaleY +
            sectionPosition.y
          : null,
        [dimension + "Z"]: thisBot.tags.desiredPositionZ,
        scaleX: sectionData?.isInExplodedView
          ? thisBot.tags.explodedViewCustomScale
            ? thisBot.tags.explodedViewCustomScale.x *
              sectionData.piece.tags.initialScaleX
            : thisBot.tags.initialScaleX
          : null,
        scaleY: sectionData?.isInExplodedView
          ? thisBot.tags.explodedViewCustomScale
            ? thisBot.tags.explodedViewCustomScale.y *
              sectionData.piece.tags.initialScaleY
            : thisBot.tags.initialScaleY
          : null,
        scaleZ: sectionData?.isInExplodedView
          ? thisBot.tags.initialScaleZ
          : null,
        formOpacity: thisBot.tags.unhoveredOpacity,
      },
      duration: animationDuration,
      easing: easeInOutSine,
    }),
  ]);
}

return true;
