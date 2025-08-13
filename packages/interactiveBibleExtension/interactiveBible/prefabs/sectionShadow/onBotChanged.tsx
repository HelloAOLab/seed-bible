/**
    * Updates the position and label offset of the label transformer when the section shadow bot changes.
    * No action is taken if the bot is a base section shadow or is not in use.
    * 
    * @param {object} that - Object containing important data for the function
    * @param {boolean} [that.force] - Forces the position and label offset to be updated regardless of tag checks
    * @param {Array<string>} that.tags - List of tags to check for determining whether the X, Y, Z positions or label offset need to be updated
    * 
    * @example
    * sectionShadow.onBotChanged({tags: ["homeX", "homeY", "scaleX"]})
*/

if(thisBot.tags.isBaseSectionShadow || !thisBot.tags.isInUse) return;

const {force, tags} = that;

const dimension = os.getCurrentDimension();
const setX = force ?? tags.includes(dimension + "X");
const setY = force ?? tags.includes(dimension + "Y");
const setZ = force ?? tags.includes(dimension + "Z");
const setLabelOffset = force ?? (that.tags.includes("scaleX") || that.tags.includes("scaleY"));

const currentLabelTransformer = getBot(byTag("ownerBotId", getID(thisBot)), byTag("isInfoLabelTransformer", true), byTag("isInUse", true));
if(currentLabelTransformer && (setX || setY || setZ || setLabelOffset))
{
    currentLabelTransformer.SetPosition({setX, setY, setZ, setLabelOffset})
}