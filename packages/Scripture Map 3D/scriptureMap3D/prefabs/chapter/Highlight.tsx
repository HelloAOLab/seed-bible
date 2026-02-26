import { LabelsRepository } from "bibleVizUtils.data.LabelsRepository";
const chapterData = ScriptureMap3DManager.GetPieceData({ piece: thisBot });
const duration = 0.1;

let rgbTargetColor;

const animations = [];
const dimension = os.getCurrentDimension();
const easing = { type: "sinusoidal", mode: "inout" };
thisBot.StopChapterTransition();

if (thisBot.masks.isExpanded) {
  const desiredScaleZ = thisBot.tags.expandedScales.z + 0.1;
  animations.push(
    animateTag(thisBot, "scaleZ", {
      toValue: desiredScaleZ,
      duration,
      easing,
    })
  );
  rgbTargetColor = BibleVizUtils.Functions.HexToRgb({
    hexColor: BibleVizUtils.Data.masks.isInHistoryMode
      ? BibleVizUtils.Functions.GetHistoryColor({ piece: thisBot })
      : (chapterData.highlightColor ?? thisBot.tags.highlightedColor),
  });
} else {
  const label = `${thisBot.tags.parentBookName} ${thisBot.tags.chapterNumber}`;

  const infoLabelTransformer =
    LabelsRepository.getLabelTransformerByOwner(thisBot) ??
    BibleVizUtils.Functions.GetLabelForPiece({
      piece: thisBot,
      label,
      color: "white",
      labelColor: "black",
      dimension,
      labelPositioning: BibleVizUtils.Data.tags.LabelPositioning.Top,
      isAnimatable: false,
    }).infoLabelTransformer;

  animations.push(
    infoLabelTransformer.Show({ duration, manager: ScriptureMap3DManager })
  );
  if (!chapterData.isSelected) {
    rgbTargetColor = BibleVizUtils.Functions.HexToRgb({
      hexColor: BibleVizUtils.Data.masks.isInHistoryMode
        ? BibleVizUtils.Functions.GetHistoryColor({ piece: thisBot })
        : (chapterData.highlightColor ?? thisBot.tags.highlightedColor),
    });
  }
}

setTagMask(thisBot, "isHighlighting", true);
if (rgbTargetColor)
  animations.push(
    ColorLerper.LerpTag({
      startingColor: BibleVizUtils.Functions.HexToRgb({
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
