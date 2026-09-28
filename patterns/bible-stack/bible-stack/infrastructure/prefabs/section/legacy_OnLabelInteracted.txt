/**
 * Triggers an OnStackSectionInteracted event when the section's label has been interacted.
 * @example
 * section.OnLabelInteracted()
 */
import { CanvasInteractions } from "bibleVizUtils.models.canvas";

shout("OnStackSectionInteracted", {
  section: thisBot,
  typeOfInteraction: CanvasInteractions.Tap,
});
