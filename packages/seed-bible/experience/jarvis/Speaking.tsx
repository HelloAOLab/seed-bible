let dimension = os.getCurrentDimension();
const expandDuration = 0.45;
const resetAnimations = []
if(configBot.tags.miniMapPortal === "map_portal"){
    dimension = configBot.tags.miniMapPortal;
}
else if(configBot.tags.mapPortal === "houseChurch")
{
    dimension = configBot.tags.mapPortal;
}
else
{
    setTagMask(thisBot, 'orientationMode', 'billboardFront');
}
clearAnimations(thisBot);
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
setTagMask(thisBot, 'color', thisBot.tags.idleColorAO)
setTagMask(thisBot, "scaleX", 1)
setTagMask(thisBot, "scaleX", 1)
setTagMask(thisBot, "scaleZ", 1);
setTagMask(thisBot, dimension + "Z", 0);
thisBot.vars.ringBots.forEach((bot) => {
    setTagMask(bot, 'color', thisBot.tags.idleColorRingBots)
    bot.StopAnimations();
    resetAnimations.push(bot.Reset({dimension, customPositionZ: bot.tags.initialPositionZ}))
})

let lastDeltaScaleZ = 0;
let lastWaveTime;
let lastWaveRandomTime;
await Promise.all(resetAnimations).then(() => {
    MakeWave();
    const duration = 5;
    const restOfTheRing = [...thisBot.vars.ringBots.slice(30, 34), ...thisBot.vars.ringBots.slice(0, 22)]
    restOfTheRing.forEach((bot, index) => {
        const half = Math.floor(restOfTheRing.length/2);
        const range = 0.01 * (index < half ? index : (restOfTheRing.length - 1 - index));
        const durationFraction = duration / restOfTheRing.length;
        const timoutTime = (index * durationFraction * 1000);
        bot.masks.timeout = setTimeout(() => {bot.Idle({dimension, duration, range})}, timoutTime)
    })
});

function MakeWave() {
    const deltaScaleZRange = 0.5
    const randomTimeRange = 125;
    const randomTime = (Math.random() * randomTimeRange);
    lastWaveRandomTime = randomTime;
    const randomDeltaScaleZ = (Math.random() * deltaScaleZRange);
    const normalizedDeltaScaleZ = 1 - (deltaScaleZRange - randomDeltaScaleZ)
    if(randomDeltaScaleZ > lastDeltaScaleZ || !lastWaveTime || (os.localTime > (lastWaveRandomTime + lastWaveTime)))
    {
        lastDeltaScaleZ = randomDeltaScaleZ;
        lastWaveTime = os.localTime;
        const randomDuration = 0.15 + (Math.random() * 0.3)
        const waveBots = thisBot.vars.ringBots.slice(22, 30)
        waveBots.forEach((bot, i) => {
            const x = (Math.PI * i) / (waveBots.length - 1);
            const fixedDeltaScaleZ = randomDeltaScaleZ * Math.sin(x);
            bot.Speaking({deltaScaleZ: fixedDeltaScaleZ, duration: randomDuration, dimension, normalizedDeltaScaleZ});
        })
    }

    thisBot.masks.timeout = setTimeout(() => {
        MakeWave();
    }, randomTime);
}