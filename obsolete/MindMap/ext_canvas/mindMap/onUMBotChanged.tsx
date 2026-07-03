let dim = os.getCurrentDimension();
if (that.tags.indexOf("currentWritingBotId") !== -1) {
  // writing bot is either selected or changed
  setTimeout(() => {
    let currentWritingBot = getBot(byTag("id", tags.currentWritingBotId));
    if (currentWritingBot && tags.writing) {
      whisper(bot, "menuOnCreate", {
        [dim + "X"]: currentWritingBot.tags[dim + "X"],
        [dim + "Y"]: currentWritingBot.tags[dim + "Y"],
        id: currentWritingBot.tags.id,
        textBot: currentWritingBot.tags.textBox,
      });
    } else if (!tags.writing) {
      whisper(bot, "removeMenuButtons");
      whisper(bot, "removeTLTools");
    }
  }, 180);
} else if (that.tags.indexOf("writing") !== -1) {
  // there is no writing bot
  if (!tags.writing) {
    whisper(bot, "removeMenuButtons");
    whisper(bot, "removeTLTools");
  }
}
