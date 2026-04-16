import type { ActivityIndicator } from "bibleVizUtils.domain.models.canvas";
import type { ActivityIndicatorBot } from "bibleVizUtils.infrastructure.models.casualos";

export class ActivityIndicatorMapper {
  static toDomain(bot: ActivityIndicatorBot): ActivityIndicator {
    if (bot.tags.indicatorType === "regular") {
      if (typeof bot.tags.index !== "number") {
        throw new Error(
          "ActivityIndicatorMapper: index of a regular indicator must be a number"
        );
      }
      return {
        id: bot.id,
        indicatorType: "regular",
        type: "ActivityIndicator",
        index: bot.tags.index,
      };
    }
    return {
      id: bot.id,
      indicatorType: bot.tags.indicatorType,
      type: "ActivityIndicator",
      index: bot.tags.index,
    };
  }
  static toInfrastructure(
    indicator: ActivityIndicator
  ): ActivityIndicatorBot | undefined {
    const indicatorBot = getBot(byID(indicator.id));

    if (indicatorBot) {
      return indicatorBot as ActivityIndicatorBot;
    }

    return undefined;
  }
}
