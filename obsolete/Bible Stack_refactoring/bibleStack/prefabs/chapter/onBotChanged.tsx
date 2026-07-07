const dimension = os.getCurrentDimension();
if (thisBot.tags.isBaseStackChapter || !thisBot.tags.isInUse) return;

const { tags: changedTags } = that;
const setX =
  changedTags.includes(dimension + "X") || changedTags.includes("scaleX");
const setY =
  changedTags.includes(dimension + "Y") || changedTags.includes("scaleY");
const setZ =
  changedTags.includes(dimension + "Z") || changedTags.includes("scaleZ");
const currentActivityNotification = getBot(
  byTag("ownerBotId", getID(thisBot)),
  byTag("isActivityNotification", true),
  byTag("isInUse", true)
);

if (setX || setY || setZ) {
  if (currentActivityNotification)
    currentActivityNotification.SetPosition({ setX, setY, setZ });
  thisBot.TrySetUsersColorPosition();
}
