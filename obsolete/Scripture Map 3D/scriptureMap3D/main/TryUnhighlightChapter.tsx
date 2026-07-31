import { updateNotification } from "bibleVizUtils.controllers.userPresence.activityNotificationController";

const { chapterData } = that;

if (
  !chapterData.piece.masks.isSelecting &&
  !chapterData.piece.masks.isDeselecting &&
  !chapterData.piece.masks.isBeingDragged
) {
  chapterData.piece.Unhighlight({ chapterData }).then(() => {
    if (!chapterData.piece.masks.isExpanded)
      updateNotification(chapterData, thisBot.tags.activityNotificationOffset, {
        x: thisBot.tags.activityNotificationScaleX,
        y: thisBot.tags.activityNotificationScaleY,
      });
  });
}
