const {botId} = that;
const dim = os.getCurrentDimension()

const initialPlace = [0, -100];
const lineColors = ["#FF4081", "#E040FB", "#7C4DFF", "#536DFE", "#448AFF", "#40C4FF", "#18FFFF", "#64FFDA", "#69F0AE"];
const botColors = ["#FCE4EC", "#F3E5F5", "#EDE7F6", "#E8EAF6", "#E3F2FD", "#E1F5FE", "#E0F7FA", "#E0F2F1", "#E8F5E9"];
const currentNumber = Math.floor(Math.random() * lineColors.length);

const moveEventBots = async (fromIndex = 1000, displacement = 10) => {
    if(fromIndex !== -1){
        for(let i = 0; i < tags.eventBotIds.length; i++){
            let eventBot = getBot(byID(tags.eventBotIds[i]))
            if(eventBot){
                animateTag(eventBot, `${dim + "Y"}`, {
                    toValue: i > fromIndex ? initialPlace[1] - (2 * i) - displacement : initialPlace[1] - (2 * i),
                    duration: 0.5
                })
            }
        }
        await os.sleep(600);
    }
}

globalThis.moveEventBots = moveEventBots;

const previousSelectedBot = getBot(byTag("selectedEventBot", true));

if(previousSelectedBot){
    previousSelectedBot.masks.strokeColor = "transparent";
    previousSelectedBot.masks.color = null;
    previousSelectedBot.masks.selectedEventBot = null;
    if(botId === previousSelectedBot.tags.id){
        os.unregisterApp('slider')
        const dataSlits = getBots(byTag("slitType"));
        destroy(dataSlits);
        const eventBots = getBots("eventBot");
        destroy(eventBots);
        const buttonBots = getBots("arrowDown");
        destroy(buttonBots)
        // await moveEventBots();
        return
    }
}

if(botId === null){
    os.unregisterApp('slider')
    const dataSlits = getBots(byTag("slitType"));
    destroy(dataSlits);
    const eventBots = getBots("eventBot");
    destroy(eventBots);
    const buttonBots = getBots("arrowDown");
    destroy(buttonBots);
    // await moveEventBots();
    return
}else{
    const currentBot = getBot(byID(botId));

    if(currentBot){
        setTagMask(currentBot, "strokeColor", lineColors[currentNumber], "tempLocal");
        setTagMask(currentBot, "color", botColors[currentNumber], "tempLocal");
        setTagMask(currentBot, "selectedEventBot", true, "tempLocal");
        const dataSlits = getBots(byTag("slitType"));
        destroy(dataSlits);
        const eventBots = getBots("eventBot");
        destroy(eventBots);
        const buttonBots = getBots("arrowDown");
        destroy(buttonBots)
        // await moveEventBots(tags.eventBotIds.indexOf(botId), 3);
        switch(currentBot.tags.eventBotType){
            case "sim": {
                console.log("creating sim slider")
                whisper(thisBot, "createSlider", {id: currentBot.tags.id})
                break
            }
            default: {
                whisper(thisBot, "createDataSlits", {id: botId, state: "time"});
            }
        }
    }
}