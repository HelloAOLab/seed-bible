import { CanvasInteractions } from "bibleVizUtils.models.canvas";

const chapterData = BibleStackManager.GetPieceData({ piece: thisBot });
shout("OnStackChapterInteracted", {
  chapterData,
  draggingEvent: that,
  typeOfInteraction: CanvasInteractions.Drag,
});
os.enableCustomDragging();
