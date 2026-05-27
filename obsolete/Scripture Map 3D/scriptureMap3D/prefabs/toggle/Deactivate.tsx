import { HexToRgb } from "bibleVizUtils.functions.index";

const dimension = os.getCurrentDimension();
const backgroundCurrentColor = HexToRgb({
  hexColor: links.background.masks.color ?? links.background.tags.color,
});

const duration = 0.125;

thisBot.StopToggleAnimation();
ColorLerper.LerpTag({
  startingColor: backgroundCurrentColor,
  endingColor: HexToRgb({ hexColor: thisBot.tags.backgroundInactiveColor }),
  durationInSeconds: duration,
  bot: links.background,
  tag: BibleVizUtils.Data.tags.InterpolatableColorTags.Color,
});
animateTag(links.handle, dimension + "X", {
  toValue:
    links.background.tags[dimension + "X"] -
    links.background.tags.scaleX / 2 +
    links.handle.tags.scaleX / 2 +
    (links.background.tags.scaleY - links.handle.tags.scaleY) / 2,
  duration,
  easing: { type: "sinusoidal", mode: "inout" },
});
thisBot.AditionalDeactivateFunction?.();
