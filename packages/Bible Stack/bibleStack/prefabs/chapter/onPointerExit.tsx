import { CanvasInteractions } from "bibleVizUtils.models.canvas";

setTagMask(thisBot, "isPointed", false);
const chapterData = BibleStackManager.GetPieceData({ piece: thisBot });
shout("OnStackChapterInteracted", {
  chapterData,
  typeOfInteraction: CanvasInteractions.HoverEnd,
});
