import { CanvasInteractions } from "bibleVizUtils.models.canvas";

setTagMask(thisBot, "hovered", false);
shout(`OnLayoutChapterInteracted`, {
  chapter: thisBot,
  typeOfInteraction: CanvasInteractions.HoverEnd,
});
