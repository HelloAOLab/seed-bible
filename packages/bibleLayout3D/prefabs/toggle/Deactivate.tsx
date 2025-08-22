const dimension = os.getCurrentDimension();
const backgroundCurrentColor = HexToRgb(links.background.masks.color ?? links.background.tags.color);


const duration = 0.125;

thisBot.StopToggleAnimation();
LerpColorManager.LerpTagColor({
    startingColor: backgroundCurrentColor,
    endingColor: HexToRgb(thisBot.tags.backgroundInactiveColor),
    durationInSeconds: duration,
    bot: links.background,
    tag: InterpolatableColorTags.Color
});
animateTag(links.handle, dimension + "X", {
    toValue: (links.background.tags[dimension + "X"] - (links.background.tags.scaleX / 2) + (links.handle.tags.scaleX / 2) + ((links.background.tags.scaleY - links.handle.tags.scaleY) / 2)),
    duration,
    easing: { type: "sinusoidal", mode: "inout" }
})
thisBot.AditionalDeactivateFunction?.();