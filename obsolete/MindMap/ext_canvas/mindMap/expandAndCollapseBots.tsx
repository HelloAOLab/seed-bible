const parentBot = getBot(byTag("id", that.parentId));

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
parentBot.tags.expanded = false;
let botIds = getAllChildIds(that.parentId);
for(let i = 0; i < botIds.length; i++){
    let childBot = getBot(byTag("id", botIds[i]));
    let childBotIndex = getBot(byTag("id", childBot.tags.indexBot))
    childBot.tags.formOpacity = 0;
    childBot.tags.pointable = false;
    childBot.tags.hideLineTo = [...childBot.tags.lineTo];
    childBot.tags.lineTo = [];
    childBot.tags.labelOpacity = 0;
    childBotIndex.tags.pointable = false;
    childBotIndex.tags.formOpacity = 0;
    childBotIndex.tags.labelOpacity = 0;
}
parentBot.tags.hideLineTo = [...parentBot.tags.lineTo];
parentBot.tags.lineTo = [];