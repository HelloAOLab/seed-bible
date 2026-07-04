/**
 * Triggers an OnStackSectionInteracted event when the sectionShadow's label has been interacted.
 * @example
 * sectionShadow.OnLabelInteracted()
 */
import { CanvasInteractions } from "bibleVizUtils.models.canvas";

shout("OnSectionShadowInteracted", {
  sectionShadow: thisBot,
  typeOfInteraction: CanvasInteractions.Tap,
});
