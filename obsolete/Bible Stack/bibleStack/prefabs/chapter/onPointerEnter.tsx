import { CanvasInteractions } from "bibleVizUtils.models.canvas";
import type { StackChapterData } from "@packages/Bible Visualization Utils/bibleVizUtils/models/entities/StackChapterData";

setTagMask(thisBot, "isPointed", true);

const chapterData = await (BibleStackManager.GetPieceData({
  piece: thisBot,
}) as Promise<StackChapterData | undefined>);

if (!chapterData) {
  throw new Error("onPointerEnter: chapterData not found.");
}

shout("OnStackChapterInteracted", {
  chapterData,
  typeOfInteraction: CanvasInteractions.HoverBegin,
});
