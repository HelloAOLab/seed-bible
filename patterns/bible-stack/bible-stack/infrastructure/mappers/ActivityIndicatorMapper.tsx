import type { ActivityIndicator } from "../../domain/models/canvas";
import type { ActivityIndicatorBot } from "../models/stack";

export class ActivityIndicatorMapper {
  toDomain(bot: ActivityIndicatorBot): ActivityIndicator {
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
    if (!bot.tags.indicatorType) {
      throw new Error(
        `ActivityIndicatorMapper: bot.tags.indicatorType not defined at toDomain`
      );
    }
    if (!bot.tags.index) {
      throw new Error(
        `ActivityIndicatorMapper: bot.tags.index not defined at toDomain`
      );
    }

    return {
      id: bot.id,
      indicatorType: bot.tags.indicatorType,
      type: "ActivityIndicator",
      index: bot.tags.index,
    };
  }

  toInfrastructure(
    indicator: ActivityIndicator
  ): ActivityIndicatorBot | undefined {
    const indicatorBot = getBot(byID(indicator.id));

    if (indicatorBot) {
      return indicatorBot as ActivityIndicatorBot;
    }

    return undefined;
  }
}
