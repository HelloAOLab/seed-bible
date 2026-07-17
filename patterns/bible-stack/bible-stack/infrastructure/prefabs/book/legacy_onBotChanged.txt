import type { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import type { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";
import { BookShapes } from "bibleVizUtils.models.canvas";
/**
 * Handles changes to the bot, updating positions of info label transformers and chapters if applicable.
 * @param {object} that - Object that contains important data for the function.
 * @param {boolean} [force] - Optional flag to override position settings.
 * @param {Array<string>} [tags] - Tags determining position settings.
 * @example
 * book.onBotChanged();
 */

const dimension = os.getCurrentDimension();
if (thisBot.tags.isBaseStackBook || !thisBot.tags.isInUse) return;

const { force, tags } = that;
const data = await (BibleStackManager.GetPieceData({
  piece: thisBot,
}) as Promise<StackBookData | StackSectionBookData | undefined>);

if (!data) {
  throw new Error("onBotChanged: data not found.");
}

const setX =
  force ?? (tags.includes(dimension + "X") || tags.includes("scaleX"));
const setY =
  force ?? (tags.includes(dimension + "Y") || tags.includes("scaleY"));
const setZ =
  force ?? (tags.includes(dimension + "Z") || tags.includes("scaleZ"));
const isBookSelected = data.isSelected;
const currentLabelTransformers = getBots(
  byTag("ownerBotId", getID(thisBot)),
  byTag("isInfoLabelTransformer", true),
  byTag("isInUse", true)
);
const currentActivityNotification = getBot(
  byTag("ownerBotId", getID(thisBot)),
  byTag("isActivityNotification", true),
  byTag("isInUse", true)
);

if (currentLabelTransformers.length > 0 && (setX || setY || setZ)) {
  whisper(currentLabelTransformers, "SetPosition", { setX, setY, setZ });
}
if (isBookSelected) {
  if (
    data.currentShape === BookShapes.Selected &&
    (setX || setY || setZ) &&
    thisBot.masks.isShowingChapters
  ) {
    thisBot.TrySetChaptersPosition({ setX, setY, setZ });
  }
}
if (currentActivityNotification && (setX || setY || setZ)) {
  currentActivityNotification.SetPosition({ setX, setY, setZ });
}
