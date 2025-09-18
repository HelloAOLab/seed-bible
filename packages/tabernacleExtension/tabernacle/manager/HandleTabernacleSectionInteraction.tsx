const {keys, type} = that;

const bots = keys.map((key) => {
    return getBot("system", `ext_tabernacle.${key}`)
}).filter((bot) => {
    return bot // && (bot.masks.state === MeshState.Shown || bot.masks.state === MeshState.Translucent)
});

if(bots.length > 0 && type !== "textHover") 
{
    const interactionId = uuid();
    setTagMask(thisBot, "lastInteractionId", interactionId);
    if(thisBot.masks.focusing)
    {
        await thisBot.StopFocus();
    }
    setTagMask(thisBot, "focusing", true);
    thisBot.vars.focusedBots = bots;
    Promise.allSettled(bots.map((bot) => {
        return thisBot.HighlightBot({bot, makeColorLerp: type === "textClick" || type === "itemClick", cameraFocus: bots.length === 1 && type === "textClick"});
    })).finally(() => {
        if(thisBot.masks.lastInteractionId === interactionId)
        {
            setTagMask(thisBot, "focusing", false);
            thisBot.vars.focusedBots = null;
        }
    })
}