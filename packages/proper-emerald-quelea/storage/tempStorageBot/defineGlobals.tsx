if (thisBot.tags.system !== "storage.tempStorageBot") {
    globalThis.LocaleStorage = thisBot;
    thisBot.visitedExperinces();
    thisBot.historySaver();
    thisBot.progressSaver();
    this.iconsSaver();
}


const localStorage = getBot("system", "storage.localStorage");

if (!localStorage?.tags?.experincesArray) {
    const storageBotClone = getBot("system", "storage.tempStorageBot")
    const storageBot = create(storageBotClone, {
        space: "local",
        system: "storage.localStorage",
    });
    console.log("STORAGE BOT CREATED!", storageBot)
}
