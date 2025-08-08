if(thisBot.masks.initialized) return;
setTagMask(thisBot, "initialized", true);

if(typeof VFXManager === "undefined")
{
    globalThis.VFXManager = thisBot;
}

thisBot.vars.particleVfxIntervals = [];