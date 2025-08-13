if(!thisBot.masks.color) setTagMask(thisBot, "color", thisBot.tags.color)
if(!thisBot.masks.strokeColor) setTagMask(thisBot, "strokeColor", thisBot.tags.strokeColor)
let startingColorHex = thisBot.masks.color;
const startingColorRgb = HexToRgb(startingColorHex);
const targetColorRgb = HexToRgb("#DCF0EC");
const targetStrokeColorRgb = HexToRgb("#139981");
const blinkDuration = 0.25

try
{
    await Promise.all([
        LerpColorManager.LerpTagColor({
            startingColor: startingColorRgb, 
            endingColor: targetColorRgb, 
            durationInSeconds: blinkDuration, 
            bot: thisBot,  
            tag: InterpolatableColorTags.Color
        }),
        LerpColorManager.LerpTagColor({
            startingColor: startingColorRgb, 
            endingColor: targetStrokeColorRgb, 
            durationInSeconds: blinkDuration, 
            bot: thisBot,  
            tag: InterpolatableColorTags.StrokeColor
        })
    ]).then(() => {
        return Promise.all([
            LerpColorManager.LerpTagColor({
                startingColor: targetColorRgb, 
                endingColor: startingColorRgb, 
                durationInSeconds: blinkDuration, 
                bot: thisBot,  
                tag: InterpolatableColorTags.Color
            }),
            LerpColorManager.LerpTagColor({
                startingColor: targetStrokeColorRgb, 
                endingColor: startingColorRgb, 
                durationInSeconds: blinkDuration, 
                bot: thisBot,  
                tag: InterpolatableColorTags.StrokeColor
            })
        ]).then(() => {
            return Promise.all([
                LerpColorManager.LerpTagColor({
                    startingColor: startingColorRgb, 
                    endingColor: targetColorRgb, 
                    durationInSeconds: blinkDuration, 
                    bot: thisBot,  
                    tag: InterpolatableColorTags.Color
                }),
                LerpColorManager.LerpTagColor({
                    startingColor: startingColorRgb, 
                    endingColor: targetStrokeColorRgb, 
                    durationInSeconds: blinkDuration, 
                    bot: thisBot,  
                    tag: InterpolatableColorTags.StrokeColor
                })
            ])
        })
    })
}
catch(error){throw new Error(error)}
finally
{
    // setTagMask(thisBot, "color", "#DCF0EC");
}