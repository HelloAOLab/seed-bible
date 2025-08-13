setTagMask(thisBot, "activated", true);
const duration = 0.25;
const rgbInitialColor = HexToRgb(thisBot.tags.offColor)
const rgbEndColor = HexToRgb(thisBot.tags.onColor)
animateTag(thisBot, "scale", {
    fromValue: 1,
    toValue: 1.1,
    duration: duration/1,
    easing: {type: "sinusoidal", mode: "inout"}
}).then(() => {
    animateTag(thisBot, "scale", {
        toValue: 1.,
        duration: duration/1,
        easing: {type: "sinusoidal", mode: "inout"}
    })
})
LerpColorManager.LerpTagColor({startingColor: rgbInitialColor, endingColor: rgbEndColor, durationInSeconds: duration, bot: thisBot,  tag: InterpolatableColorTags.Color});
LerpColorManager.LerpTagColor({startingColor: rgbInitialColor, endingColor: rgbEndColor, durationInSeconds: duration, bot: thisBot,  tag: InterpolatableColorTags.StrokeColor});
shout("OnCheckpointActivated", {checkpoint: thisBot});