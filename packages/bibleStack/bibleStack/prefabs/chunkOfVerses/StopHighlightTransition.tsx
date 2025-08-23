/**
    * Stops the highlight transition for the chunk of verses, resetting color lerp and scale.
    * @example
    * chunkOfVerses.StopHighlightTransition();
*/

ColorLerper.StopColorLerp({bot: thisBot,  tag: BibleVizUtils.Data.tags.InterpolatableColorTags.Color});
animateTag(thisBot, 'scaleZ', null);