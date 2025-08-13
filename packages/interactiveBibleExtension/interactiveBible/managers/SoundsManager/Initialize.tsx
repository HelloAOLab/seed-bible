if(thisBot.masks.initialized) return;

setTagMask(thisBot, "initialized", true);

globalThis.SoundsManager = thisBot;
thisBot.BufferSounds();