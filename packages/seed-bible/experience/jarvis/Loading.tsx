let dimension = os.getCurrentDimension();
const duration = 2;
const expandDuration = 0.45;
const durationFraction = duration / thisBot.vars.ringBots.length;
let customPositionZ = -1;
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
setTagMask(thisBot, 'color', thisBot.tags.loadingColorAO)
thisBot.vars.ringBots.forEach((bot, index) => {
    setTagMask(bot, 'color', thisBot.tags.loadingColorRingBots)
    bot.StopAnimations();
    bot.Reset({dimension, customPositionZ}).then(() => {
        bot.masks.timeout = setTimeout(() => {
            bot.masks.timeout = null;
            bot.Loading({dimension, duration, expandDuration});
        }, (index * durationFraction * 1000));
    })
})