import { CanvasInteractions } from "bibleVizUtils.models.canvas";

setTagMask(thisBot, "isPointed", true);
const chapterData = BibleStackManager.GetPieceData({ piece: thisBot });
shout("OnStackChapterInteracted", {
  chapterData,
  typeOfInteraction: CanvasInteractions.HoverBegin,
});
