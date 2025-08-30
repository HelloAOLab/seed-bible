for(const bot of thisBot.vars.focusedBots)
{
    const cone = getBot(byTag("isCone", true), byTag("parentId", bot.id));
    await animateTag([cone], "formOpacity", null);
    LerpColorManager.StopLerp({bot, tag: InterpolatableColorTags.Color});
    setTagMask(bot, "color", "#ffffff");
    destroy([cone]);

    
    // const glow = getBot(byTag("isGlow", true), byTag("transformer", bot.id));
    // await animateTag([cone, glow], "formOpacity", null);
    // destroy([cone, glow]);
}

os.focusOn(null);
setTagMask(thisBot, "focusing", false);
thisBot.vars.focusedBots = null;

return;