import type { BibleShadowBot } from "../models/stack";
import type { StackShadow } from "../../domain/models/pieces";

export class StackShadowMapper {
  toDomain(bot: BibleShadowBot): StackShadow {
    return { id: bot.id, type: bot.tags.type, bibleId: bot.tags.stackBibleId };
  }

  toInfrastructure(piece: StackShadow): BibleShadowBot | undefined {
    const bot = getBot(byID(piece.id));
    return bot ? (bot as BibleShadowBot) : undefined;
  }
}
