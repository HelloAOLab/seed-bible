import type { ActivityNotification } from "../../domain/models/canvas";
import type { ActivityNotificationBot } from "../models/stack";

export class ActivityNotificationMapper {
  static toDomain(bot: ActivityNotificationBot): ActivityNotification {
    return {
      id: bot.id,
      type: "ActivityNotification",
    };
  }
  static toInfrastructure(
    indicator: ActivityNotification
  ): ActivityNotificationBot | undefined {
    const indicatorBot = getBot(byID(indicator.id));

    if (indicatorBot) {
      return indicatorBot as ActivityNotificationBot;
    }

    return undefined;
  }
}
