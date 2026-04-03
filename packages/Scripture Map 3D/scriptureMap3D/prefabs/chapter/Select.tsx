import { LabelsRepository } from "bibleVizUtils.data.LabelsRepository";
import { GetBotScales, HexToRgb } from "bibleVizUtils.functions.index";
import type { StackChapterData } from "bibleVizUtils.models.entities.StackChapterData";

/**
 * Selects the chapter by animating its color and scaling effects, and displaying its verses if it has been dragged out of the map
 * @returns {Promise<boolean>} - Returns true if the selection animation is successful.
 * @example
 * const result = chapter.Select();
 */

const { duration = 0.15, layoutData } = that;
const dimension = os.getCurrentDimension();
const chapterData = await (ScriptureMap3DManager.GetPieceData({
  piece: thisBot,
}) as Promise<StackChapterData | undefined>);

if (!chapterData) {
  throw new Error("Select: chapterData not found.");
}

const easing = { type: "sinusoidal", mode: "out" };
const chapterPosition = getBotPosition(thisBot, dimension);
const delayBetweenChunkAnimations = 35;
const chunkAnimationDuration = 0.15;
let rgbTargetColor;
const infoLabelTransformer =
  LabelsRepository.getLabelTransformerByOwner(thisBot);

setTagMask(thisBot, "isSelecting", true);
if (infoLabelTransformer) {
  ObjectPooler.ReleaseObject({
    obj: infoLabelTransformer,
    tag: infoLabelTransformer.tags.poolTag,
  });
}

if (thisBot.tags.toErase && layoutData.isChapterExpandEnabled) {
  const chapterScales = GetBotScales(thisBot);
  const labelText = `${thisBot.tags.parentBookName} ${thisBot.tags.chapterNumber}`;
  const chapterMargin = 0.5;
  rgbTargetColor = HexToRgb({
    hexColor: BibleVizUtils.Data.masks.isInHistoryMode
      ? BibleVizUtils.Functions.GetHistoryColor({ piece: thisBot })
      : (chapterData.highlightColor ?? thisBot.tags.initialColor),
  });

  await Promise.all([
    ColorLerper.LerpTag({
      endingColor: rgbTargetColor,
      durationInSeconds: duration,
      bot: thisBot,
      tag: BibleVizUtils.Data.tags.InterpolatableColorTags.Color,
    }),
    animateTag(thisBot, "labelOpacity", {
      toValue: 0,
      duration: duration / 2,
      easing,
    }).then(() => {
      setTag(thisBot, "labelFontSize", null);
      setTag(thisBot, "label", labelText);
      return animateTag(thisBot, "labelOpacity", {
        toValue: 1,
        duration: duration / 2,
        easing,
      });
    }),
    animateTag(thisBot, {
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
      const chunksOfVerses = await thisBot.GetChunksOfVerses({ chapterData });
      thisBot.vars.chunksOfVerses = chunksOfVerses;
      chunksOfVerses.forEach((chunk, index) => {
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
        chunksOfVerses.map((chunk, index) => {
          return chunk.Show({
            index,
            dimension,
            delayBetweenAnimations: delayBetweenChunkAnimations,
            duration: chunkAnimationDuration,
          });
        })
      ).then(() => {
        setTagMask(thisBot, "isExpanded", true);
        setTagMask(thisBot, "isHighlighted", true);
      });
    })
    .finally(() => {
      setTagMask(thisBot, "isSelecting", false);
    });
} else {
  rgbTargetColor = HexToRgb({
    hexColor: BibleVizUtils.Data.masks.isInHistoryMode
      ? BibleVizUtils.Functions.GetHistoryColor({ piece: thisBot })
      : (chapterData.highlightColor ?? layoutData.chapterSelectColor),
  });
  await Promise.all([
    animateTag(this, "scaleZ", {
      toValue: thisBot.tags.selectedScaleZ,
      duration,
    }),
    ColorLerper.LerpTag({
      endingColor: rgbTargetColor,
      durationInSeconds: duration,
      bot: thisBot,
      tag: BibleVizUtils.Data.tags.InterpolatableColorTags.Color,
    }),
  ])
    .then(() => {
      setTagMask(thisBot, "isHighlighted", true);
    })
    .finally(() => {
      setTagMask(thisBot, "isSelecting", false);
    });
}
return true;
