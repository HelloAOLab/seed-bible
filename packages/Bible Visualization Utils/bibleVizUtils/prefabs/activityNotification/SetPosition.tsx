const { setX, setY, setZ } = that;

const dimension = os.getCurrentDimension();
const ownerBot = getBot(byID(thisBot.tags.ownerBotId));
const transformer = ownerBot.tags.transformer
  ? getBot(byID(ownerBot.tags.transformer))
  : null;
// const activityNotificationScales = BibleVizUtils.Functions.GetBotScales(thisBot);
const ownerBotPosition = getBotPosition(ownerBot, dimension);
const ownerBotScales = BibleVizUtils.Functions.GetBotScales(ownerBot);
const transformerOffset = 1;
const transformerPosition = transformer
  ? getBotPosition(transformer, dimension).add(
      new Vector3(0, 0, transformerOffset)
    )
  : new Vector3(0, 0, 0);
const activityNotificationDesiredPosition = new Vector3(
  ownerBotPosition.x +
    thisBot.tags.direction.x *
      (ownerBotScales.x / 2 + thisBot.tags.notificationOffset),
  ownerBotPosition.y +
    thisBot.tags.direction.y *
      (ownerBotScales.y / 2 + thisBot.tags.notificationOffset),
  ownerBotPosition.z + ownerBotScales.z + thisBot.tags.notificationOffset
).add(transformerPosition);

if (setX)
  setTagMask(thisBot, dimension + "X", activityNotificationDesiredPosition.x);
if (setY)
  setTagMask(thisBot, dimension + "Y", activityNotificationDesiredPosition.y);
if (setZ)
  setTagMask(thisBot, dimension + "Z", activityNotificationDesiredPosition.z);
