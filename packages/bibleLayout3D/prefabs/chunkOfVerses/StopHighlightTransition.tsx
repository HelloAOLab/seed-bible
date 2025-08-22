/**
    * Stops the highlight transition for the chunk of verses, resetting color lerp and scale.
    * @example
    * chunkOfVerses.StopHighlightTransition();
*/

LerpColorManager.StopColorLerp({bot: thisBot,  tag: InterpolatableColorTags.Color});
animateTag(thisBot, 'scaleZ', null);