globalThis.LERP_YT_TIMEOUT = setTimeout(async ()=>{
    globalThis.CLEARABLE_LERPING = true;
    const colorLerpDuration = 1.2;
    await ColorLerper.LerpTag({startingColor: BibleVizUtils.Functions.HexToRgb({hexColor: thisBot.masks.color ?? thisBot.tags.color}), endingColor: [255, 255, 255], durationInSeconds: colorLerpDuration, bot: thisBot, tag: BibleVizUtils.Data.tags.InterpolatableColorTags.Color});
},300)