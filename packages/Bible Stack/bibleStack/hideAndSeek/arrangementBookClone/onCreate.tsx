const dimension = os.getCurrentDimension();

setTagMask(gridPortalBot, "portalPannable", false);
setTagMask(gridPortalBot, "portalZoomable", false);
setTagMask(gridPortalBot, "portalRotatable", false);

os.focusOn({x: thisBot.tags[dimension + "X"] + 4 + thisBot.tags.xOffSet, 
        y: thisBot.tags[dimension + "Y"] + thisBot.tags.yOffSet, 
        z: thisBot.tags[dimension + "Z"] + thisBot.tags.zOffSet}, 
        {
                duration: 0.5,
                easing: {type: "sinusoidal", mode: "inout"},
                rotation: {x: 1.01229, y:0.5},
                zoom: 8
        }
);

const otherBotsToUnhighlight = getBots("forceUnhighlight").filter((bot) => {
return !bot.masks.isOnTheGround        && 
    !bot.masks.isForcingUnhighlight && 
    bot.tags.isArrangementBook
});
            
otherBotsToUnhighlight && whisper(otherBotsToUnhighlight, "forceUnhighlight");



if(thisBot.tags.initialized){
        const spotLight1 = create({
                [dimension]: true,
                [dimension + "X"]: thisBot.tags[dimension + "X"],
                [dimension + "Y"]: thisBot.tags[dimension + "Y"],
                [dimension + "Z"]: thisBot.tags[dimension + "Z"] ,
                formLightTarget: thisBot.id,
                formLightAngle: Math.PI / 2,
                space: "tempLocal",
                formLightIntensity: 3,
                formLightDistance: 8,
                color: "#FFD700",
                form: "light",
                formSubtype: "spotLight",
                formLightPenumbra: 0.8
        })

        const spotLight2 = create({
                [dimension]: true,
                [dimension + "X"]: thisBot.tags[dimension + "X"],
                [dimension + "Y"]: thisBot.tags[dimension + "Y"],
                [dimension + "Z"]: thisBot.tags[dimension + "Z"] - 2,
                formLightTarget: thisBot.id,
                formLightAngle: -1 * Math.PI / 2,
                space: "tempLocal",
                formLightIntensity: 3,
                formLightDistance: 8,
                color: "#FFD700",
                form: "light",
                formSubtype: "spotLight",
                formLightPenumbra: 0.8
        })
        
        setTag(thisBot,"attachedSpotLight",[spotLight1.id, spotLight2.id]);
}
