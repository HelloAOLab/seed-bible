const dim = os.getCurrentDimension();
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

const childToParentBots = (childId) => {
    const childBot = getBot(byTag("id", childId));
    let list = [childId];
    if(childBot.tags.parentBotId){
        list = [...list, ...childToParentBots(childBot.tags.parentBotId)]
    }
    return [...list]
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

const textBot = getBot(byTag("id", tags.textBot));
const rootParent = getRootParent(textBot);
const allChildrens = [rootParent.tags.id, ...getAllChildIds(rootParent.tags.id)];
await os.playSound("https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/2e2827636cc7a30197222a7ccd65a71d3ce95a34abe2a7d218c822ebbc052798.mpga")

for(let i = 0; i < allChildrens.length; i++){
    const subBot = getBot(byTag("id", allChildrens[i]));
    const subIndexBot = getBot(byTag("id", subBot.tags.indexBot));
    if(subBot.masks.interval){
        clearInterval(subBot.masks.interval);
        subBot.masks.interval = null;
    }
    if(subBot.masks.interval2){
        clearInterval(subBot.masks.interval2);
        subBot.masks.interval2 = null;
    }
    if(subIndexBot.masks.interval){
        clearInterval(subIndexBot.masks.interval);
        subIndexBot.masks.interval = null;
    }
    if(subIndexBot.masks.interval2){
        clearInterval(subIndexBot.masks.interval2);
        subIndexBot.masks.interval2 = null;
    }
    clearAnimations(subBot);
    clearAnimations(subIndexBot);
    subBot.masks.strokeColor = null;
    subBot.tags.strokeColor = null;
    subBot.masks[dim + "Z"] = null;
    subIndexBot.masks.strokeColor = null;
    subIndexBot.tags.strokeColor = null;
    subIndexBot.masks[dim + "Z"] = null;
}