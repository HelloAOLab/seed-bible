const dim = os.getCurrentDimension();
tags.hold = false;
destroy(getBots(byTag("expandTool", true)));
whisper(getBot(byTag("typingTool")), "removeMenuButtons")
whisper(getBot(byTag("typingTool")), "removeTLTools")
const rightSliders = getBots('system', 'Tray.SliderRight');
const lockedIcon = "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/09496640b86a5a1ce78c4d82984e508a61c0ce212fd086149a34ec5fb5dca985.png";
const unlockedIcon = "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/7eb4be127a301949d753548b3388d8753d4d33d66d7bbc3cff5d36771654f275.png";
const usbIcon = "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/de0b6e76774d33f16b4142f074ccf6909c848bc09322193a6496ad5294a67019.png";
if(!tags.parentBotId){
    for(let i = 0; i < rightSliders.length; i++){
        if(rightSliders[i].tags.slots && rightSliders[i].tags.slots.length > 4){
            continue
        }
        const usbForm = create({
            [dim]: true,
            [dim + "X"]: rightSliders[i].tags[dim + "X"] + 2,
            [dim + "Y"]: rightSliders[i].tags[dim + "Y"] + rightSliders[i].tags.scaleY / 2 - (rightSliders[i].tags.slots ? rightSliders[i].tags.slots.length + 1 : 1) * 2 + 1,
            [dim + "Z"]: 0.05,
            scaleX: 1,
            scaleY: 1,
            scaleZ: 0.05,
            form: "sprite",
            formAddress: usbIcon,
            usbForm: true,
            allotedMindmap: null,
            draggable: false,
            sliderId: rightSliders[i].tags.id,
            space: "tempShared",
            trayId: rightSliders[i].tags.trayId,
            system: 'Tray.usbForm'
        })
        const lockForm = create({
            [dim]: true,
            [dim + "X"]: rightSliders[i].tags[dim + "X"] + 1,
            [dim + "Y"]: rightSliders[i].tags[dim + "Y"] + rightSliders[i].tags.scaleY / 2 - (rightSliders[i].tags.slots ? rightSliders[i].tags.slots.length + 1 : 1) * 2 + 1,
            [dim + "Z"]: 0.05,
            scaleX: 0.7,
            scaleY: 0.7,
            scaleZ: 0.05,
            form: "sprite",
            formAddress: unlockedIcon,
            formAddresses: [lockedIcon, unlockedIcon],
            lockForm: true,
            allotedMindmap: null,
            draggable: false,
            sliderId: rightSliders[i].tags.id,
            space: "tempShared",
            onClick: `@
                let dim = os.getCurrentDimension();
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
                if(tags.formAddress === tags.formAddresses[0]){
                    tags.formAddress = tags.formAddresses[1];
                    let usbBot = getBot(byTag('id', tags.usbId));
                    let mmBot = getBot(byTag('id', usbBot.tags.allotedMindmap));
                    let mmIndexBot = getBot(byTag('id', mmBot.tags.indexBot));
                    usbBot.tags.allotedMindmap = " ";
                    let childrenIds = [mmBot.tags.id, ...getAllChildIds(mmBot.tags.id)];
                    for(let i = 0; i < childrenIds.length; i++){
                        let subBot = getBot(byTag('id', childrenIds[i]));
                        let subIndexBot = getBot(byTag('id', subBot.tags.indexBot));
                        animateTag(subBot, {
                            fromValue: {
                                [dim + "X"]: subBot.tags[dim + "X"]
                            },
                            toValue: {
                                [dim + "X"]: subBot.tags[dim + "X"] + 2
                            },
                            duration: 0.3
                        })
                        animateTag(subIndexBot, {
                            fromValue: {
                                [dim + "X"]: subIndexBot.tags[dim + "X"]
                            },
                            toValue: {
                                [dim + "X"]: subIndexBot.tags[dim + "X"] + 2
                            },
                            duration: 0.3
                        })
                    }
                    mmBot.tags.draggable = true
                    mmIndexBot.tags.draggable = true
                }
            `,
            onPointerEnter: `@ whisper(getBot('mmTypingManager'), "showTipMenu", {direction: "top", bot: thisBot, message: "Click to release the mindmap"})`,
            onPointerExit: `@ destroy(getBots('dialogBox'))`,
            trayId: rightSliders[i].tags.trayId,
            system: "Tray.lockForm"
        })
        usbForm.tags.lockId = lockForm.tags.id;
        lockForm.tags.usbId = usbForm.tags.id;
    }
}

// let indexBot = getBot(byTag('id', tags.indexBot));
// indexBot.tags[dim] = false;

os.enableCustomDragging();