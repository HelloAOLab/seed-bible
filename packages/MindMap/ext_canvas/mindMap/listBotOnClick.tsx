const childToParentBots = (childId, parentId) => {
    let childBot = getBot(byTag("id", childId));
    let list = [childId];
    if(childBot.tags.parentBotId !== parentId){
        list = [...list, ...childToParentBots(childBot.tags.parentBotId, parentId)]
    }else{
        list = [...list, parentId];
    }
    return [...list]
}

let typingManager = getBot(byTag("typingTool"))

let childList = [...childToParentBots(tags.childId, tags.parentId)];
await os.playSound("https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/c09a0209e156afa113f90fe0b6c6635253572af3725c69408bf69f4d730c6091.mpga")
whisper(typingManager, "prePresentation", {childId: tags.childId, parentId: tags.parentId});
setTimeout(() => {
    whisper(getBot('mmTypingManager'), 'startPresentation', {childList: childList.reverse()});
    whisper(getBot('mmTypingManager'), 'removeMenuButtons');
    whisper(getBot('mmTypingManager'), "removeTLTools")
}, 100 * childList.length + 100)