const jarvisInstance = getBot("jarvis", true);

if(jarvisInstance && that.portal === "gridPortal"){
    console.log(that.dimension)
    jarvisInstance.masks[that.dimension] = true;
    jarvisInstance.vars.ringBots.forEach(ringBot => {
        ringBot.masks[that.dimension] = true;
    });
    await jarvisInstance.Spawn({positionInfo: {dimension: that.dimension, position: {x: 0, y: 0}}});
}