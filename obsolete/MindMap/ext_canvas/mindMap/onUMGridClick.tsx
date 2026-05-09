tags.writing = false;
tags.currentWritingBotId = null;
let strokeBots = getBots(byTag("strokeColor"));
for (let i = 0; i < strokeBots.length; i++) {
  if (
    strokeBots[i].tags.mmBot ||
    strokeBots[i].masks.currentWriter === tags.id
  ) {
    strokeBots[i].masks.strokeColor = null;
    strokeBots[i].masks.color = null;
    strokeBots[i].tags.strokeColor = null;
    strokeBots[i].tags.color = null;
    let strokeIndexBot = getBot(byTag("id", strokeBots[i].tags.indexBot));
    strokeIndexBot.masks.strokeColor = null;
    strokeIndexBot.masks.color = null;
    strokeIndexBot.tags.strokeColor = null;
    strokeIndexBot.tags.color = null;
  }
}
let currentWritingBots = getBots(byTag("currentWriter", tags.id));
for (let bot of currentWritingBots) {
  bot.masks.currentWriter = null;
  bot.masks.name = null;
}
