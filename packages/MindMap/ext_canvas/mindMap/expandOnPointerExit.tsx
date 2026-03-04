const parentBot = getBot(byTag("id", tags.parentId));
parentBot.tags.showPointer = false;

setTimeout(() => {
    const parentBot = getBot(byTag("id", tags.parentId));
    if(!parentBot.tags.showPointer){
        destroy(bot);
    }
}, 3000)