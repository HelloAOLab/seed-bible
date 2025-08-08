const {botId} = that;

const previousBotSelectedBot = getBot(byTag('selectedAiBot', true));

if(previousBotSelectedBot){
    if(gridPortalBot.tags.pixelWidth <= 720 && botId === previousBotSelectedBot.tags.id){
        const value = await os.showInput();
        setTagMask(previousBotSelectedBot, "label", value, "tempLocal");
        return
    }
    previousBotSelectedBot.masks.color = null;
    previousBotSelectedBot.masks.strokeColor = "transparent";
    previousBotSelectedBot.masks.selectedAiBot = null;
    destroy(getBots("aiHideTool"));
    if(botId === previousBotSelectedBot.tags.id){
        whisper(thisBot, "createAiOptions", {clean: true});
        return
    }
}

if(botId === null){
    whisper(thisBot, "createAiOptions", {clean: true});
    destroy(getBots("aiWords"));
    destroy(getBots("aiTray"));
    return
}else{
    let currentBot = getBot(byID(botId));
    if(currentBot){
        setTagMask(currentBot, "color", "#448AFF", "tempLocal");
        setTagMask(currentBot, "strokeColor", "#448AFF", "tempLocal");
        setTagMask(currentBot, "selectedAiBot", true, "tempLocal");
        whisper(thisBot, "createAiOptions");
        shout("makeHideTool", {botId: currentBot.tags.id, toolName: "aiHideTool"});
        if(gridPortalBot.tags.pixelWidth <= 720){
            const value = await os.showInput();
            setTagMask(currentBot, "label", value, "tempLocal");
        }
        if(!currentBot.masks.lineTo && !currentBot.masks.tempLineTo){
            shout("createNodes", {botId: currentBot.tags.id});
        }
    }
}