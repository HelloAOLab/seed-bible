if(globalThis?.aiStarted){
    os.toast("Other AI action is currently underway!")
    return
}
globalThis.aiStarted = true;

let a = 0;
let dim = os.getCurrentDimension()
tags[dim + "RotationZ"] = 0;
let interval = setInterval(() => {
    tags[dim + "RotationZ"] = Math.PI * a;
    a += 0.005
    if(a >= 2){
        a = 0
    }
}, 16);

const aiChat = getBot('system', 'ext_canvas.aiChat');

setTagMask(aiChat, "crAction", {
    botId: tags.controlBotId,
    activeFormAddress: thisBot.tags.activeFormAddress
}, "tempLocal")

setTagMask(thisBot, "formAddress", thisBot.tags.activeFormAddress, "tempLocal");
setTagMask(thisBot, "rotateInterval", interval, "tempLocal");

try{
    const aiMessage = await globalThis.aiUtils.callGPTImageGen(that?.text ? that.text : null);

    if(aiMessage !== null && !that?.self){
        shout("createAIImageBot", {
            image: aiMessage
        })
    }else if(aiMessage!== null && that?.self){
        let controlBot = getBot(byID(tags.controlBotId));
        let aiChat = getBot('system', 'ext_canvas.aiChat');
        setTagMask(controlBot, "formAddress", aiMessage, "shared");
        setTagMask(controlBot, "scaleX", aiChat.masks.width ? aiChat.masks.width * 0.01 : 500 * 0.01, "shared");
        setTagMask(controlBot, "scaleY", aiChat.masks.height ? aiChat.masks.height * 0.01 : 500 * 0.01, "shared");
        setTagMask(controlBot, "scaleY", aiChat.masks.height ? aiChat.masks.height * 0.01 : 500 * 0.01, "shared");
        setTag(controlBot, "prevScaleX", aiChat.masks.width ? aiChat.masks.width * 0.01 : 500 * 0.01)
        setTag(controlBot, "anchorPoint", aiChat.masks.anchorPoint ? aiChat.masks.anchorPoint : "center")
        setTagMask(controlBot, "formOpacity", 1, "shared");
        setTagMask(controlBot, "label", " ", "shared");
        setTagMask(controlBot, "onPointerEnter", " ", "shared");
        setTagMask(controlBot, "onPointerExit", " ", "shared");
        setTagMask(controlBot, "onClick", `@
            let typingManager = getBot(byTag("mmTypingManager"));
            // whisper(typingManager, "handleEnlargement", {bot: thisBot});
            let canvasTool = getBot('system', 'ext_canvas.canvasTool');
            if(canvasTool.masks?.type?.type === "annotation"){
                // whisper(canvasTool, "onGridClick", {botId: thisBot.tags.id})
                if(!globalThis?.annotInitialized){
                    whisper(getBot('system', 'experience.annotation'), "initialize", {botId: thisBot.tags.id})
                }else{
                    if(!annotBotIds.includes(thisBot.tags.id)){
                        setAnnotBotIds([...annotBotIds, thisBot.tags.id]);
                    }
                }
            }
        `, "shared");
        // if(aiChat.masks.rotationX){
        //     controlBot[dim + "RotationX"] = Math.PI * 2 * aiChat.masks.rotationX;
        // }
        // if(aiChat.masks.rotationY){
        //     controlBot[dim + "RotationY"] = Math.PI * 2 * aiChat.masks.rotationY;
        // }
        // if(aiChat.masks.rotationZ){
        //     controlBot[dim + "RotationZ"] = Math.PI * 2 * aiChat.masks.rotationZ;
        // }
        animateTag(controlBot, {
            fromValue: {
                [dim + "RotationX"]: 0,
                [dim + "RotationY"]: 0,
                [dim + "RotationZ"]: 0,
            },
            toValue: {
                [dim + "RotationX"]: aiChat.masks?.rotationX ? Math.PI * 2 * aiChat.masks.rotationX : 0,
                [dim + "RotationY"]: aiChat.masks?.rotationY ? Math.PI * 2 * aiChat.masks.rotationY : 0,
                [dim + "RotationZ"]: aiChat.masks?.rotationZ ? Math.PI * 2 * aiChat.masks.rotationZ : 0,
            },
            duration: 0.1,
            easing: "elastic",
            tagMaskSpace: "local"
        })
        let typingManager = getBot(byTag("mmTypingManager"));
        whisper(typingManager, "onGridClick");
    }
}catch(e){
    console.log(e)
}

let intBots = getBots("rotateInterval");
intBots.forEach(intBot => {
    clearInterval(intBot.masks.rotateInterval)
    intBot.tags[dim + "RotationZ"] = 0;
});
tags[dim + "RotationZ"] = 0;
globalThis.aiStarted = false;
aiChat.masks.crAction = null;
thisBot.masks.formAddress = null;
