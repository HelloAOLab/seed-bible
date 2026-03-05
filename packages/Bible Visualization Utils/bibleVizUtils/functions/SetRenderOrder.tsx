const { bots } = that;

const dimension = os.getCurrentDimension();
const newOrder = bots.sort((a: any, b) => {
  if (
    (a.masks[dimension + "Z"] ?? a.tags[dimension + "Z"]) >
    (b.masks[dimension + "Z"] ?? b.tags[dimension + "Z"])
  ) {
    return 1;
  } else if (
    (a.masks[dimension + "Z"] ?? a.tags[dimension + "Z"]) <
    (b.masks[dimension + "Z"] ?? b.tags[dimension + "Z"])
  ) {
    return -1;
  } else {
    if (
      thisBot.DistanceBetweenBotAndCamera({ bot: a }) <
      thisBot.DistanceBetweenBotAndCamera({ bot: b })
    ) {
      return 1;
    } else if (
      thisBot.DistanceBetweenBotAndCamera({ bot: a }) >
      thisBot.DistanceBetweenBotAndCamera({ bot: b })
    ) {
      return -1;
    } else if (
      thisBot.DistanceBetweenBotAndCamera({ bot: a }) ==
      thisBot.DistanceBetweenBotAndCamera({ bot: b })
    ) {
      return 0;
    }
  }
});
let i = -1;

for (const bot of newOrder) {
  setTagMask(bot, "formRenderOrder", i);
  i--;
}
