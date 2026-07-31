if (configBot.tags.systemPortal) return;
let writenBot = getBot(byTag("id", tags.currentWritingBotId));
let dim = os.getCurrentDimension();
if (that.keys[0] === "Backspace") {
  if (writenBot.masks.clearTextTO) {
    await clearTimeout(writenBot.masks.clearTextTO);
    writenBot.masks.clearTextTO = null;
  }
  if (writenBot.masks.colorPulse) {
    await clearTimeout(writenBot.masks.colorPulse);
    writenBot.masks.colorPulse = null;
    await clearInterval(writenBot.masks.colorInterval);
    writenBot.masks.color = "white";
    if (writenBot.tags.indexBot) {
      let indexBot = getBot(byTag("id", writenBot.tags.indexBot));
      await clearInterval(indexBot.masks.colorInterval);
      indexBot.masks.color = "white";
    }
  }
}
