const {setX, setY, setZ} = that;

const dimension = os.getCurrentDimension();
const ownerBot = getBot(byID(thisBot.tags.ownerBotId));
const transformer = ownerBot.tags.transformer ? getBot(byID(ownerBot.tags.transformer)) : null;
// const usersNotificationScales = GetBotScales(thisBot);
const ownerBotPosition = getBotPosition(ownerBot, dimension);
const ownerBotScales = GetBotScales(ownerBot);
const transformerOffset = 1;
const notificationOffset = 0.15
const transformerPosition = transformer ? getBotPosition(transformer, dimension).add(new Vector3(0, 0, transformerOffset)) : new Vector3(0, 0, 0);
const usersNotificationDesiredPosition = new Vector3(
    ownerBotPosition.x + (ownerBotScales.x/2) + notificationOffset, 
    ownerBotPosition.y - (ownerBotScales.y/2) - notificationOffset, 
    ownerBotPosition.z + ownerBotScales.z + notificationOffset
).add(transformerPosition);

if(setX) setTagMask(thisBot, dimension + "X", usersNotificationDesiredPosition.x);
if(setY) setTagMask(thisBot, dimension + "Y", usersNotificationDesiredPosition.y);
if(setZ) setTagMask(thisBot, dimension + "Z", usersNotificationDesiredPosition.z);