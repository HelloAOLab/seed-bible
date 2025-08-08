/**
    * Handles changes to the Bible transformer bot, updating associated label transformer's position if necessary.
    * @param {Object} that - The context containing properties related to the bot state.
    * @example
    * bibleTransformer.onBotChanged({tags: ["dimensionX", "dimensionY"]});
*/

if(thisBot.tags.isBaseBibleTransformer || !thisBot.tags.isInUse) return;

const dimension = os.getCurrentDimension();
const currentLabelTransformers = getBots(byTag("ownerBotId", getID(thisBot)), byTag("isInfoLabelTransformer", true), byTag('isInUse', true));

if(currentLabelTransformers.length > 0)
{
    if(that.tags.includes(dimension + "X") || that.tags.includes(dimension + "Y") || that.tags.includes(dimension + "Z"))
    {
        whisper(currentLabelTransformers, "SetPosition", {setX: that.tags.includes(dimension + "X"), setY: that.tags.includes(dimension + "Y"), setZ: that.tags.includes(dimension + "Z")})
    }
}