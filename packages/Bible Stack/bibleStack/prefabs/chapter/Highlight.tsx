import { LabelsRepository } from "bibleVizUtils.data.LabelsRepository";
import { SpawnLabelForPiece } from "bibleVizUtils.controllers.label.lifecycle";
import { LabelPositionings } from "bibleVizUtils.models.enums";
import { HexToRgb } from "bibleVizUtils.functions.index";

/**
 * Highlights the chapter by animating its color and scale.
 * @returns {Promise<boolean>} - Returns true if the highlight animation is successful.
 * @example
 * const result = chapter.Highlight();
 */

const chapterData = BibleStackManager.GetPieceData({ piece: thisBot });
const duration = 0.1;
const rgbTargetColor = HexToRgb({
  hexColor: BibleVizUtils.Data.masks.isInHistoryMode
    ? BibleVizUtils.Functions.GetHistoryColor({ piece: thisBot })
    : (chapterData.highlightColor ?? thisBot.tags.highlightedColor),
});
const animations = [];
thisBot.StopChapterTransition();
const dimension = os.getCurrentDimension();
const easing = { type: "sinusoidal", mode: "inout" };
if (
  !chapterData.piece.masks.isSelecting &&
  !chapterData.piece.masks.isDeselecting &&
  chapterData.isSelected &&
  thisBot.masks.isOnTheGround
) {
  const desiredScaleZ = thisBot.tags.expandedScales.z + 0.1;
  animations.push(
    animateTag(thisBot, "scaleZ", {
      toValue: desiredScaleZ,
      duration,
      easing,
    })
  );
} else {
  const label = `${thisBot.tags.parentBookName} ${thisBot.tags.chapterNumber}`;

  const infoLabelTransformer =
    LabelsRepository.getLabelTransformerByOwner(thisBot) ??
    SpawnLabelForPiece({
      piece: thisBot,
      label,
      color: "white",
      labelColor: "black",
      dimension,
      labelPositioning: thisBot.masks.isOnTheGround
        ? LabelPositionings.Top
        : LabelPositionings.LeftSided,
      isAnimatable: false,
      pointableDefault: false,
    }).infoLabelTransformer;

  animations.push(
    infoLabelTransformer.Show({ duration, manager: BibleStackManager })
  );
}

setTagMask(thisBot, "isHighlighting", true);
if (
  !chapterData.piece.masks.isSelecting &&
  !chapterData.piece.masks.isDeselecting &&
  (!chapterData.isSelected || thisBot.masks.isOnTheGround)
)
  animations.push(
    ColorLerper.LerpTag({
      startingColor: HexToRgb({
        hexColor: thisBot.masks.color ?? thisBot.tags.color,
      }),
      endingColor: rgbTargetColor,
      durationInSeconds: duration,
      bot: thisBot,
      tag: BibleVizUtils.Data.tags.InterpolatableColorTags.Color,
    })
  );

try {
  await Promise.all(animations).then(() => {
    setTagMask(thisBot, "isHighlighted", true);
  });
} catch (error) {
  void error;
} finally {
  setTagMask(thisBot, "isHighlighting", false);
}
