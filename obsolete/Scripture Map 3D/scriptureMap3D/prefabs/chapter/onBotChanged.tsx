const dimension = os.getCurrentDimension();
if (thisBot.tags.isBaseLayoutChapter || !thisBot.tags.isInUse) return;

const { tags: changedTags } = that;
const setX =
  changedTags.includes(dimension + "X") || changedTags.includes("scaleX");
const setY =
  changedTags.includes(dimension + "Y") || changedTags.includes("scaleY");
const setZ =
  changedTags.includes(dimension + "Z") || changedTags.includes("scaleZ");
const currentUsersNotification = getBot(
  byTag("ownerBotId", getID(thisBot)),
  byTag("isUsersNotification", true),
  byTag("isInUse", true)
);

if (setX || setY || setZ) {
  if (currentUsersNotification)
    currentUsersNotification.SetPosition({ setX, setY, setZ });
  thisBot.TrySetUsersColorPosition();
}
