import { CanvasInteractions } from "bibleVizUtils.models.canvas";

setTagMask(thisBot, "isBeingHovered", false);
shout("OnStackSectionInteracted", {
  section: thisBot,
  typeOfInteraction: CanvasInteractions.HoverEnd,
});
