if(globalThis.hideSeekPlaying) return;
globalThis.LERP_YT_TIMEOUT = setTimeout(async ()=>{
    globalThis.CLEARABLE_LERPING = true;
    const colorLerpDuration = 1.2;
    await LerpColorManager.LerpTagColor({startingColor: HexToRgb(thisBot.masks.color ?? thisBot.tags.color), endingColor: [255, 255, 255], durationInSeconds: colorLerpDuration, bot: thisBot, tag: InterpolatableColorTags.Color});
},300)