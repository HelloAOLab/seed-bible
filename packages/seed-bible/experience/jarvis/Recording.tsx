let dimension = os.getCurrentDimension();
setTagMask(thisBot, 'color', thisBot.tags.recordingColorAO)
const resetAnimations = []

if(configBot.tags.miniMapPortal === "map_portal"){
    dimension = configBot.tags.miniMapPortal;
}
else if(configBot.tags.mapPortal === "houseChurch")
{
    dimension = configBot.tags.mapPortal;
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
setTagMask(thisBot, 'orientationMode', null);
setTagMask(thisBot, "scaleX", 1)
setTagMask(thisBot, "scaleX", 1)
setTagMask(thisBot, "scaleZ", 1);
setTagMask(thisBot, dimension + "Z", 0);

thisBot.vars.ringBots.forEach((bot) => {
    setTagMask(bot, 'color', thisBot.tags.recordingColorRingBots)
    bot.StopAnimations();
    resetAnimations.push(bot.Reset({dimension}))
})

await Promise.all(resetAnimations).then(() => {MakeWave()});

function MakeWave() {
    const randomTimeRange = 75;
    const randomTime = 100 + (Math.random() * randomTimeRange);
    const centralRingBotIndex = Math.floor(Math.random() * thisBot.vars.ringBots.length)
    const deltaScaleZRange = 0.3
    const minScaleZ = 0.1;
    const randomDeltaScaleZ = minScaleZ + (Math.random() * deltaScaleZRange);
    const randomDuration = 1.5 + (Math.random() * 0.5)
    const maxWaveSize = 4;
    const waveSize = Math.floor(2 + (Math.random() * maxWaveSize))
    const randomRingBots = [thisBot.vars.ringBots[centralRingBotIndex]]
    for(let i = 1; i <= waveSize; i++)
    {
        let positiveIndex = centralRingBotIndex + i;
        let negativeIndex = centralRingBotIndex - i;
        if(positiveIndex >= thisBot.vars.ringBots.length) positiveIndex -= thisBot.vars.ringBots.length;
        if(negativeIndex < 0) negativeIndex += thisBot.vars.ringBots.length;
        randomRingBots.unshift(thisBot.vars.ringBots[negativeIndex])
        randomRingBots.push(thisBot.vars.ringBots[positiveIndex])
    }
    for (let i = 0; i < randomRingBots.length; i++)
    {
        const x = (Math.PI * i) / (randomRingBots.length - 1);
        const fixedDeltaScaleZ = randomDeltaScaleZ * Math.sin(x);
        randomRingBots[i].Recording({dimension, deltaScaleZ: fixedDeltaScaleZ, duration: randomDuration});
    }

    thisBot.masks.timeout = setTimeout(() => {
        MakeWave();
    }, randomTime);
}