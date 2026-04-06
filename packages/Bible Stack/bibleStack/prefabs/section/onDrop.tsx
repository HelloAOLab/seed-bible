import { CanvasInteractions } from "bibleVizUtils.models.canvas";

shout("OnStackSectionInteracted", {
  section: thisBot,
  typeOfInteraction: CanvasInteractions.Drop,
  dropEvent: that,
});
