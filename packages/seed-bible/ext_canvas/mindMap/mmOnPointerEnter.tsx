const dim = os.getCurrentDimension();

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

const plusTag = create({
    [dim]: true,
    [dim + "X"]: tags[dim + "X"] + 3.25,
    [dim + "Y"]: tags[dim + "Y"],
    space: "tempLocal",
    scaleX: 0.5,
    scaleY: 0.5,
    label: "-",
    onPointerEnter: typingTool.tags.expandOnPointerEnter,
    parentId: tags.id,
    onPointerExit: typingTool.tags.expandOnPointerExit,
    onClick: typingTool.tags.expandOnClick,
    scaleZ: 0.01,
    expandTool: true,
    onCreate: `@
        let parentBot = getBot(byTag("id", tags.parentId));
        if(parentBot.masks.expanded){
            tags.label = "-";
        }else{
            tags.label = "+";
        }
    `
});

tags.showPointer = false;

setTimeout(() => {
    if(!tags.showPointer){
        destroy(plusTag);
    }
}, 3000)

tags.hold = true;