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

let childrenIds = [that.parentId, ...getAllChildIds(that.parentId)];

for(let i = 0; i < childrenIds.length; i++){
    let subBot = getBot(byTag("id", childrenIds[i]));
    for(let j = 0; j < 2; j++){
        setTimeout(() => {
            subBot.tags.lineColor = lineColors[Math.floor(Math.random() * lineColors.length)];
            setTimeout(() => {
                subBot.tags.lineColor = "#263238"
            }, 100)
        }, i * 100 + j * 5 * 100)
    }
}