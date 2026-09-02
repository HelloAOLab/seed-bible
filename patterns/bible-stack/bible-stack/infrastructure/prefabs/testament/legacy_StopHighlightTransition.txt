import { LabelsRepository } from "bibleVizUtils.data.LabelsRepository";
import type { Bot } from "../../../../../typings/AuxLibraryDefinitions";
/**
 * Stops the highlight transition for the testament and its associated labels.
 * Resets the opacity and scale animations for the testament and its info labels.
 * @example
 * testament.StopHighlightTransition();
 */

// const dimension = os.getCurrentDimension();

animateTag(thisBot, "scaleX", null);
animateTag(thisBot, "scaleY", null);

const infoLabelTransformer =
  LabelsRepository.getLabelTransformerByOwner(thisBot);

if (!infoLabelTransformer) {
  console.warn("infoLabelTransformer not found at StopHighlightTransition");
  return;
}

const {
  infoLabel,
  infoLabelTail,
}: { infoLabel: Bot | undefined; infoLabelTail: Bot | undefined } =
  infoLabelTransformer.GetLabelElements();

if (!infoLabel) {
  console.warn("infoLabel not found at StopHighlightTransition");
  return;
}
if (!infoLabelTail) {
  console.warn("infoLabelTail not found at StopHighlightTransition");
  return;
}
animateTag(infoLabel, "formOpacity", null);
animateTag(infoLabel, "labelOpacity", null);
animateTag(infoLabelTail, "formOpacity", null);
