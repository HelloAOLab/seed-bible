/**
 * Selects the chapter by animating its color and scaling effects, and displaying its verses if it is on the ground.
 * @returns {Promise<boolean>} - Returns true if the selection animation is successful.
 * @example
 * const result = chapter.Select();
 */

const chapterData = BibleStackManager.GetPieceData({ piece: thisBot });
const dimension = os.getCurrentDimension();
let duration;
const easing = { type: "sinusoidal", mode: "out" };
const chapterPosition = getBotPosition(chapterData.piece, dimension);

const delayBetweenChunkAnimations = 35;
const chunkAnimationDuration = 0.15;
if (chapterData) {
  thisBot.StopChapterTransition();
  let rgbTargetColor;

  setTagMask(thisBot, "isSelecting", true);
  if (thisBot.masks.isOnTheGround) {
    const infoLabelTransformer =
      BibleVizUtils.Functions.GetCurrentInfoLabelTransformer(thisBot);
    if (infoLabelTransformer) {
      ObjectPooler.ReleaseObject({
        obj: infoLabelTransformer,
        tag: infoLabelTransformer.tags.poolTag,
      });
    }
    const chapterScales = BibleVizUtils.Functions.GetBotScales(thisBot);
    const labelText = `${thisBot.tags.parentBookName} ${thisBot.tags.chapterNumber}`;
    const chapterMargin = 0.5;
    duration = 0.15;
    rgbTargetColor = BibleVizUtils.Functions.HexToRgb({
      hexColor: BibleVizUtils.Data.masks.isInHistoryMode
        ? BibleVizUtils.Functions.GetHistoryColor({ piece: thisBot })
        : (chapterData.highlightColor ?? thisBot.tags.initialColor),
    });

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
        setTagMask(chapterData.piece, "labelPosition", "top");
        setTagMask(chapterData.piece, "label", labelText);
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
          scaleX: thisBot.tags.expandedScales.x,
          scaleY: thisBot.tags.expandedScales.y,
          scaleZ: thisBot.tags.expandedScales.z,
        },
        duration,
        easing,
      }),
    ])
      .then(async () => {
        const chunksOfVerses = await thisBot.GetChunksOfVerses();
        thisBot.vars.chunksOfVerses = chunksOfVerses;
        chunksOfVerses.forEach((chunk: any, index) => {
          setTagMask(chunk, dimension + "X", chapterPosition.x);
          setTagMask(
            chunk,
            dimension + "Y",
            chapterPosition.y -
              thisBot.tags.expandedScales.y / 2 -
              chunk.tags.scaleY / 2 -
              chapterMargin -
              index * (chapterMargin + chunk.tags.scaleY)
          );
          setTagMask(chunk, dimension + "Z", chapterPosition.z);
        });
        return Promise.all(
          chunksOfVerses.map((chunk: any, index) => {
            return chunk.Show({
              index,
              dimension,
              delayBetweenAnimations: delayBetweenChunkAnimations,
              duration: chunkAnimationDuration,
            });
          })
        ).then(() => {
          setTagMask(thisBot, "isExpanded", true);
          // setTagMask(thisBot, "isHighlighted", true);
        });
      })
      .finally(() => {
        setTagMask(thisBot, "isSelecting", false);
      });
  } else {
    duration = 0.15;
    rgbTargetColor = BibleVizUtils.Functions.HexToRgb({
      hexColor: BibleVizUtils.Data.masks.isInHistoryMode
        ? BibleVizUtils.Functions.GetHistoryColor({ piece: thisBot })
        : (chapterData.highlightColor ?? thisBot.tags.selectedColor),
    });

    await Promise.all([
      ColorLerper.LerpTag({
        endingColor: rgbTargetColor,
        durationInSeconds: duration,
        bot: chapterData.piece,
        tag: BibleVizUtils.Data.tags.InterpolatableColorTags.Color,
      }),
      animateTag(chapterData.piece, {
        fromValue: {
          scaleY: chapterData.piece.tags.initialScaleY,
          [dimension + "Y"]: chapterPosition.y,
        },
        toValue: {
          scaleY: chapterData.piece.tags.selectedScaleY,
          [dimension + "Y"]:
            chapterPosition.y -
            BibleVizUtils.Data.tags.StackPieceMeasurements
              .ChapterFrontSelectedDepth /
              2,
        },
        duration,
        easing,
      }),
    ])
      .then(() => {
        // setTagMask(thisBot, "isHighlighted", true);
      })
      .finally(() => {
        setTagMask(thisBot, "isSelecting", false);
      });
  }
  return true;
}
