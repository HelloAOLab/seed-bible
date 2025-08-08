if(globalThis?.aiStarted){
    os.toast("Other AI action is currently underway!")
}
const currentAiBot = getBot(byTag('selectedAiBot', true));
if(!currentAiBot.masks.lineTo[0]){
    return
}

let a = 0;
let dim = os.getCurrentDimension()
tags[dim + "RotationZ"] = 0;
let interval = setInterval(() => {
    tags[dim + "RotationZ"] = Math.PI * a;
    a += 0.005
    if(a >= 1){
        a = 0
    }
}, 16);


// const linkedBot = getBot(byID(currentAiBot.masks.lineTo[0]))
const linkedBot = getBot(byTag("selectedNodeBot", true));
setTagMask(thisBot, "formAddress", thisBot.tags.activeFormAddress, "tempLocal");
globalThis.aiStarted = true;

if(linkedBot && currentAiBot.masks.lineTo.includes(linkedBot.tags.id)){
    const aiMessage = await globalThis.aiUtils.callGPT(`tell me about ${linkedBot.tags.label}`);

    shout("createTextBox", {
        text: aiMessage,
        label: linkedBot.tags.label
    })
}else{
    os.toast("No active linked bot found")
}
clearInterval(interval);
tags[dim + "RotationZ"] = 0;
thisBot.masks.formAddress = null;
globalThis.aiStarted = false;