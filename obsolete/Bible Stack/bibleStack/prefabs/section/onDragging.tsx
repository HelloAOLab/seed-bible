import { CanvasInteractions } from "bibleVizUtils.models.canvas";

shout("OnStackSectionInteracted", {
  section: thisBot,
  typeOfInteraction: CanvasInteractions.Dragging,
  draggingEvent: that,
});
