let {worldPosition, offset = new Vector2(0, -4), scanningRadius = 1, scanningHeight = 1} = that ?? {}

let dimension = os.getCurrentDimension();
if(configBot.tags.miniMapPortal === "map_portal"){
    dimension = configBot.tags.miniMapPortal;
}
else if(configBot.tags.mapPortal === "houseChurch")
{
    dimension = configBot.tags.mapPortal;
}
const customPositionZ = -1;
const duration = 2;
const blinkTime = 35;
const halfOfRingBots = Math.floor(thisBot.vars.ringBots.length/2)
const resetAnimations = [];
let scanCircle;
if(worldPosition)
{
    const jarvisPosition = getBotPosition(thisBot, dimension);
    offset = worldPosition.subtract(jarvisPosition)
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
setTagMask(thisBot, 'color', thisBot.tags.scanningColorAO)
setTagMask(thisBot, "scaleX", 1)
setTagMask(thisBot, "scaleX", 1)
setTagMask(thisBot, "scaleZ", 1);
setTagMask(thisBot, dimension + "Z", 0);

thisBot.vars.ringBots.forEach((bot) => {
    setTagMask(bot, 'color', thisBot.tags.scanningColorRingBots)
    bot.StopAnimations();
    resetAnimations.push(bot.Reset({dimension, customPositionZ, offset, radius: scanningRadius}));
})

let i = 0;
let direction = 1;
await Promise.all(resetAnimations).then(() => {
    thisBot.masks.interval = setInterval(() => {
        const currentBots = [thisBot.vars.ringBots[i], thisBot.vars.ringBots[thisBot.vars.ringBots.length - 1 - i]]
        i += direction;
        if(i < 0 || i >= halfOfRingBots)
        {
            direction *= -1;
            i += (direction * 2)
        }
        const nextBots = [thisBot.vars.ringBots[i], thisBot.vars.ringBots[thisBot.vars.ringBots.length - 1 - i]];
        setTagMask(currentBots, "color", thisBot.tags.scanningColorRingBots);
        setTagMask(nextBots, "color", "white");
    }, blinkTime);
    scanCircle = create({
        space: "tempLocal",
        [dimension]: true,
        [dimension + "X"]: offset.x,
        [dimension + "Y"]: offset.y,
        [dimension + "Z"]: customPositionZ,
        scaleX: scanningRadius * 2,
        scaleY: scanningRadius * 2,
        scaleZ: 0,
        pointable: false,
        color: thisBot.tags.scanningColorAO,
        formOpacity: 0.5,
        transformer: thisBot.id,
        form: "circle"
    })
    return Scan(scanCircle, thisBot.vars.ringBots)
})
.finally(() => {
    if(scanCircle) destroy(scanCircle);
})

function Scan(scanCircle, ringBots)
{
    return animateTag([scanCircle, ...ringBots], dimension + "Z", {
        toValue: customPositionZ + scanningHeight,
        duration: duration/2,
        easing: {type: "sinusoidal", mode: "inout"}
    }).then(() => {
        return animateTag([scanCircle, ...ringBots], dimension + "Z", {
            toValue: customPositionZ,
            duration: duration/2,
            easing: {type: "sinusoidal", mode: "inout"}
        }).then(() => {return Scan(scanCircle, ringBots)})
    })
}