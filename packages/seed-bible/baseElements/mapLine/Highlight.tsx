if(!thisBot.masks.color) setTagMask(thisBot, "color", thisBot.tags.color)
let startingColorHex = thisBot.tags.initialColor;
const startingColorRgb = HexToRgb(startingColorHex);
const targetColorRgb = HexToRgb("#139981");
const blinkDuration = 0.25

try
{
    await LerpColorManager.LerpTagColor({
        startingColor: startingColorRgb, 
        endingColor: targetColorRgb, 
        durationInSeconds: blinkDuration, 
        bot: thisBot,  
        tag: InterpolatableColorTags.Color
    }).then(() => {
        return LerpColorManager.LerpTagColor({
            startingColor: targetColorRgb, 
            endingColor: startingColorRgb, 
            durationInSeconds: blinkDuration, 
            bot: thisBot,  
            tag: InterpolatableColorTags.Color
        })
    })
}
catch(error){throw new Error(error)}
finally
{
    setTagMask(thisBot, "color", thisBot.tags.initialColor);
}