import type { CoverBot } from "../models/stack";
import type { StackCover } from "../../domain/models/pieces";

export class StackCoverMapper {
  toDomain(bot: CoverBot): StackCover {
    return { id: bot.id, type: bot.tags.type, bibleId: bot.tags.stackBibleId };
  }

  toInfrastructure(piece: StackCover): CoverBot | undefined {
    const bot = getBot(byID(piece.id));
    return bot ? (bot as CoverBot) : undefined;
  }
}
