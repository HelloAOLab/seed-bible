tags.writing = false;
tags.currentWritingBotId = null;
const strokeBots = getBots(byTag("strokeColor"));
for(let i = 0; i < strokeBots.length; i++){
    if(strokeBots[i].tags.mmBot || strokeBots[i].masks.currentWriter === tags.id){
        strokeBots[i].masks.strokeColor = null;
        strokeBots[i].masks.color = null;
        strokeBots[i].tags.strokeColor = null;
        strokeBots[i].tags.color = null;
        const strokeIndexBot = getBot(byTag("id", strokeBots[i].tags.indexBot));
        strokeIndexBot.masks.strokeColor = null;
        strokeIndexBot.masks.color = null;
        strokeIndexBot.tags.strokeColor = null;
        strokeIndexBot.tags.color = null;
    }
}
const currentWritingBots = getBots(byTag("currentWriter", tags.id));
for(const bot of currentWritingBots){
    bot.masks.currentWriter = null;
    bot.masks.name = null;
}