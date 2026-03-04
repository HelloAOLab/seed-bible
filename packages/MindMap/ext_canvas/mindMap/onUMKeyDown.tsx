if (configBot.tags.systemPortal) return;
if(globalThis?.annotInitialized || globalThis?.promtInitiated){
    return
}
let writenBot = getBot(byTag("id", tags.currentWritingBotId));
let dim = os.getCurrentDimension();

const getRootParent = (childBot) => {
    let rootParent = null;
    if (childBot.tags.parentBotId) {
        let parentBot = getBot(byTag("id", childBot.tags.parentBotId))
        if (parentBot.tags.parentBotId) {
            rootParent = getRootParent(parentBot);
        } else {
            rootParent = parentBot;
        }
    } else {
        rootParent = childBot;
    }
    return rootParent;
}

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

const resetTimer = () => {
    clearTimeout(tags.timer);
    tags.timer = setTimeout(() => {
        tags.writing = false;
    }, 30000)
}

const returnDash = (label) => {
    let newStr = "";
    for(let i = 0; i < label.length; i++){
        newStr += "- ";
    }
    return newStr;
}

if (writenBot && tags.writing) {
    const allowedCharacters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "-", "_", "+", "=", "[", "]", "{", "}", "|", "\\", "'", '"', "<", ">", ",", ".", "?", "/", ":", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]

    if(writenBot.tags.owner !== tags.id){
        if(!writenBot.masks.label){
            setTagMask(writenBot, "label", " ", "shared");
        }
        if (allowedCharacters.includes(that.keys[0])) {
            if(writenBot.masks.mode === 0){
                setTagMask(writenBot, "label", writenBot.masks.label + that.keys[0], "shared");
            }else{
                if(writenBot.masks.label[0] !== "-"){
                    setTagMask(writenBot, "tempLabel", writenBot.masks.label + that.keys[0], "shared");
                    let dashLine = returnDash(writenBot.masks.tempLabel);
                    setTagMask(writenBot, "label", dashLine, "shared");
                    setTagMask(writenBot, "label", writenBot.masks.tempLabel, "tempLocal");
                }else{
                    setTagMask(writenBot, "tempLabel", writenBot.masks.tempLabel + that.keys[0], "shared");
                    let dashLine = returnDash(writenBot.masks.tempLabel);
                    setTagMask(writenBot, "label", dashLine, "shared");
                    setTagMask(writenBot, "label", writenBot.masks.tempLabel, "tempLocal");
                }
            }
            tags.writing = true;
        } else if (that.keys[0] === " ") {
            if(writenBot.masks.mode === 0){
                setTagMask(writenBot, "label", writenBot.masks.label + " ", "shared");
            }else{
                if(writenBot.masks.label[0] !== "-"){
                    setTagMask(writenBot, "tempLabel", writenBot.masks.label + " ", "shared");
                    let dashLine = returnDash(writenBot.masks.tempLabel);
                    setTagMask(writenBot, "label", dashLine, "shared");
                    setTagMask(writenBot, "label", writenBot.masks.tempLabel, "tempLocal");
                }else{
                    setTagMask(writenBot, "tempLabel", writenBot.masks.tempLabel + " ", "shared");
                    let dashLine = returnDash(writenBot.masks.tempLabel);
                    setTagMask(writenBot, "label", dashLine, "shared");
                    setTagMask(writenBot, "label", writenBot.masks.tempLabel, "tempLocal");
                }
            }
            tags.writing = true;
        } else if (that.keys[0] === "Backspace") {
            let label = writenBot.masks.label;
            if(label.slice(0, -1)){
                if(writenBot.masks.mode === 0){
                    setTagMask(writenBot, "label", writenBot.masks.label.slice(0, -1), "shared");
                }else{
                    if(writenBot.masks.label[0] !== "-"){
                        setTagMask(writenBot, "tempLabel", writenBot.masks.label.slice(0, -1), "shared");
                        let dashLine = returnDash(writenBot.masks.tempLabel);
                        setTagMask(writenBot, "label", dashLine, "shared");
                        setTagMask(writenBot, "label", writenBot.masks.tempLabel, "tempLocal");
                    }else{
                        setTagMask(writenBot, "tempLabel", writenBot.masks.tempLabel.slice(0, -1), "shared");
                        let dashLine = returnDash(writenBot.masks.tempLabel);
                        setTagMask(writenBot, "label", dashLine, "shared");
                        setTagMask(writenBot, "label", writenBot.masks.tempLabel, "tempLocal");
                    }
                }
                let colorPulse = setTimeout(() => {
                    whisper(thisBot, "startPhaseColor", {bot: writenBot, startingColor: [255,255,255], endingColor: [220, 0, 0], interval: 500});
                }, 100)
                let clearTextTO = setTimeout(() => {
                    setTagMask(writenBot, "label", " ", "shared");
                }, 600)
                setTagMask(writenBot, "clearTextTO", clearTextTO, "tempShared");
                setTagMask(writenBot, "colorPulse", colorPulse, "tempShared");
            }
            tags.writing = true;
        }else if (that.keys[0] === "Enter" && !writenBot.tags.textBox) {
            await os.playSound("https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/bf24fa63fbfb11e5c40fc6fce89c331cc5abae189836d61a38785ed120342dcb.mpga")
            whisper(thisBot, "createMMBot", {from: {x: writenBot.masks[dim + "X"], y: writenBot.masks[dim + "Y"]}, parentBot: writenBot})
        } else if (that.keys[0] === "Control" && !writenBot.tags.textBox) {
            await os.playSound("https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/bf24fa63fbfb11e5c40fc6fce89c331cc5abae189836d61a38785ed120342dcb.mpga")
            const parentBot = getBot(byTag("id", writenBot.tags.parentBotId));
            whisper(thisBot, "createMMBot", {from: {x: parentBot.masks[dim + "X"], y: parentBot.masks[dim + "Y"]}, parentBot: parentBot})
        }
    }else{
        if(!writenBot.masks.label){
            setTagMask(writenBot, "label", " ", "shared");
        }
        if (allowedCharacters.includes(that.keys[0])) {
            if(writenBot.masks.mode === 0){
                setTagMask(writenBot, "label", writenBot.masks.label + that.keys[0], "shared");
            }else{
                let parentBot = getBot(byTag("id", writenBot.tags.parentBotId));
                if(!writenBot.tags.parentBotId || parentBot.masks.mode === 0){
                    setTagMask(writenBot, "label", writenBot.masks.label + that.keys[0], "shared");
                }else{
                    if(writenBot.masks.label[0] !== "-"){
                        setTagMask(writenBot, "tempLabel", writenBot.masks.label + that.keys[0], "shared");
                        let dashLine = returnDash(writenBot.masks.tempLabel);
                        setTagMask(writenBot, "label", dashLine, "shared");
                        setTagMask(writenBot, "label", writenBot.masks.tempLabel, "tempLocal");
                    }else{
                        setTagMask(writenBot, "tempLabel", writenBot.masks.tempLabel + that.keys[0], "shared");
                        let dashLine = returnDash(writenBot.masks.tempLabel);
                        setTagMask(writenBot, "label", dashLine, "shared");
                        setTagMask(writenBot, "label", writenBot.masks.tempLabel, "tempLocal");
                    }
                }
            }
            tags.writing = true;
        } else if (that.keys[0] === " ") {
            if(writenBot.masks.mode === 0){
                setTagMask(writenBot, "label", writenBot.masks.label + " ", "shared");
            }else{
                let parentBot = getBot(byTag("id", writenBot.tags.parentBotId));
                if(!writenBot.tags.parentBotId || parentBot.masks.mode === 0){
                    setTagMask(writenBot, "label", writenBot.masks.label + " ", "shared");
                }else{
                    if(writenBot.masks.label[0] !== "-"){
                        setTagMask(writenBot, "tempLabel", writenBot.masks.label + " ", "shared");
                        let dashLine = returnDash(writenBot.masks.tempLabel);
                        setTagMask(writenBot, "label", dashLine, "shared");
                        setTagMask(writenBot, "label", writenBot.masks.tempLabel, "tempLocal");
                    }else{
                        setTagMask(writenBot, "tempLabel", writenBot.masks.tempLabel + " ", "shared");
                        let dashLine = returnDash(writenBot.masks.tempLabel);
                        setTagMask(writenBot, "label", dashLine, "shared");
                        setTagMask(writenBot, "label", writenBot.masks.tempLabel, "tempLocal");
                    }
                }
            }
            tags.writing = true;
        } else if (that.keys[0] === "Backspace") {
            let label = writenBot.masks.label;
            if(label.slice(0, -1)){
                if(writenBot.masks.mode === 0){
                    setTagMask(writenBot, "label", writenBot.masks.label.slice(0, -1), "shared");
                }else{
                    let parentBot = getBot(byTag("id", writenBot.tags.parentBotId));
                    if(!writenBot.tags.parentBotId || parentBot.masks.mode === 0){
                        setTagMask(writenBot, "label", writenBot.masks.label.slice(0, -1), "shared");
                    }else{
                        if(writenBot.masks.label[0] !== "-"){
                            setTagMask(writenBot, "tempLabel", writenBot.masks.label.slice(0, -1), "shared");
                            let dashLine = returnDash(writenBot.masks.tempLabel);
                            setTagMask(writenBot, "label", dashLine, "shared");
                            setTagMask(writenBot, "label", writenBot.masks.tempLabel, "tempLocal");
                        }else{
                            setTagMask(writenBot, "tempLabel", writenBot.masks.tempLabel.slice(0, -1), "shared");
                            let dashLine = returnDash(writenBot.masks.tempLabel);
                            setTagMask(writenBot, "label", dashLine, "shared");
                            setTagMask(writenBot, "label", writenBot.masks.tempLabel, "tempLocal");
                        }
                    }
                }
                let colorPulse = setTimeout(() => {
                    whisper(thisBot, "startPhaseColor", {bot: writenBot, startingColor: [255,255,255], endingColor: [220, 0, 0], interval: 500});
                }, 100)
                let clearTextTO = setTimeout(() => {
                    setTagMask(writenBot, "label", " ", "shared");
                }, 600)
                setTagMask(writenBot, "clearTextTO", clearTextTO, "tempShared");
                setTagMask(writenBot, "colorPulse", colorPulse, "tempShared");
            }
            tags.writing = true;
        }else if (that.keys[0] === "Enter" && !writenBot.tags.textBox) {
            await os.playSound("https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/bf24fa63fbfb11e5c40fc6fce89c331cc5abae189836d61a38785ed120342dcb.mpga")
            whisper(thisBot, "createMMBot", {from: {x: writenBot.masks[dim + "X"], y: writenBot.masks[dim + "Y"]}, parentBot: writenBot})
        } else if (that.keys[0] === "Control"  && !writenBot.tags.textBox) {
            await os.playSound("https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/bf24fa63fbfb11e5c40fc6fce89c331cc5abae189836d61a38785ed120342dcb.mpga")
            const parentBot = getBot(byTag("id", writenBot.tags.parentBotId))
            whisper(thisBot, "createMMBot", {from: {x: parentBot.masks[dim + "X"], y: parentBot.masks[dim + "Y"]}, parentBot: parentBot})
        }
    }
    if(that.keys.includes("ArrowUp")){
        if(writenBot.tags.parentBotId){
            let parentBot = getBot(byTag("id", writenBot.tags.parentBotId));
            if(parentBot.masks.lineTo.indexOf(writenBot.tags.id) > 0){
                tags.currentWritingBotId = parentBot.masks.lineTo[parentBot.masks.lineTo.indexOf(writenBot.tags.id) - 1];
                tags.writing = true;
            }else if(parentBot.masks.lineTo.indexOf(writenBot.tags.id) === 0){
                tags.currentWritingBotId = parentBot.masks.lineTo[parentBot.masks.lineTo.length - 1];
                tags.writing = true;
            }
        }else if(writenBot.tags.textBox){
            let arrowBot = getBot("arrowDown");
            if(arrowBot.tags.collapsed){
                whisper(arrowBot, "onClick");
            }
        }
    }else if(that.keys.includes("ArrowDown")){
        if(writenBot.tags.parentBotId){
            let parentBot = getBot(byTag("id", writenBot.tags.parentBotId));
            if(parentBot.masks.lineTo.indexOf(writenBot.tags.id) < parentBot.masks.lineTo.length - 1){
                tags.currentWritingBotId = parentBot.masks.lineTo[parentBot.masks.lineTo.indexOf(writenBot.tags.id) + 1];
                tags.writing = true;
            }else if(parentBot.masks.lineTo.indexOf(writenBot.tags.id) === parentBot.masks.lineTo.length - 1){
                tags.currentWritingBotId = parentBot.masks.lineTo[0];
                tags.writing = true;
            }
        }else if(writenBot.tags.textBox){
            let arrowBot = getBot("arrowDown");
            if(!arrowBot.tags.collapsed){
                whisper(arrowBot, "onClick");
            }
        }
    }else if(that.keys.includes("ArrowLeft")){
        if(writenBot.tags.parentBotId){
            let parentBot = getBot(byTag("id", writenBot.tags.parentBotId));
            tags.currentWritingBotId = parentBot.tags.id;
            tags.writing = true;
        }else if(writenBot.tags.textBox){
            whisper(thisBot, "moveDataSlits", {action: "left"});
        }
    }else if(that.keys.includes("ArrowRight")){
        if(writenBot.tags.textBox){
            whisper(thisBot, "moveDataSlits", {action: "right"});
            return
        }
        if(writenBot.masks.lineTo.length > 0){
            let childBot = getBot(byTag('id', writenBot.masks.lineTo[0]))
            tags.currentWritingBotId = childBot.tags.id;
            tags.writing = true;
        }else if(writenBot.masks.lineTo.length === 0){
            let rootParent = getRootParent(writenBot);
            tags.currentWritingBotId = rootParent.tags.id;
            tags.writing = true;
        }
    }
}

resetTimer();