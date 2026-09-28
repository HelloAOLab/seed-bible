/**
 * Triggers an OnStackBookInteracted event when the book's label has been interacted.
 * @example
 * book.OnLabelInteracted()
 */

import { CanvasInteractions } from "bibleVizUtils.models.canvas";

shout("OnStackBookInteracted", {
  book: thisBot,
  typeOfInteraction: CanvasInteractions.Tap,
});
