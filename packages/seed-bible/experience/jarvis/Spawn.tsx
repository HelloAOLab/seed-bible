const {positionInfo} = that ?? {};
let dimension = os.getCurrentDimension();
const duration = 1;
const anglePerBot = Math.PI*2/thisBot.vars.ringBots.length;
const firstVectorLength = 1;
const secondVectorLength = 0.55;
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
setTag(thisBot, dimension, true)
setTagMask(thisBot, 'scaleX', 0);
setTagMask(thisBot, 'scaleY', 0);
setTagMask(thisBot, 'scaleZ', 0);
setTagMask(thisBot, 'orientationMode', null);
setTagMask(thisBot, 'color', thisBot.tags.idleColorAO)
if(positionInfo)
{
    setTagMask(thisBot, positionInfo.dimension + "X", positionInfo.position.x)
    setTagMask(thisBot, positionInfo.dimension + "Y", positionInfo.position.y)
}
const firstSequenceAnimations = [
    animateTag(thisBot, {
        fromValue: {scaleX: 0, scaleY: 0, scaleZ: 0, [dimension + "Z"]: 0},
        toValue: {scaleX: 1, scaleY: 1, scaleZ: 1, [dimension + "Z"]: 0.5},
        duration: 0.75,
        easing: {type: "cubic", mode: "out"}
    })
    .catch((error) => {
        setTagMask(thisBot, 'scaleX', 1)
        setTagMask(thisBot, 'scaleY', 1)
    })
]
thisBot.vars.ringBots.forEach((bot, index) => {
    const angle = index * anglePerBot;
    const vector = new Vector2(firstVectorLength * Math.cos(angle), firstVectorLength * Math.sin(angle));
    setTagMask(bot, 'color', thisBot.tags.idleColorRingBots)
    bot.StopAnimations();
    firstSequenceAnimations.push(
        bot.Reset({dimension, duration: 0}).then(() => {
            return animateTag(bot, {
                fromValue: {[dimension + "X"]: 0, [dimension + "Y"]: 0},
                toValue: {[dimension + "X"]: vector.x, [dimension + "Y"]: vector.y},
                duration: 0.75,
                easing: {type: "cubic", mode: "out"}
            })
        })
    )
})

return Promise.all(firstSequenceAnimations)
.then(() => {
    const secondSequenceAnimations = [
        animateTag(thisBot, {
            fromValue: {[dimension + "Z"]: 0.5, [dimension + 'RotationZ']: 0},
            toValue: {[dimension + "Z"]: 0, [dimension + 'RotationZ']: Math.PI*2},
            duration: 1.5,
            easing: {type: "cubic", mode: "out"}
        }),
        ...thisBot.vars.ringBots.map((bot, index) => {
            return animateTag(bot, {
                fromValue: {[dimension + "X"]: (bot.masks[dimension + 'X'] ?? bot.tags[dimension + 'X']), [dimension + "Y"]: (bot.masks[dimension + 'Y'] ?? bot.tags[dimension + 'Y'])},
                toValue: {[dimension + "X"]: secondVectorLength * Math.cos(index * anglePerBot), [dimension + "Y"]: secondVectorLength * Math.sin(index * anglePerBot)},
                duration: 1.5,
                easing: {type: "cubic", mode: "out"}
            })
        })
    ]
    return Promise.all(secondSequenceAnimations)
})
.then(() => {
    setTagMask(thisBot, dimension + "RotationZ", 0);
    thisBot.Idle();
})