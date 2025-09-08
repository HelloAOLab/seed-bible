let controlBot = getBot(byTag("id", tags.controlBotId));

if(controlBot.masks.mode === 0){
    tags.formAddress = tags.formAddresses[0]
}else{
    tags.formAddress = tags.formAddresses[1]
}

let buttonBots = getBots("shareButton");
for(let i = 0; i < buttonBots.length; i++){
    if(buttonBots[i].tags.id !== tags.id){
        await clearInterval(buttonBots[i].masks.interval);
        await clearInterval(buttonBots[i].masks.interval2);
        destroy(buttonBots[i])
    }
}