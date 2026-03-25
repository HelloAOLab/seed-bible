import { CanvasInteractions } from "bibleVizUtils.models.canvas";
import type { StackChapterData } from "@packages/Bible Visualization Utils/bibleVizUtils/models/entities/StackChapterData";

setTagMask(thisBot, "isPointed", false);

const chapterData = await (BibleStackManager.GetPieceData({
  piece: thisBot,
}) as Promise<StackChapterData | undefined>);

if (!chapterData) {
  throw new Error("onPointerExit: chapterData not found.");
}

shout("OnStackChapterInteracted", {
  chapterData,
  typeOfInteraction: CanvasInteractions.HoverEnd,
});
