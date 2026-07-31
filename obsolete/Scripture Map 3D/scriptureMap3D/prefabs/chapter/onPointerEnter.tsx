import { CanvasInteractions } from "bibleVizUtils.models.canvas";

setTagMask(thisBot, "hovered", true);
shout(`OnLayoutChapterInteracted`, {
  chapter: thisBot,
  typeOfInteraction: CanvasInteractions.HoverBegin,
});
