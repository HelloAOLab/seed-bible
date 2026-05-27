import { CanvasInteractions } from "bibleVizUtils.models.canvas";

shout("OnStackSectionInteracted", {
  section: thisBot,
  typeOfInteraction: CanvasInteractions.Drag,
  draggingEvent: that,
});
os.enableCustomDragging();
