import { CanvasInteractions } from "bibleVizUtils.models.canvas";

shout("OnStackTestamentInteracted", {
  testament: thisBot,
  typeOfInteraction: CanvasInteractions.Dragging,
  draggingEvent: that,
});
