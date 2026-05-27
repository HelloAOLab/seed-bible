import { CanvasInteractions } from "bibleVizUtils.models.canvas";

setTagMask(thisBot, "isBeingHovered", true);
shout("OnStackBookInteracted", {
  book: thisBot,
  typeOfInteraction: CanvasInteractions.HoverBegin,
});
