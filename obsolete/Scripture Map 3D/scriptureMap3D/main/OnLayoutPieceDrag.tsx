import { LayoutBookData } from "bibleVizUtils.models.entities.LayoutBookData";
import { LayoutChapterData } from "bibleVizUtils.models.entities.LayoutChapterData";
import type { LayoutBibleData } from "bibleVizUtils.models.entities.LayoutBibleData";
import { tryHideNotification } from "bibleVizUtils.controllers.userPresence.activityNotificationController";
const { data }: { data: LayoutBookData | LayoutChapterData | undefined } = that;

if (!data) {
  console.error("data is not defined at OnLayoutPieceDrag");
  return;
}

if (!data.piece) {
  console.warn("data.piece is not defined OnLayoutPieceDrag");
  return;
}

const {
  layoutData,
  layoutBookData,
}: {
  layoutData: LayoutBibleData | undefined;
  layoutBookData: LayoutBookData | undefined;
} = await thisBot.GetDataChainFromParentDataIds({
  parentDataIds: data.parentDataIds,
});
let pulledOutFromParent = false;

setTagMask(data.piece, "isOnTheGround", false);
setTagMask(data.piece, "isBeingDragged", true);

switch (true) {
  case data instanceof LayoutBookData:
    if (layoutData) pulledOutFromParent = true;
    break;
  case data instanceof LayoutChapterData:
    if (layoutData || layoutBookData) pulledOutFromParent = true;
    if (data.piece) {
      tryHideNotification(data.piece);
      await data.piece.Unhighlight({ chapterData: data });
    }
    break;
  default:
    break;
}
if (pulledOutFromParent)
  thisBot.PullOutPieceFromParent({
    pieceData: data,
    layoutData,
    layoutBookData,
  });
