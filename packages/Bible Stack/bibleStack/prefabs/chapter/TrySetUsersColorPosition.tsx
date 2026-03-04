import { updateIndicators } from "bibleVizUtils.controllers.userPresence.activityIndicatorsController";

if (
  thisBot.masks.isExpanded &&
  !thisBot.masks.isDeselecting &&
  !thisBot.masks.isSelecting
)
  updateIndicators(thisBot);
