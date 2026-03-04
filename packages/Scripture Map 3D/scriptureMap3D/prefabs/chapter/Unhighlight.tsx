const { chapterData } = that;
const duration = 0.1;
let rgbTargetColor;
const animations = [];
// const dimension = os.getCurrentDimension();
const easing = { type: "sinusoidal", mode: "inout" };
thisBot.StopChapterTransition();

if (thisBot.masks.isExpanded) {
  animations.push(
    animateTag(thisBot, "scaleZ", {
      toValue: thisBot.tags.expandedScales.z,
      duration,
      easing,
    })
  );
  rgbTargetColor = BibleVizUtils.Functions.HexToRgb({
    hexColor: BibleVizUtils.Data.masks.isInHistoryMode
      ? BibleVizUtils.Functions.GetHistoryColor({ piece: thisBot })
      : (chapterData.highlightColor ?? thisBot.tags.initialColor),
  });
} else {
  const infoLabelTransformer =
    BibleVizUtils.Functions.GetCurrentInfoLabelTransformer(thisBot);
  if (infoLabelTransformer)
    animations.push(
      infoLabelTransformer.Hide({ duration }).then(() => {
        ObjectPooler.ReleaseObject({
          obj: infoLabelTransformer,
          tag: infoLabelTransformer.tags.poolTag,
        });
      })
    );
  if (!chapterData.isSelected) {
    rgbTargetColor = BibleVizUtils.Functions.HexToRgb({
      hexColor: BibleVizUtils.Data.masks.isInHistoryMode
        ? BibleVizUtils.Functions.GetHistoryColor({ piece: thisBot })
        : (chapterData.highlightColor ?? thisBot.tags.initialColor),
    });
  }
}

setTagMask(thisBot, "isUnhighlighting", true);
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
    setTagMask(thisBot, "isHighlighted", false);
  });
} catch (error) {
  void error;
} finally {
  setTagMask(thisBot, "isUnhighlighting", false);
}
