/**
    * Handles changes to the testament bot, updating the position of its label transformers.
    * Only runs if the bot is in use and is not a base testament.
    * 
    * @param {object} that - Object containing important data for the function
    * @param {boolean} [that.force] - Forces the position to update regardless of the tags
    * @param {Array<string>} that.tags - List of tags that might trigger a position update
    * 
    * @example
    * testament.onBotChanged({tags: ["homeX", "homeY"]})
*/

if(thisBot.tags.isBaseStackTestament || !thisBot.tags.isInUse) return;

const {force, tags} = that;
const dimension = os.getCurrentDimension();

const setX = force ?? (tags.includes(dimension + "X") || tags.includes("scaleX"));
const setY = force ?? (tags.includes(dimension + "Y") || tags.includes("scaleY"));
const setZ = force ?? (tags.includes(dimension + "Z") || tags.includes("scaleZ"));
const currentLabelTransformers = getBots(byTag("ownerBotId", getID(thisBot)), byTag("isInfoLabelTransformer", true), byTag(dimension, true));
const currentUsersNotification = getBot(byTag("ownerBotId", getID(thisBot)), byTag("isUsersNotification", true), byTag("isInUse", true))

if(currentLabelTransformers.length > 0 && (setX || setY || setZ))
{
    whisper(currentLabelTransformers, "SetPosition", {setX, setY, setZ})
}
if(currentUsersNotification && (setX || setY || setZ))
{
    currentUsersNotification.SetPosition({setX, setY, setZ})
}