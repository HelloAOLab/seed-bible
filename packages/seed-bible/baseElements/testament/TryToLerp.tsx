globalThis.LERP_YT_TIMEOUT = setTimeout(async ()=>{
    globalThis.CLEARABLE_LERPING = true;
    const colorLerpDuration = 1.2;
    await LerpColorManager.LerpTagColor({startingColor: HexToRgb("#ffffff"), endingColor: [135,206,235], durationInSeconds: colorLerpDuration, bot: thisBot, tag: InterpolatableColorTags.Color});
},300)