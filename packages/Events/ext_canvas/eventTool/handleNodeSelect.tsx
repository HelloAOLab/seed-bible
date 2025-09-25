if(globalThis?.eventDataLoading){
    os.toast("Let the previous node data load first!");
    return
}

const {botId} = that;
const dim = os.getCurrentDimension()

const initialPlace = [0, -100];
const lineColors = ["#FF4081", "#E040FB", "#7C4DFF", "#536DFE", "#448AFF", "#40C4FF", "#18FFFF", "#64FFDA", "#69F0AE"];
const botColors = ["#FCE4EC", "#F3E5F5", "#EDE7F6", "#E8EAF6", "#E3F2FD", "#E1F5FE", "#E0F7FA", "#E0F2F1", "#E8F5E9"];
const currentNumber = Math.floor(Math.random() * lineColors.length);

const previousSelectedBot = getBot(byTag("selectedNodeBot", true));

if(previousSelectedBot){
    previousSelectedBot.masks.strokeColor = "transparent";
    previousSelectedBot.masks.color = null;
    previousSelectedBot.masks.selectedNodeBot = null;
    destroy(getBots("hideTool"));
    if(botId === previousSelectedBot.tags.id){
        return
    }
}

if(botId === null){
    return
}else{
    const currentBot = getBot(byID(botId));

    if(currentBot){
        setTagMask(currentBot, "strokeColor", "#0091EA", "tempLocal");
        setTagMask(currentBot, "color", "#0091EA", "tempLocal");
        setTagMask(currentBot, "selectedNodeBot", true, "tempLocal");
        shout("makeHideTool", {botId: currentBot.tags.id, toolName: "hideTool"});
        if(!currentBot.masks.lineTo && !currentBot.masks.tempLineTo){
            shout("createNodes", {botId: currentBot.tags.id});
        }
    }
}