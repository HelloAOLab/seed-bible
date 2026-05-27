import { CanvasInteractions } from "bibleVizUtils.models.canvas";

shout("OnStackBookInteracted", {
  book: thisBot,
  typeOfInteraction: CanvasInteractions.Drag,
  draggingEvent: that,
});
os.enableCustomDragging();
