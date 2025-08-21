/**
    * Make a linear interpolation (lerp) on the value of a specific tag from the given start color to the given end color.
    * Available tags to be lerped: Defined on InterpolatableColorTags from interactiveBible.managers.InstanceManager.defineGlobals.
    * @param {Object} that - Object that contains important data for the function
    * @param {Array} that.startingColor - Array that contains the rgb values for the initial color
    * @param {Array} that.endingColor - Array that contains the rgb values for the final color
    * @param {number} that.durationInSeconds - The duration of the interpolation in seconds
    * @param {Object} that.bot - The bot which it's tag will be interpolated
    * @param {number} that.tag - The tag that will be interpolated
    * @example
    * LerpColorManager.LerpTag({startingColor: [50, 60, 70], endingColor: [255, 255, 200], durationInSeconds: 2, bot: thisBot,  tag: InterpolatableColorTags.strokeColor});
*/

import { ColorLerpData } from "ColorLerper.main..ColorLerpData";
let {
    startingColor, 
} = that;
const {
    endingColor, 
    durationInSeconds, 
    bot, 
    tag
} = that;
startingColor = startingColor ?? BibleVizUtils.Functions.HexToRgb({hexColor: bot.masks[tag] ?? bot.tags[tag]});
thisBot.StopColorLerp({bot, tag});
if(startingColor === endingColor) return true;

return new Promise((resolve, reject) => {
    const divisionFactor = 20;
    const difference = [endingColor[0] - startingColor[0], endingColor[1] - startingColor[1], endingColor[2] - startingColor[2]];
    const differenceFraction = [difference[0] / divisionFactor, difference[1] / divisionFactor, difference[2] / divisionFactor];

    const currentColor = startingColor;
    let i = 0;
    const rgbColors = [];
    for(let j = 1; j < divisionFactor; j++)
    {
        const rgbColor = ClampRGBColor([(currentColor[0] + (differenceFraction[0] * j)), (currentColor[1] + (differenceFraction[1] * j)), (currentColor[2] + (differenceFraction[2] * j))])
        rgbColors.push(rgbColor);
    }
    const intervalId = setInterval(() => {
        const hexColor = BibleVizUtils.Functions.RgbToHex({rgbColor: rgbColors[i]});
        setTagMask(bot, tag, hexColor);
        i++;

        if (i >= divisionFactor) {
            setTagMask(bot, tag, BibleVizUtils.Functions.RgbToHex({rgbColor: ClampRGBColor(endingColor)}));
            currentLerps.ClearColorLerpData(botLerpData)
            clearInterval(botLerpData.lerpIntervalId);
            resolve(`color lerp resolve`);
        }
    }, (durationInSeconds * 1000 / divisionFactor));

    const botLerpData = new ColorLerpData({botId: getID(bot), tag, lerpIntervalId: intervalId, reject})
    currentLerps.AddColorLerpData(botLerpData);
});

function ClampRGBColor(colorToClamp)
{
    const colorClamped = [
        Math.max(Math.min(Math.round(colorToClamp[0]), 255), 0),
        Math.max(Math.min(Math.round(colorToClamp[1]), 255), 0),
        Math.max(Math.min(Math.round(colorToClamp[2]), 255), 0)
    ]
    return colorClamped;
}