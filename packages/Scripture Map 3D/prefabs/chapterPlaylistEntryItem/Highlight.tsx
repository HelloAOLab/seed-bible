if (!thisBot.masks.color) setTagMask(thisBot, "color", thisBot.tags.color);
if (!thisBot.masks.strokeColor)
  setTagMask(thisBot, "strokeColor", thisBot.tags.strokeColor);
const startingColorHex = thisBot.masks.color;
const startingColorRgb = BibleVizUtils.Functions.HexToRgb({
  hexColor: startingColorHex,
});
const targetColorRgb = BibleVizUtils.Functions.HexToRgb({
  hexColor: "#DCF0EC",
});
const targetStrokeColorRgb = BibleVizUtils.Functions.HexToRgb({
  hexColor: "#139981",
});
const blinkDuration = 0.25;

try {
  await Promise.all([
    ColorLerper.LerpTag({
      startingColor: startingColorRgb,
      endingColor: targetColorRgb,
      durationInSeconds: blinkDuration,
      bot: thisBot,
      tag: BibleVizUtils.Data.tags.InterpolatableColorTags.Color,
    }),
    ColorLerper.LerpTag({
      startingColor: startingColorRgb,
      endingColor: targetStrokeColorRgb,
      durationInSeconds: blinkDuration,
      bot: thisBot,
      tag: BibleVizUtils.Data.tags.InterpolatableColorTags.StrokeColor,
    }),
  ]).then(() => {
    return Promise.all([
      ColorLerper.LerpTag({
        startingColor: targetColorRgb,
        endingColor: startingColorRgb,
        durationInSeconds: blinkDuration,
        bot: thisBot,
        tag: BibleVizUtils.Data.tags.InterpolatableColorTags.Color,
      }),
      ColorLerper.LerpTag({
        startingColor: targetStrokeColorRgb,
        endingColor: startingColorRgb,
        durationInSeconds: blinkDuration,
        bot: thisBot,
        tag: BibleVizUtils.Data.tags.InterpolatableColorTags.StrokeColor,
      }),
    ]).then(() => {
      return Promise.all([
        ColorLerper.LerpTag({
          startingColor: startingColorRgb,
          endingColor: targetColorRgb,
          durationInSeconds: blinkDuration,
          bot: thisBot,
          tag: BibleVizUtils.Data.tags.InterpolatableColorTags.Color,
        }),
        ColorLerper.LerpTag({
          startingColor: startingColorRgb,
          endingColor: targetStrokeColorRgb,
          durationInSeconds: blinkDuration,
          bot: thisBot,
          tag: BibleVizUtils.Data.tags.InterpolatableColorTags.StrokeColor,
        }),
      ]);
    });
  });
} catch (error) {
  throw new Error(error);
} finally {
  // setTagMask(thisBot, "color", "#DCF0EC");
}
