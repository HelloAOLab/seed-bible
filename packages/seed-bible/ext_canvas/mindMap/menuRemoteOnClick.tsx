const dim = os.getCurrentDimension();
const controlBot = getBot(byTag("id", tags.controlBotId));
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
    return childrenIds;
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

if(controlBot.tags.parentBotId){
    const parentBot = getBot(byTag("id", controlBot.tags.parentBotId));
    controlBot.tags.parentBotId = null;
    const childIds = [...parentBot.masks.childIds];
    childIds.splice(childIds.indexOf(controlBot.tags.id), 1);
    setTagMask(parentBot, "lineTo", [...childIds], "shared");
    setTagMask(parentBot, "childIds", [...childIds], "shared");
    const childrensId = [controlBot.tags.id, ...getAllChildIds(controlBot.tags.id)];
    whisper(typingTool, "linePulser", {parentId: controlBot.tags.id})
    for(let i = 0; i < childrensId.length; i++){
        const subBot = getBot(byTag("id", childrensId[i]));
        if(subBot.tags.indexBot){
            const subIndexBot = getBot(byTag("id", subBot.tags.indexBot));
            setTagMask(subIndexBot, "label", `${i + 1}`, "tempShared");
        }
    }
    const rootParent = getRootParent(parentBot);
    const rootParentChildIds = getAllChildIds(rootParent.tags.id);
    for(let i = 0; i < rootParentChildIds.length; i++){
        const subBot = getBot(byTag("id", rootParentChildIds[i]));
        if(subBot.tags.indexBot){
            const subIndexBot = getBot(byTag("id", subBot.tags.indexBot));
            setTagMask(subIndexBot, "label", `${i + 2}`, "tempShared");
        }
    }
}else if(!controlBot.tags.parentBotId && controlBot.masks.lineTo.length > 0){
    const childIds = [...getAllChildIds(controlBot.tags.id)];
    childIds.forEach(childId => {
        const childBot = getBot(byID(childId));
        if(childBot.tags.parentBotId === controlBot.tags.id){
            const parentBot = getBot(byTag("id", childBot.tags.parentBotId));
            childBot.tags.parentBotId = null;
            const childIds = [...parentBot.masks.childIds];
            childIds.splice(childIds.indexOf(childBot.tags.id), 1);
            setTagMask(parentBot, "lineTo", [...childIds], "shared");
            setTagMask(parentBot, "childIds", [...childIds], "shared");
            const childrensId = [childBot.tags.id, ...getAllChildIds(childBot.tags.id)];
            whisper(typingTool, "linePulser", {parentId: childBot.tags.id})
            for(let i = 0; i < childrensId.length; i++){
                const subBot = getBot(byTag("id", childrensId[i]));
                if(subBot.tags.indexBot){
                    const subIndexBot = getBot(byTag("id", subBot.tags.indexBot));
                    setTagMask(subIndexBot, "label", `${i + 1}`, "tempShared");
                }
            }
            const rootParent = getRootParent(parentBot);
            const rootParentChildIds = getAllChildIds(rootParent.tags.id);
            for(let i = 0; i < rootParentChildIds.length; i++){
                const subBot = getBot(byTag("id", rootParentChildIds[i]));
                if(subBot.tags.indexBot){
                    const subIndexBot = getBot(byTag("id", subBot.tags.indexBot));
                    setTagMask(subIndexBot, "label", `${i + 2}`, "tempShared");
                }
            }
        }
    })
    controlBot.masks.lineTo = [];
    controlBot.masks.childIds = [];
}else if(!controlBot.tags.parentBotId && controlBot.masks.lineTo.length === 0){
    whisper(typingTool, "makeTextBox", {x: controlBot.tags[dim + "X"], y: controlBot.tags[dim + "Y"], label: controlBot.masks.label, config: {
        formAddress: controlBot.masks.formAddress ? controlBot.masks.formAddress : controlBot.tags.formAddress ? controlBot.tags.formAddress : null,
        voiceNote: controlBot.masks.voiceNote ? controlBot.masks.voiceNote : controlBot.tags.voiceNote ? controlBot.tags.voiceNote : null,
        prevScaleX: controlBot.tags?.prevScaleX ? controlBot.tags.prevScaleX : null,
        prevScaleY: controlBot.tags?.prevScaleY ? controlBot.tags.prevScaleY : null
    }});
    destroy(controlBot);
}