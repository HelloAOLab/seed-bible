if (masks.interval) {
  whisper(getBot("mmTypingManager"), "showTipMenu", {
    direction: "top",
    bot: thisBot,
    message: "Press to stop animation",
  });
}
