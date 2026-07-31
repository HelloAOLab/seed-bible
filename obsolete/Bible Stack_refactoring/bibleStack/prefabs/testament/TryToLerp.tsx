import { HexToRgb } from "bibleVizUtils.functions.index";

globalThis.LERP_YT_TIMEOUT = setTimeout(async () => {
  globalThis.CLEARABLE_LERPING = true;
  const colorLerpDuration = 1.2;
  await ColorLerper.LerpTag({
    startingColor: HexToRgb({ hexColor: "#ffffff" }),
    endingColor: [135, 206, 235],
    durationInSeconds: colorLerpDuration,
    bot: thisBot,
    tag: BibleVizUtils.Data.tags.InterpolatableColorTags.Color,
  });
}, 300);
