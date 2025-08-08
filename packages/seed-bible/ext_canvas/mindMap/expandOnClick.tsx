const parentBot = getBot(byTag("id", tags.parentId));
const typingTool = getBot('mmTypingManager');

const getAllChildIds = (id) => {
    const botById = getBot(byTag("id", id));
    let childrenIds = [];
    if(botById.masks.childIds && botById.masks.childIds.length > 0){
        for(let i = 0; i < botById.masks.childIds.length; i++){
            childrenIds = [...childrenIds, botById.masks.childIds[i], ...getAllChildIds(botById.masks.childIds[i])]
        }
    }else{
        return []
    }
    return childrenIds;
}

if(parentBot.masks.expanded){
    tags.label = "+";
    setTagMask(parentBot, "expanded", false, "shared");
    const botIds = getAllChildIds(tags.parentId);
    for(let i = 0; i < botIds.length; i++){
        const childBot = getBot(byTag("id", botIds[i]));
        const childBotIndex = getBot(byTag("id", childBot.tags.indexBot));
        setTagMask(childBot, "hideLineTo", [...childBot.masks.lineTo], "shared");
        setTagMask(childBot, "lineTo", [], "shared");
        whisper(typingTool, "hideBot", {bot: childBot});
        whisper(typingTool, "hideBot", {bot: childBotIndex});
    }
    setTagMask(parentBot, "hideLineTo", parentBot.masks.lineTo ? [...parentBot.masks.lineTo] : [], "shared");
    setTagMask(parentBot, "lineTo", [], "shared");
}else{
    tags.label = "-"
    setTagMask(parentBot, "expanded", true, "shared");
    const botIds = getAllChildIds(tags.parentId);
    for(let i = 0; i < botIds.length; i++){
        const childBot = getBot(byTag("id", botIds[i]));
        const childBotIndex = getBot(byTag("id", childBot.tags.indexBot))
        setTagMask(childBot, "lineTo", [...childBot.masks.hideLineTo], "shared");
        setTagMask(childBot, "hideLineTo", [], "shared");
        whisper(typingTool, "viewBot", {bot: childBot});
        whisper(typingTool, "viewBot", {bot: childBotIndex});
    }
    setTagMask(parentBot, "lineTo", parentBot.masks.hideLineTo ? [...parentBot.masks.hideLineTo] : [], "shared");
    setTagMask(parentBot, "hideLineTo", [], "shared");
}