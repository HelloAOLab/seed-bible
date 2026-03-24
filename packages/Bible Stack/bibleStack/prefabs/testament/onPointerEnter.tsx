import { CanvasInteractions } from "bibleVizUtils.models.canvas";

setTagMask(thisBot, "isBeingHovered", true);
shout("OnStackTestamentInteracted", {
  testament: thisBot,
  typeOfInteraction: CanvasInteractions.HoverBegin,
});
