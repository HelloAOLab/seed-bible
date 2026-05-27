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

const {force, tags: changedTags} = that;
if(thisBot.tags.isBaseStackTestament || !thisBot.tags.isInUse) return;

const dimension = os.getCurrentDimension();
const setX = force ?? (changedTags.includes(dimension + "X") || changedTags.includes("scaleX"));
const setY = force ?? (changedTags.includes(dimension + "Y") || changedTags.includes("scaleY"));
const setZ = force ?? (changedTags.includes(dimension + "Z") || changedTags.includes("scaleZ"));
const currentLabelTransformers = getBots(byTag("ownerBotId", getID(thisBot)), byTag("isInfoLabelTransformer", true), byTag(dimension, true));
const currentActivityNotification = getBot(byTag("ownerBotId", getID(thisBot)), byTag("isActivityNotification", true), byTag("isInUse", true))

if(currentLabelTransformers.length > 0 && (setX || setY || setZ))
{
    whisper(currentLabelTransformers, "SetPosition", {setX, setY, setZ})
}
if(currentActivityNotification && (setX || setY || setZ))
{
    currentActivityNotification.SetPosition({setX, setY, setZ})
}
