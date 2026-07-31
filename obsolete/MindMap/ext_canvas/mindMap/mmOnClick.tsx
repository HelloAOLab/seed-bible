if (globalThis?.focusOnVisibleButton) {
  globalThis.focusOnVisibleButton();
}
let typingManager = getBot(byTag("mmTypingManager"));
whisper(typingManager, "handleEnlargement", { bot: thisBot });
setTimeout(async () => {
  let selectBot = getBot(byTag("button2", true));
  if (selectBot) {
    if (selectBot.tags.selecting) {
      whisper(typingManager, "prePresentation", {
        selecting: true,
        bot: thisBot,
      });
      return;
    }
  }
  if (masks.currentWriter) {
    if (masks.currentWriter === typingManager.tags.id) {
      // let userBot = getBot(byTag("userInfoBot"), byTag("space", "tempShared"));
      return;
    }
    await os.playSound(
      "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/14072bf099bdf11254e7effc1177296775828f6c1e93d6d6c44d432b1ba6b5ba.mpga"
    );
    return;
  }
  typingManager.tags.currentWritingBotId = bot.id;
  typingManager.tags.writing = true;
}, 10);
