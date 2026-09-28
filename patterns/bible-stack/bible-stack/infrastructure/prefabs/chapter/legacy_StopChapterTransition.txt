import { LabelsRepository } from "bibleVizUtils.data.LabelsRepository";
/**
 * Stops the chapter transition by resetting the opacity of the info label elements and stopping any ongoing color animations.
 * @example
 * chapter.StopChapterTransition();
 */

if (!thisBot.masks.isSelecting && !thisBot.masks.isDeselecting) {
  animateTag(thisBot, "scaleX", null);
  animateTag(thisBot, "scaleY", null);
  animateTag(thisBot, "scaleZ", null);
  ColorLerper.StopLerp({
    bot: thisBot,
    tag: BibleVizUtils.Data.tags.InterpolatableColorTags.Color,
  });
}

const infoLabelTransformer =
  LabelsRepository.getLabelTransformerByOwner(thisBot);
if (infoLabelTransformer) {
  const { infoLabel, infoLabelTail, infoLabelUsersColor } =
    infoLabelTransformer.GetLabelElements();
  animateTag(infoLabel, "formOpacity", null);
  animateTag(infoLabel, "labelOpacity", null);
  animateTag(infoLabelTail, "formOpacity", null);
  animateTag(infoLabelUsersColor, "labelOpacity", null);
  animateTag(infoLabelUsersColor, "formOpacity", null);
}
