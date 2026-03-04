/**
    * Handles updates to the bot by checking its tags and adjusting the position of any associated label transformers.
    * If the bot is a base section, no changes are made.
    * 
    * @param {object} that - Object containing important data for the function
    * @param {boolean} [that.force] - Forces the position to be updated regardless of tag checks
    * @param {Array<string>} that.tags - List of tags to check for determining whether the X, Y, or Z positions need to be updated
    * 
    * @example
    * section.onBotChanged({tags: ["homeX", "homeY"]})
*/

if(thisBot.tags.isBaseStackSection) return;

const {force, tags} = that;
const dimension = os.getCurrentDimension();
const currentLabelTransformers = getBots(byTag("ownerBotId", getID(thisBot)), byTag("isInfoLabelTransformer", true), byTag(dimension, true));
const currentActivityNotification = getBot(byTag("ownerBotId", getID(thisBot)), byTag("isActivityNotification", true), byTag("isInUse", true))
const setX = force ?? (tags.includes(dimension + "X") || tags.includes("scaleX"));
const setY = force ?? (tags.includes(dimension + "Y") || tags.includes("scaleY"));
const setZ = force ?? (tags.includes(dimension + "Z") || tags.includes("scaleZ"));


if(currentLabelTransformers.length > 0 && (setX || setY || setZ))
{
    whisper(currentLabelTransformers, "SetPosition", {setX, setY, setZ})
}
if(currentActivityNotification && (setX || setY || setZ))
{
    currentActivityNotification.SetPosition({setX, setY, setZ})
}