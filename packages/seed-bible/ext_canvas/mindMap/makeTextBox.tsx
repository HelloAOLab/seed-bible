const dim = os.getCurrentDimension();
const typingTool = getBot(byTag("typingTool"));
const textBot = create({
    [dim]: true,
    [dim + "X"]: that.x,
    [dim + "Y"]: that.y,
    scaleX: 6,
    scaleY: 1,
    scaleZ: 0.1,
    onClick: `@
        if(globalThis?.focusOnVisibleButton){
            globalThis.focusOnVisibleButton()
        }
        let typingManager = getBot(byTag("mmTypingManager"));
        let lineColors = ["#FF4081", "#E040FB", "#7C4DFF", "#536DFE", "#448AFF", "#40C4FF", "#18FFFF", "#64FFDA", "#69F0AE"];
        let botColors = ["#FCE4EC", "#F3E5F5", "#EDE7F6", "#E8EAF6", "#E3F2FD", "#E1F5FE", "#E0F7FA", "#E0F2F1", "#E8F5E9"];
        let strokeBots = getBots(byTag("strokeColor"));
        let currentWritingBots = getBots(byTag("currentWriter", typingManager.tags.id));
        for(let i = 0; i < strokeBots.length; i++){
            strokeBots[i].masks.strokeColor = null;
            strokeBots[i].masks.color = null;
            let strokeIndexBot = getBot(byTag("id", strokeBots[i].tags.indexBot));
            strokeIndexBot.masks.strokeColor = null;
            strokeIndexBot.masks.color = null;
        }
        for(let bot of currentWritingBots){
            bot.masks.currentWriter = null;
            bot.masks.name = null;
        }
        let userBot = getBot(byTag("userInfoBot"), byTag("space", "tempShared"));
        let currentNumber = Math.floor(Math.random() * lineColors.length);
        let currentColor = lineColors[currentNumber]
        setTagMask(thisBot, "strokeColor", lineColors[currentNumber], "shared");
        setTagMask(thisBot, "color", botColors[currentNumber], "shared");
        setTagMask(thisBot, "currentWriter", typingManager.tags.id, "shared");
        // setTagMask(thisBot, "name", userBot.tags.name, "shared");
        whisper(typingManager, "handleEnlargement", {bot: thisBot});
        setTimeout(async () => {
            typingManager.tags.currentWritingBotId = bot.id;
            typingManager.tags.writing = true;
        },  10)
        if(tags.parentTextBar){
            const typingTool = getBot(byTag("typingTool"));
            let parentTextBar = getBot(byTag("id", tags.parentTextBar));
            let textBars = getBots(byTag("textBar"));
            for(let textBar of textBars){
                textBar.tags.active = false;
                textBar.tags.strokeColor = "white";
            }
            parentTextBar.tags.strokeColor = "#40C4FF";
            parentTextBar.tags.active = true;
        }
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
    `,
    textBox: true,
    onPointerEnter: `@
        // tags.color = '#'+(Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0');
        // animateTag(thisBot,"scaleZ",{fromValue:tags.scaleZ,toValue:0.5,duration:0.3})
    `,
    onPointerExit: `@
        // tags["color"] = "white" 
        // animateTag(thisBot,"scaleZ",{fromValue:tags.scaleZ,toValue:0.1,duration:0.3})
    `,
    toErase: true,
    onDrop: typingTool.tags.textBoxOnDrop,
    parentTextBar: that?.id ? that.id : null,
    onDrag: `@
    const typingTool = getBot(byTag("typingTool"));
    if(tags.parentTextBar){
        let dim = os.getCurrentDimension();
        let parentTextBar = getBot(byTag("id", tags.parentTextBar));
        whisper(typingTool, "makeTextBox", {x: parentTextBar.tags[dim + "X"], y: parentTextBar.tags[dim + "Y"] + 0.8, id: parentTextBar.tags.id});
        tags.parentTextBar = null;
    }
    whisper(typingTool, "removeMenuButtons");
    whisper(typingTool, "removeTLTools")
    `,
    onDestroy: `@
        if(tags.parentTextBar){
            destroy(tags.parentTextBar)
        }
    `,
    states: ['text', 'timeLine'],
    state: "text",
    space: "tempShared",
    onCreate: `@
        let typingManager = getBot(byTag("mmTypingManager"));
        typingManager.tags.currentWritingBotId = bot.id;
        typingManager.tags.writing = true;
        setTimeout(() => {
            if(tags.parentTextBar){
                const typingTool = getBot(byTag("typingTool"));
                let parentTextBar = getBot(byTag("id", tags.parentTextBar));
                let textBars = getBots(byTag("textBar"));
                for(let textBar of textBars){
                    textBar.tags.active = false;
                    textBar.tags.strokeColor = "white";
                }
                parentTextBar.tags.strokeColor = "#40C4FF";
                parentTextBar.tags.active = true;
            }
        }, 200)
        if(tags.prevScaleX){
            setTagMask(thisBot, "onPointerEnter", " ", "shared");
            setTagMask(thisBot, "onPointerExit", " ", "shared");
            setTagMask(thisBot, "onClick", \`@
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
            \`, "shared");
            setTagMask(thisBot, "scaleX", thisBot.tags.prevScaleX, "shared");
            setTagMask(thisBot, "scaleY", thisBot.tags.prevScaleY, "shared");
        }
    `,
    ...that?.config
})
setTagMask(textBot, "mode", 0, "shared");
setTagMask(textBot, "label", that?.label ? that.label : " ", "shared");
if (that?.id) {
    const parentTextBar = getBot(byTag("id", that.id));
    const textBars = getBots(byTag("textBar"));
    for (const textBar of textBars) {
        textBar.tags.active = false;
        textBar.tags.strokeColor = "white";
    }
    parentTextBar.tags.strokeColor = "#40C4FF";
    parentTextBar.tags.active = true;
    parentTextBar.tags.textBox = textBot.tags.id;
}

return { bot: textBot }