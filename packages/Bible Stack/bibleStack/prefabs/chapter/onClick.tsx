import type { StackChapterData } from "@packages/Bible Visualization Utils/bibleVizUtils/models/entities/StackChapterData";
import { CanvasInteractions } from "bibleVizUtils.models.canvas";

const chapterData = await (BibleStackManager.GetPieceData({
  piece: thisBot,
}) as Promise<StackChapterData | undefined>);

if (!chapterData) {
  throw new Error("onClick: chapterData not found.");
}

shout("OnStackChapterInteracted", {
  chapterData,
  typeOfInteraction: CanvasInteractions.Click,
});
