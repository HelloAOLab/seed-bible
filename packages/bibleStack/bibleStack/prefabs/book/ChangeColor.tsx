/**
    * Changes the color of the book based on whether it should be grayscale or not, with an optional blinking effect.
    * @param {Object} that - Contextual object containing parameters for the color change.
    * @param {boolean} that.grayScaleColor - Indicates whether to apply a grayscale color.
    * @param {boolean} [that.blinkSelf] - Determines if the book should blink during the color change.
    * @returns {Promise<void>} - Resolves once the color change and any blinking effect is complete.
    * @example
    * book.ChangeColor({grayScaleColor: true, blinkSelf: true});
*/

if(!thisBot.tags.color) return;

const {grayScaleColor} = that;

const blinkSelf = that.blinkSelf;

setTagMask(thisBot,"isGrayScaled",grayScaleColor);

const gray = thisBot.tags.grayScaleColor;
const originalColor = thisBot.tags.orginalColor;

const colorNew = grayScaleColor ? gray : originalColor;

await os.sleep(50);

setTagMask(thisBot,"color",colorNew);

if (blinkSelf && grayScaleColor) {
    for (let i = 0; i < 3; i++) {
        thisBot.tryToHighlightSelf({});
        setTagMask(thisBot,"color",originalColor);
        await os.sleep(400);
        setTagMask(thisBot,"color",gray);
        await os.sleep(400);
        thisBot.Unhighlight({});
    }
}