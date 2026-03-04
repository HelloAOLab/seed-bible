import { LayoutBookData } from "bibleVizUtils.classes.LayoutBookData";
import { LayoutChapterData } from "bibleVizUtils.classes.LayoutChapterData";
import { tryHideNotification } from "bibleVizUtils.controllers.userPresence.activityNotificationController";
const { data } = that;
const { layoutData, layoutBookData } = thisBot.GetDataChainFromParentDataIds({
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
    tryHideNotification(data.piece);
    await data.piece.Unhighlight({ chapterData: data });
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
