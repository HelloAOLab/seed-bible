import { CanvasInteractions } from "bibleVizUtils.models.canvas";

setTagMask(thisBot, "isBeingHovered", true);
shout("OnStackSectionInteracted", {
  section: thisBot,
  typeOfInteraction: CanvasInteractions.HoverBegin,
});
