let dim = os.getCurrentDimension();
let controlBot = getBot(byTag("id", tags.controlBotId));
let controlIndexBot = getBot(byTag("id", controlBot.tags.indexBot));
let typingTool = getBot(byTag("typingTool"))
let lineColors = ["#FF4081", "#E040FB", "#7C4DFF", "#536DFE", "#448AFF", "#40C4FF", "#18FFFF", "#64FFDA", "#69F0AE"];
const getAllChildIds = (id) => {
    const botById = getBot(byTag("id", id));
    let childrenIds = [];
    if (botById.masks.childIds && botById.masks.childIds.length > 0) {
        childrenIds = [...botById.masks.childIds];
        for (let i = 0; i < botById.masks.childIds.length; i++) {
            childrenIds = [...childrenIds, ...getAllChildIds(botById.masks.childIds[i])]
        }
    } else {
        return []
    }
    return childrenIds;
}
const isChild = (parentId, childId) => {
    const allChildId = getAllChildIds(parentId);
    if(allChildId.indexOf(childId) !== -1){
        return true;
    }else{
        return false;
    }
}
if(tags.listShowing){
    tags.listShowing = false;
    tags.formAddress = tags.formAddresses[0];
    destroy(getBots(byTag("listBot")))
}else{
    if(controlBot.tags.linkList && controlBot.tags.linkList.length > 0){
        tags.listShowing = true;
        tags.formAddress = tags.formAddresses[1];
        let confirmedLinklist = []
        for(let i = 0; i < controlBot.tags.linkList.length; i++){
            if(isChild(controlBot.tags.id, controlBot.tags.linkList[i])){
                let currentNumber = Math.floor(Math.random() * lineColors.length);
                let currentColor = lineColors[currentNumber]
                let childBot = getBot(byTag("id", controlBot.tags.linkList[i]));
                let childIndexBox = getBot(byTag("id", childBot.tags.indexBot));
                let listBot = create({
                    [dim]: "true",
                    [dim + "X"]: tags[dim + "X"],
                    [dim + "Y"]: tags[dim + "Y"],
                    [dim + "Z"]: 0.1,
                    scaleX: 2.5,
                    scaleY: 0.7,
                    scaleZ: 0.1,
                    space: "tempLocal",
                    labelFontSize: 0.8,
                    formOpacity: 0,
                    labelOpacity: 1,
                    label: `${controlIndexBot.tags.label} : ${childIndexBox.tags.label}`,
                    color: "clear",
                    listBot: true,
                    parentId: controlBot.tags.id,
                    childId: controlBot.tags.linkList[i],
                    strokeColor: currentColor
                });
                let playButton = create({
                    [dim]: "true",
                    [dim + "X"]: tags[dim + "X"] - 1.9,
                    [dim + "Y"]: tags[dim + "Y"],
                    [dim + "Z"]: 0.1,
                    scaleX: 0.7,
                    scaleY: 0.7,
                    scaleZ: 0.3,
                    space: "tempLocal",
                    labelFontSize: 0.8,
                    formOpacity: 1,
                    listBot: true,
                    onClick: typingTool.tags.listBotOnClick,
                    parentId: controlBot.tags.id,
                    childId: controlBot.tags.linkList[i],
                    form: "sprite",
                    formAddress: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/ae0e931d2819a78d59cec25d47d4a242dae0e3b3c3466b5620fc7e0da3f1318b.png",
                    onPointerEnter: typingTool.tags.playButtonPointerEnter,
                    onPointerExit: typingTool.tags.playButtonPointerExit
                });
                animateTag(listBot, {
                    fromValue: {
                        [dim + "Y"]: listBot.tags[dim + "Y"],
                        formOpacity: listBot.tags.formOpacity,
                        labelOpacity: listBot.tags.labelOpacity,
                    },
                    toValue: {
                        [dim + "Y"]: listBot.tags[dim + "Y"] - 1 - (i),
                        formOpacity: 1,
                                        
                    },
                    duration: 0.2
                })
                animateTag(playButton, {
                    fromValue: {
                        [dim + "Y"]: playButton.tags[dim + "Y"],
                    },
                    toValue: {
                        [dim + "Y"]: playButton.tags[dim + "Y"] - 1 - (i),
                    },
                    duration: 0.2
                })
                confirmedLinklist = [...confirmedLinklist, controlBot.tags.linkList[i]];
            }
            let tray = create({
                [dim]: "true",
                [dim + "X"]: tags[dim + "X"] - 0.5,
                [dim + "Y"]: tags[dim + "Y"] - 0.5 - confirmedLinklist.length / 2,
                [dim + "Z"]: 0.05,
                scaleX: 4,
                scaleY: confirmedLinklist.length,
                scaleZ: 0.1,
                space: "tempLocal",
                labelFontSize: 0.8,
                formOpacity: 1,
                labelOpacity: 1,
                color: "#E0F7FA",
                listBot: true
            })
        }
    }else{
        os.toast("No link is saved")
    }
}