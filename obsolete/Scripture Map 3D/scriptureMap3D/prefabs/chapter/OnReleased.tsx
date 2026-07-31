import { tryHideIndicators } from "bibleVizUtils.controllers.userPresence.activityIndicatorsController";
import { tryHideNotification } from "bibleVizUtils.controllers.userPresence.activityNotificationController";

thisBot.tags.desiredLabel = null;
thisBot.tags.toErase = null;
thisBot.tags.parentBookName = null;
thisBot.tags.arrangementIndex = null;
thisBot.tags.layerIndex = null;
thisBot.tags.structureIndex = null;
thisBot.tags.chapterNumber = null;
thisBot.tags.label = null;
thisBot.tags.dateWrote = null;
tryHideIndicators(thisBot);
tryHideNotification(thisBot);
