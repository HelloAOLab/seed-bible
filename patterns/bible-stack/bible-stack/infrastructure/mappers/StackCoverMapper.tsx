import type { CoverBot } from "../models/stack";
import type { StackCover } from "../../domain/models/pieces";
import type { StackCoverMapperPort } from "../ports/stackPieceLifecycle";

export class StackCoverMapper implements StackCoverMapperPort {
  toDomain(bot: CoverBot): StackCover {
    return { id: bot.id, type: bot.tags.type, bibleId: bot.tags.stackBibleId };
  }

  toInfrastructure(piece: StackCover): CoverBot | undefined {
    const bot = getBot(byID(piece.id));
    return bot ? (bot as CoverBot) : undefined;
  }
}
