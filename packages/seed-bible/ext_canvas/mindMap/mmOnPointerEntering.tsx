const userBot = getBot(byTag("userInfoBot"), byTag("space", "tempShared"));

if(thisBot.masks.name){
    whisper(getBot("mmTypingManager"), "showTipMenu", {direction: "top", bot: thisBot, message: `${thisBot.masks.name} is writing...`, customTags: {
        strokeColor: "white"
    }});
}