let dimension = os.getCurrentDimension();
const duration = 7.5;
const durationFraction = duration / thisBot.vars.ringBots.length;
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
setTagMask(thisBot, 'color', thisBot.tags.idleColorAO)
setTagMask(thisBot, "scaleX", 1)
setTagMask(thisBot, "scaleX", 1)
setTagMask(thisBot, "scaleZ", 1);
setTagMask(thisBot, dimension + "Z", 0);

thisBot.vars.ringBots.forEach((bot, index) => {
    const timoutTime = (index * durationFraction * 1000);
    const normalizedTime = timoutTime / 1000 / duration;
    const sineValue = Math.sin(2*Math.PI*normalizedTime );
    const range = 0.1;
    const customPositionZ = bot.tags.initialPositionZ + (range * sineValue);
    setTagMask(bot, 'color', thisBot.tags.idleColorRingBots)
    bot.StopAnimations();
    bot.Reset({dimension, customPositionZ}).then(() => {
        bot.Idle({dimension, duration, normalizedTime})
    })
})