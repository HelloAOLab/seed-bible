/**
 * Triggers an OnStackSectionInteracted event when the testament's label has been interacted.
 * @example
 * testament.OnLabelInteracted()
 */
import { CanvasInteractions } from "bibleVizUtils.models.canvas";

shout("OnStackTestamentInteracted", {
  testament: thisBot,
  typeOfInteraction: CanvasInteractions.Tap,
});
