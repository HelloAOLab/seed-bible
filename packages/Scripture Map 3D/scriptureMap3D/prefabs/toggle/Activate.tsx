import type { LayoutBibleData } from "bibleVizUtils.models.entities.LayoutBibleData";
import { HexToRgb } from "bibleVizUtils.functions.index";

const dimension = os.getCurrentDimension();

const backgroundCurrentColor = HexToRgb({
  hexColor: links.background.masks.color ?? links.background.tags.color,
});

const duration = 0.125;
thisBot.StopToggleAnimation();

const layoutData: LayoutBibleData | undefined =
  ScriptureMap3DManager.GetLayoutDataById({
    layoutId: thisBot.tags.layoutId,
  });

if (!layoutData) {
  throw new Error(
    "scriptureMap3D.prefabs.toggle.Activate: layoutData not found."
  );
}

ColorLerper.LerpTag({
  startingColor: backgroundCurrentColor,
  endingColor: HexToRgb({ hexColor: thisBot.tags.backgroundActiveColor }),
  durationInSeconds: duration,
  bot: links.background,
  tag: BibleVizUtils.Data.tags.InterpolatableColorTags.Color,
});

if (this.tags.toggleSize == 2) {
  animateTag(links.handle, dimension + "X", {
    toValue:
      links.background.tags[dimension + "X"] +
      links.background.tags.scaleX / 2 -
      links.handle.tags.scaleX / 2 -
      (links.background.tags.scaleY - links.handle.tags.scaleY) / 2,
    duration,
    easing: { type: "sinusoidal", mode: "inout" },
  });
} else if (this.tags.toggleSize == 3) {
  if (layoutData.isDatesEnabled == 3) {
    animateTag(links.handle, dimension + "X", {
      toValue:
        links.background.tags[dimension + "X"] +
        links.background.tags.scaleX / 2 -
        links.handle.tags.scaleX / 2 -
        (links.background.tags.scaleY - links.handle.tags.scaleY) / 2,
      duration,
      easing: { type: "sinusoidal", mode: "inout" },
    });

    ColorLerper.LerpTag({
      startingColor: backgroundCurrentColor,
      endingColor: HexToRgb({ hexColor: "#0DA0FC" }),
      durationInSeconds: duration,
      bot: links.background,
      tag: BibleVizUtils.Data.tags.InterpolatableColorTags.Color,
    });
  } else if (layoutData.isDatesEnabled == 2) {
    animateTag(links.handle, dimension + "X", {
      toValue:
        links.background.tags[dimension + "X"] +
        links.background.tags.scaleX / 2 -
        links.handle.tags.scaleX / 2 -
        (links.background.tags.scaleY - links.handle.tags.scaleY) / 2 -
        0.7,
      duration,
      easing: { type: "sinusoidal", mode: "inout" },
    });
  }
}

thisBot.AditionalActivateFunction?.();
