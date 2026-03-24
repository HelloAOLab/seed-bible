import { CanvasInteractions } from "bibleVizUtils.models.canvas";

shout("OnStackTestamentInteracted", {
  testament: thisBot,
  typeOfInteraction: CanvasInteractions.Drag,
  draggingEvent: that,
});
os.enableCustomDragging();
