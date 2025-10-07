if (thisBot.tags.isBaseLayoutBook || !thisBot.tags.isInUse) return;

const dimension = os.getCurrentDimension();
const { tags: changedTags } = that;
const setX =
  changedTags.includes(dimension + "X") || changedTags.includes("scaleX");
const setY =
  changedTags.includes(dimension + "Y") || changedTags.includes("scaleY");
const setZ =
  changedTags.includes(dimension + "Z") || changedTags.includes("scaleZ");

if (setX || setY || setZ)
  BibleVizUtils.Functions.SetUsersColorPositionOnElement({ piece: thisBot });
