import type { LowerCoverBot } from "../models/stack";
import type { StackCover } from "../../domain/models/pieces";

export class StackLowerCoverMapper {
  toDomain(bot: LowerCoverBot): StackCover {
    return { id: bot.id, type: bot.tags.type, bibleId: bot.tags.stackBibleId };
  }

  toInfrastructure(piece: StackCover): LowerCoverBot | undefined {
    const bot = getBot(byID(piece.id));
    return bot ? (bot as LowerCoverBot) : undefined;
  }
}
