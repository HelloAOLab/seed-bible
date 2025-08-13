const dimension = os.getCurrentDimension();

const backgroundCurrentColor = HexToRgb(links.background.masks.color ?? links.background.tags.color);

const duration = 0.125;
thisBot.StopToggleAnimation();


const MM = getBot("#system", "interactiveBible.managers.MapsManager")
const mapData = MM.GetMapDataById({ mapId: thisBot.tags.mapId })


LerpColorManager.LerpTagColor({
    startingColor: backgroundCurrentColor,
    endingColor: HexToRgb(thisBot.tags.backgroundActiveColor),
    durationInSeconds: duration,
    bot: links.background,
    tag: InterpolatableColorTags.Color
});


if (this.tags.toggleSize == 2) {
    animateTag(links.handle, dimension + "X", {
        toValue: (links.background.tags[dimension + "X"] + (links.background.tags.scaleX / 2) - (links.handle.tags.scaleX / 2) - ((links.background.tags.scaleY - links.handle.tags.scaleY) / 2)),
        duration,
        easing: { type: "sinusoidal", mode: "inout" }
    })

} else if (this.tags.toggleSize == 3) {

    if (mapData.isDatesEnabled == 3) {
        animateTag(links.handle, dimension + "X", {
            toValue: (links.background.tags[dimension + "X"] + (links.background.tags.scaleX / 2) - (links.handle.tags.scaleX / 2) - ((links.background.tags.scaleY - links.handle.tags.scaleY) / 2)),
            duration,
            easing: { type: "sinusoidal", mode: "inout" }
        })


        LerpColorManager.LerpTagColor({
            startingColor: backgroundCurrentColor,
            endingColor: HexToRgb("#0DA0FC"),
            durationInSeconds: duration,
            bot: links.background,
            tag: InterpolatableColorTags.Color
        });


    } else if (mapData.isDatesEnabled == 2) {
        animateTag(links.handle, dimension + "X", {
            toValue: (links.background.tags[dimension + "X"] + (links.background.tags.scaleX / 2) - (links.handle.tags.scaleX / 2) - ((links.background.tags.scaleY - links.handle.tags.scaleY) / 2)) - 0.7,
            duration,
            easing: { type: "sinusoidal", mode: "inout" }
        })

    }


}

thisBot.AditionalActivateFunction?.();