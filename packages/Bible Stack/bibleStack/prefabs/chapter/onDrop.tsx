import { CanvasInteractions } from "bibleVizUtils.models.canvas";

const chapterData = BibleStackManager.GetPieceData({ piece: thisBot });
shout("OnStackChapterInteracted", {
  chapterData,
  typeOfInteraction: CanvasInteractions.Drop,
  dropEvent: that,
});
