/**
 * Deselects the chapter, animating its appearance and resetting properties.
 * @example
 * chapter.Deselect();
 */

const chapterData = BibleStackManager.GetPieceData({ piece: thisBot });
const dimension = os.getCurrentDimension();
const duration = 0.15;
const easing = { type: "sinusoidal", mode: "out" };
const rgbTargetColor = BibleVizUtils.Functions.HexToRgb({
  hexColor: BibleVizUtils.Data.masks.isInHistoryMode
    ? BibleVizUtils.Functions.GetHistoryColor({ piece: thisBot })
    : (chapterData.highlightColor ?? thisBot.tags.initialColor),
});
const chapterPosition = getBotPosition(chapterData.piece, dimension);
const delayBetweenChunkAnimations = 35;
const chunkAnimationDuration = 0.15;

if (chapterData) {
  setTagMask(thisBot, "isDeselecting", true);

  thisBot.StopChapterTransition();

  if (thisBot.masks.isOnTheGround) {
    const chapterScales = BibleVizUtils.Functions.GetBotScales(thisBot);

    if (
      Array.isArray(thisBot.vars.chunksOfVerses) &&
      thisBot.vars.chunksOfVerses.length > 0
    ) {
      await Promise.all(
        thisBot.vars.chunksOfVerses.toReversed().map((chunk, index) => {
          return chunk.Hide({
            index,
            dimension,
            delayBetweenAnimations: delayBetweenChunkAnimations,
            duration: chunkAnimationDuration,
          });
        })
      );
      thisBot.vars.chunksOfVerses.forEach((chunk) => {
        ObjectPooler.ReleaseObject({ obj: chunk, tag: chunk.tags.poolTag });
      });
      thisBot.vars.chunksOfVerses.splice(0, thisBot.vars.chunksOfVerses.length);
    }

    await Promise.all([
      ColorLerper.LerpTag({
        endingColor: rgbTargetColor,
        durationInSeconds: duration,
        bot: chapterData.piece,
        tag: BibleVizUtils.Data.tags.InterpolatableColorTags.Color,
      }),
      animateTag(chapterData.piece, "labelOpacity", {
        toValue: 0,
        duration: duration / 2,
        easing,
      }).then(() => {
        setTagMask(chapterData.piece, "labelPosition", "front");
        setTagMask(chapterData.piece, "label", thisBot.tags.chapterNumber);
        return animateTag(chapterData.piece, "labelOpacity", {
          toValue: 1,
          duration: duration / 2,
          easing,
        });
      }),
      animateTag(chapterData.piece, {
        fromValue: {
          scaleX: chapterScales.x,
          scaleY: chapterScales.y,
          scaleZ: chapterScales.z,
        },
        toValue: {
          scaleX: thisBot.tags.initialScaleX,
          scaleY: thisBot.tags.initialScaleY,
          scaleZ: thisBot.tags.initialScaleZ,
        },
        duration,
        easing,
      }),
    ])
      .then(() => {
        setTagMask(thisBot, "isExpanded", false);
        // setTagMask(thisBot, "isHighlighted", false);
      })
      .finally(() => {
        setTagMask(thisBot, "isDeselecting", false);
      });
  } else {
    await Promise.all([
      ColorLerper.LerpTag({
        endingColor: rgbTargetColor,
        durationInSeconds: duration,
        bot: chapterData.piece,
        tag: BibleVizUtils.Data.tags.InterpolatableColorTags.Color,
      }),
      animateTag(chapterData.piece, {
        fromValue: {
          scaleY: chapterData.piece.tags.selectedScaleY,
          [dimension + "Y"]: chapterPosition.y,
        },
        toValue: {
          scaleY: chapterData.piece.tags.initialScaleY,
          [dimension + "Y"]:
            chapterPosition.y +
            BibleVizUtils.Data.tags.StackPieceMeasurements
              .ChapterFrontSelectedDepth /
              2,
        },
        duration,
        easing,
      }),
    ])
      .then(() => {
        setTagMask(thisBot, "isExpanded", false);
        setTagMask(thisBot, "isHighlighted", false);
      })
      .finally(() => {
        setTagMask(thisBot, "isDeselecting", false);
      });
  }
}
