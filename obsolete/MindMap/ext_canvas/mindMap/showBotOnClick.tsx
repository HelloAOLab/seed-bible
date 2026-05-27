let dim = os.getCurrentDimension();
const typingTool = getBot('mmTypingManager');
let controlBot = getBot(byTag("id", tags.controlBotId))
setTagMask(thisBot, "assignedBot", controlBot.masks.lineTo[0], "shared")
if(masks.currentState){ // need to hide the bots
    setTagMask(thisBot, "color", "#1DE9B6", "shared");
    for(let i = 0; i < controlBot.masks.lineTo.length; i++){
        let subBot = getBot(byTag("id", controlBot.masks.lineTo[i]));
        let subIndexBot = getBot(byTag("id", subBot.tags.indexBot));
        if(controlBot.masks.lineTo[i] !== masks.assignedBot){
            whisper(typingTool, "hideBot", {bot: subBot});
            whisper(typingTool, "hideBot", {bot: subIndexBot});
        }
    }
    setTagMask(controlBot, "lineTo", [masks.assignedBot], "shared");
    setTagMask(thisBot, "currentState", false, "shared");
}else{ // need to show the bots
    setTagMask(thisBot, "color", "#FF5252", "shared");
    let x = 0;
    for(let i = 0; i < controlBot.masks.childIds.length; i++){
        if(getBot('mmTypingManager').tags.focusManager.childIds.indexOf(controlBot.masks.childIds[i]) === -1){
            let subBot = getBot(byTag("id", controlBot.masks.childIds[i]));
            let subIndexBot = getBot(byTag("id", subBot.tags.indexBot));
            if(controlBot.masks.lineTo.indexOf(controlBot.masks.childIds[i]) === -1){
                setTagMask(controlBot, "lineTo", [...controlBot.masks.lineTo, controlBot.masks.childIds[i]], "shared")
            }else{
                continue
            }
            if(!subBot.masks.previousLocation){
                subBot.masks.previousLocation = {x: subBot.tags[dim + "X"], y: subBot.tags[dim + "Y"]};
                subIndexBot.masks.previousLocation = {x: subIndexBot.tags[dim + "X"], y: subIndexBot.tags[dim + "Y"]};
            }
            whisper(typingTool, "viewBot", {bot: subBot});
            whisper(typingTool, "viewBot", {bot: subIndexBot});
            animateTag(subBot, {
                fromValue: {
                    [dim + "X"]: controlBot.tags[dim + "X"],
                    [dim + "Y"]: controlBot.tags[dim + "Y"],
                },
                toValue: {
                    [dim + "X"]: controlBot.tags[dim + "X"] + 10,
                    [dim + "Y"]: controlBot.tags[dim + "Y"] - (x + 1) * 2
                },
                duration: 0.05,
                tagMaskSpace: "shared"
            })
            animateTag(subIndexBot, {
                fromValue: {
                    [dim + "X"]: controlBot.tags[dim + "X"],
                    [dim + "Y"]: controlBot.tags[dim + "Y"]
                },
                toValue: {
                    [dim + "X"]: controlBot.tags[dim + "X"] + 7,
                    [dim + "Y"]: controlBot.tags[dim + "Y"] - (x + 1) * 2
                },
                duration: 0.05,
                tagMaskSpace: "shared"
            })
            x++
        }
    }
    setTagMask(thisBot, "currentState", true, "shared");
}