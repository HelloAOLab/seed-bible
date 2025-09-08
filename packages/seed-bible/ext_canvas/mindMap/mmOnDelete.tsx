let dim = os.getCurrentDimension();
const typingTool = getBot(byTag("typingTool"));
let lineColors = ["#FF4081", "#E040FB", "#7C4DFF", "#536DFE", "#448AFF", "#40C4FF", "#18FFFF", "#64FFDA", "#69F0AE"]
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

let controlBotParent = getBot(byTag("id", tags.parentBotId));
destroy(getBot(byTag("id", tags.indexBot)));
for(let i = 0; i < masks.childIds.length; i++){
    let subBot = getBot(byTag("id", masks.childIds[i]));
    if(subBot){
        subBot.tags.parentBotId = null;
        let subBotChildrens = [subBot.tags.id, ...getAllChildIds(subBot.tags.id)];
        whisper(typingTool, "linePulser", {parentId: subBotChildrens[i]})
        if(subBotChildrens.length === 1){
            const subBotChild = getBot(byTag("id", subBotChildrens[0]));
            let subIndexBot = getBot(byTag("id", subBotChild.tags.indexBot));
            animateTag(subBotChild, {
                fromValue: {
                    formOpacity: 1
                },
                toValue: {
                    formOpacity: 0
                },
                duration: 0.1
            })
            await animateTag(subIndexBot, {
                fromValue: {
                    formOpacity: 1
                },
                toValue: {
                    formOpacity: 0
                },
                duration: 0.1
            });
            whisper(typingTool, "makeTextBox", {x: subBotChild.masks[dim + "X"] - 0.5, y: subBotChild.masks[dim + "Y"], label: subBotChild.masks.label});
            destroy(subBotChild);
        }else{
            for(let i = 0; i < subBotChildrens.length; i++){
                const subBotChild = getBot(byTag("id", subBotChildrens[i]));
                if(subBotChild.tags.indexBot){
                    let subIndexBot = getBot(byTag("id", subBotChild.tags.indexBot));
                    setTagMask(subIndexBot, "label", `${i + 1}`, "tempShared");
                }
            }
        }
    }
}

let childIds = controlBotParent.masks.childIds ? [...controlBotParent.masks.childIds] : [];
childIds.splice(childIds.indexOf(tags.id), 1);
setTagMask(controlBotParent, "lineTo", [...childIds], "shared");
setTagMask(controlBotParent, "childIds", [...childIds], "shared");

whisper(typingTool, "removeMenuButtons");
whisper(typingTool, "removeTLTools")
destroy(getBots(byTag("expandTool", true)));
if(globalThis?.removePresentationMode && initialChildrens){
    globalThis?.removePresentationMode(initialChildrens);
}