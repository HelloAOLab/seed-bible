if (!thisBot.masks.color) setTagMask(thisBot, "color", thisBot.tags.color);
const startingColorHex = thisBot.tags.initialColor;
const startingColorRgb = BibleVizUtils.Functions.HexToRgb({
  hexColor: startingColorHex,
});
const targetColorRgb = BibleVizUtils.Functions.HexToRgb({
  hexColor: "#139981",
});
const blinkDuration = 0.25;

try {
  await ColorLerper.LerpTag({
    startingColor: startingColorRgb,
    endingColor: targetColorRgb,
    durationInSeconds: blinkDuration,
    bot: thisBot,
    tag: BibleVizUtils.Data.tags.InterpolatableColorTags.Color,
  }).then(() => {
    return ColorLerper.LerpTag({
      startingColor: targetColorRgb,
      endingColor: startingColorRgb,
      durationInSeconds: blinkDuration,
      bot: thisBot,
      tag: BibleVizUtils.Data.tags.InterpolatableColorTags.Color,
    });
  });
} catch (error) {
  throw new Error(error);
} finally {
  setTagMask(thisBot, "color", thisBot.tags.initialColor);
}
