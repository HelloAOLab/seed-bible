const dim = os.getCurrentDimension();
const shareBot = getBot(byTag('shareButton'));
const controlBot = getBot(byTag("id", shareBot.tags.controlBotId));
const typingTool = getBot(byTag("typingTool"));
const getAllChildIds = (id) => {
    const botById = getBot(byTag("id", id));
    let childrenIds = [];
    if(botById.masks.childIds && botById.masks.childIds.length > 0){
        childrenIds = [...botById.masks.childIds];
        for(let i = 0; i < botById.masks.childIds.length; i++){
            childrenIds = [...childrenIds, ...getAllChildIds(botById.masks.childIds[i])]
        }
    } else {
        return []
    }
    return [...childrenIds];
}

const getRootParent = (childBot) => {
    let rootParent = null;
    if(childBot.tags.parentBotId){
        const parentBot = getBot(byTag("id", childBot.tags.parentBotId))
        if(parentBot.tags.parentBotId){
            rootParent = getRootParent(parentBot);
        }else {
            rootParent = parentBot;
        }
    }else{
        rootParent = childBot;
    }
    return rootParent;
}

if(controlBot.masks.mode === 0){
    shareBot.tags.formAddress = shareBot.tags.formAddresses[1]
    const childrenIds = [controlBot.tags.id, ...getAllChildIds(controlBot.tags.id)];
    for(let i = 0; i < childrenIds.length; i++){
        const subBot = getBot(byTag("id", childrenIds[i]));
        setTagMask(subBot, "mode", 1, "shared");
        if(subBot.tags.id === controlBot.tags.id){
            continue
        }
        setTagMask(subBot, "formOpacity", 0.7, "shared");
    }
}
else{
    shareBot.tags.formAddress = shareBot.tags.formAddresses[0]
    const childrenIds = [controlBot.tags.id, ...getAllChildIds(controlBot.tags.id)];
    for(let i = 0; i < childrenIds.length; i++){
        const subBot = getBot(byTag("id", childrenIds[i]));
        setTagMask(subBot, "mode", 0, "shared");
        if(subBot.masks.tempLabel){
            setTagMask(subBot, "label", subBot.masks.tempLabel, "shared");
            setTagMask(subBot, "tempLabel", "", "shared");
        }
        setTagMask(subBot, "formOpacity", 1, "shared");
        clearTagMasks(subBot, "tempLocal");
    }
}