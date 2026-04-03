import { CanvasInteractions } from "bibleVizUtils.models.canvas";

shout("OnStackBookInteracted", {
  book: thisBot,
  typeOfInteraction: CanvasInteractions.Drop,
  dropEvent: that,
});
