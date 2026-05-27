import { CanvasInteractions } from "bibleVizUtils.models.canvas";
import type { StackChapterData } from "@packages/Bible Visualization Utils/bibleVizUtils/models/entities/StackChapterData";

const chapterData = await (BibleStackManager.GetPieceData({
  piece: thisBot,
}) as Promise<StackChapterData | undefined>);

if (!chapterData) {
  throw new Error("onDrag: chapterData not found.");
}

shout("OnStackChapterInteracted", {
  chapterData,
  draggingEvent: that,
  typeOfInteraction: CanvasInteractions.Drag,
});
os.enableCustomDragging();
