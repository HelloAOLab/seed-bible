import { DistanceBetweenBotAndCamera } from "bibleVizUtils.functions.index";
import type { Bot } from "../../../../../typings/AuxLibraryDefinitions";

const getBotPositionZ: (bot: Bot, dimension: string) => number = (
  bot,
  dimension
) => {
  return bot.masks[dimension + "Z"] ?? bot.tags[dimension + "Z"] ?? 0;
};

export const SetBotsSortedRenderOrder: (bots: Bot[]) => void = (bots) => {
  const dimension = os.getCurrentDimension();
  const newOrder = bots.sort((a, b) => {
    const botAPositionZ = getBotPositionZ(a, dimension);
    const botBPositionZ = getBotPositionZ(b, dimension);
    if (botAPositionZ > botBPositionZ) {
      return 1;
    } else if (botBPositionZ < botBPositionZ) {
      return -1;
    } else {
      const botToCameraDistanceA = DistanceBetweenBotAndCamera({ bot: a });
      const botToCameraDistanceB = DistanceBetweenBotAndCamera({ bot: b });

      if (botToCameraDistanceA < botToCameraDistanceB) {
        return 1;
      } else if (botToCameraDistanceA > botToCameraDistanceB) {
        return -1;
      } else {
        return 0;
      }
    }
  });
  let i = -1;

  for (const bot of newOrder) {
    setTagMask(bot, "formRenderOrder", i);
    i--;
  }
};
