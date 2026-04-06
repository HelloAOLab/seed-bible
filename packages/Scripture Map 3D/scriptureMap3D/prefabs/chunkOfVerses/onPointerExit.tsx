import { CanvasInteractions } from "bibleVizUtils.models.canvas";

shout("OnLayoutChunkOfVersesInteracted", {
  chunk: thisBot,
  typeOfInteraction: CanvasInteractions.HoverEnd,
});
