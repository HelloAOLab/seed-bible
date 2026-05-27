import { CanvasInteractions } from "bibleVizUtils.models.canvas";

shout("OnStackTestamentInteracted", {
  testament: thisBot,
  typeOfInteraction: CanvasInteractions.Drop,
  dropEvent: that,
});
