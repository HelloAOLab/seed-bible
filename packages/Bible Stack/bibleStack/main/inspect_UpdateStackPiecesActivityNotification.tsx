import { updateNotification } from "bibleVizUtils.controllers.userPresence.activityNotificationController";

const piecesData = [...thisBot.vars.stackChaptersData];

updateNotification(piecesData, thisBot.tags.activityNotificationOffset, {
  x: thisBot.tags.activityNotificationScaleX,
  y: thisBot.tags.activityNotificationScaleY,
});
