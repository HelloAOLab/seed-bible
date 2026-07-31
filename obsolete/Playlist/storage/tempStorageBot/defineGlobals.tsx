const G = globalThis as any;

if (thisBot.tags.system !== "storage.tempStorageBot") {
  G.LocaleStorage = thisBot;
  thisBot.historySaver();
  thisBot.progressSaver();
  thisBot.iconsSaver();
}

const localStorage = getBot("system", "storage.localStorage");

if (!localStorage?.tags?.experincesArray) {
  const storageBotClone = getBot("system", "storage.tempStorageBot");
  const storageBot = create(storageBotClone, {
    space: "local",
    system: "storage.localStorage",
  });
  console.log("STORAGE BOT CREATED!", storageBot);
}
