import type { ActivityIndicator } from "../../domain/models/canvas";
import type { ActivityIndicatorBot } from "../models/stack";

export class ActivityIndicatorMapper {
  toInfrastructure(
    indicator: ActivityIndicator
  ): ActivityIndicatorBot | undefined {
    const indicatorBot = getBot(byID(indicator.id));

    if (indicatorBot) {
      return indicatorBot as ActivityIndicatorBot;
    }

    return undefined;
  }

  toDomain(indicatorBot: ActivityIndicatorBot): ActivityIndicator {
    return {
      id: indicatorBot.id,
      type: "ActivityIndicator",
      dataId: indicatorBot.tags.dataId,
    };
  }
}
