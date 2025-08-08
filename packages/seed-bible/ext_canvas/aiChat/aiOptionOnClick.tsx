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

const aiMessage = await globalThis.aiUtils.callGPT(that?.text ? that.text : null)

if(aiMessage !== null && !that?.self){
    shout("createTextBox", {
        text: aiMessage,
        label: that?.text ? that.text.replace("tell me about ", "") : null
    });
}else if(aiMessage!== null && that?.self){
    let controlBot = getBot(byID(tags.controlBotId));
    setTagMask(controlBot, "label", aiMessage, "shared");
    setTagMask(controlBot, "onPointerEnter", " ", "shared");
    setTagMask(controlBot, "onPointerExit", " ", "shared");
    setTagMask(controlBot, "onClick", `@
        let typingManager = getBot(byTag("mmTypingManager"));
        whisper(typingManager, "handleEnlargement", {bot: thisBot});
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
    let typingManager = getBot(byTag("mmTypingManager"));
    whisper(typingManager, "onGridClick");
}
let intBots = getBots("rotateInterval");
intBots.forEach(intBot => {
    clearInterval(intBot.masks.rotateInterval)
    intBot.tags[dim + "RotationZ"] = 0;
});
tags[dim + "RotationZ"] = 0;
thisBot.masks.formAddress = null;
aiChat.masks.crAction = null;
globalThis.aiStarted = false;