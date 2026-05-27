import { CanvasInteractions } from "bibleVizUtils.models.canvas";

shout("OnStackBookInteracted", {
  book: thisBot,
  typeOfInteraction: CanvasInteractions.Dragging,
  draggingEvent: that,
});
