import { DistanceBetweenBotAndCamera } from "bibleVizUtils.functions.index";

const { bots } = that;

const dimension = os.getCurrentDimension();
const newOrder = bots.sort((a, b) => {
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
    const botToCameraDistanceA = DistanceBetweenBotAndCamera({ bot: a });
    const botToCameraDistanceB = DistanceBetweenBotAndCamera({ bot: b });

    if (botToCameraDistanceA < botToCameraDistanceB) {
      return 1;
    } else if (botToCameraDistanceA > botToCameraDistanceB) {
      return -1;
    } else if (botToCameraDistanceA == botToCameraDistanceB) {
      return 0;
    }
  }
});
let i = -1;

for (const bot of newOrder) {
  setTagMask(bot, "formRenderOrder", i);
  i--;
}
