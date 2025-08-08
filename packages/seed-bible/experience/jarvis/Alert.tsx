let dimension = os.getCurrentDimension();
const duration = 0.2;
clearAnimations(thisBot);
if(configBot.tags.miniMapPortal === "map_portal"){
    dimension = configBot.tags.miniMapPortal;
}
else if(configBot.tags.mapPortal === "houseChurch")
{
    dimension = configBot.tags.mapPortal;
}
if(thisBot.masks.timeout)
{
    clearTimeout(thisBot.masks.timeout);
    thisBot.masks.timeout = null;
}
if(thisBot.masks.interval)
{
    clearInterval(thisBot.masks.interval);
    thisBot.masks.interval = null;
}
if(links.exclamationMarkLine)
{
    clearAnimations(links.exclamationMarkLine)
    destroy(links.exclamationMarkLine)
    thisBot.tags.exclamationMarkLine = null;
}
setTagMask(thisBot, 'orientationMode', null);
setTagMask(thisBot, "scaleX", 1)
setTagMask(thisBot, "scaleX", 1)
setTagMask(thisBot, "scaleZ", 1);
setTagMask(thisBot, dimension + "Z", 0);
setTagMask(thisBot, 'color', thisBot.tags.alertColor)
thisBot.vars.ringBots.forEach((bot) => {
    bot.StopAnimations();
    bot.Reset({dimension, radius: 0, duration: 0});
})
const aoPosition = getBotPosition(thisBot, dimension);

const exclamationMarkLine = create({
    space: "tempLocal",
    [dimension]: true,
    [dimension + "X"]: 0,
    [dimension + "Y"]: 0,
    [dimension + "Z"]: 0.5,
    scale: 0.1,
    scaleX: 0.8,
    scaleY: 0.8,
    scaleZ: 2,
    pointable: false,
    color: thisBot.tags.alertColor,
    transformer: thisBot.id,
    form: "mesh",
    formSubtype: "gltf",
    formAddress: thisBot.tags.exclamationMarkLineUrl
})
thisBot.tags.exclamationMarkLine = "🔗" + exclamationMarkLine.id

return animateTag(exclamationMarkLine, "scale", {
    toValue: 1,
    duration,
    easing: {type: "sinusoidal", mode: "out"}
}).then(() => {
    return animateTag(exclamationMarkLine, "scale", {
        toValue: 0,
        duration,
        startTime: os.localTime + (duration*1000*2),
        easing: {type: "sinusoidal", mode: "in"}
    })
})
.finally(() => {
    if(links.exclamationMarkLine)
    {
        destroy(links.exclamationMarkLine)
        thisBot.tags.exclamationMarkLine = null;
    }
})