let dim = os.getCurrentDimension();
animateTag(thisBot, {
  fromValue: {
    [dim + "Z"]: thisBot.tags[dim + "Z"],
  },
  toValue: {
    [dim + "Z"]: 0.3,
  },
  duration: 0.2,
});
whisper(getBot("mmTypingManager"), "showTipMenu", {
  direction: "left",
  bot: thisBot,
  message: "Start presentation",
});
