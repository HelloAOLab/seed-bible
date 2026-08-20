import type { ActivityIndicator } from "../../domain/models/canvas";
import type { ActivityIndicatorBot } from "../models/stack";

export class ActivityIndicatorMapper {
  toDomain(bot: ActivityIndicatorBot): ActivityIndicator {
    // @ts-expect-error TODO: Locate indicatorType at the indicatorBot's visual state
    if (bot.tags.indicatorType === "regular") {
      // @ts-expect-error TODO: Locate index at the indicatorBot's visual state
      if (typeof bot.tags.index !== "number") {
        throw new Error(
          "ActivityIndicatorMapper: index of a regular indicator must be a number"
        );
      }
      return {
        id: bot.id,
        indicatorType: "regular",
        type: "ActivityIndicator",
        // @ts-expect-error TODO: Locate index at the indicatorBot's visual state
        index: bot.tags.index,
      };
    }
    // @ts-expect-error TODO: Locate indicatorType at the indicatorBot's visual state
    if (!bot.tags.indicatorType) {
      throw new Error(
        `ActivityIndicatorMapper: bot.tags.indicatorType not defined at toDomain`
      );
    }
    // @ts-expect-error TODO: Locate index at the indicatorBot's visual state
    if (typeof bot.tags.index !== "number") {
      throw new Error(
        `ActivityIndicatorMapper: bot.tags.index not defined at toDomain`
      );
    }

    return {
      id: bot.id,
      // @ts-expect-error TODO: Locate indicatorType at the indicatorBot's visual state
      indicatorType: bot.tags.indicatorType,
      type: "ActivityIndicator",
      // @ts-expect-error TODO: Locate index at the indicatorBot's visual state
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
