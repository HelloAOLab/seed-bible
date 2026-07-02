import type { LowerCoverBot } from "bibleStack.models.stack";
import type { StackCover } from "bibleStack.domain.models.pieces";
import type { StackLowerCoverMapperPort } from "bibleStack.infrastructure.ports.stackPieceLifecycle";

export class StackLowerCoverMapper implements StackLowerCoverMapperPort {
  toDomain(bot: LowerCoverBot): StackCover {
    return { id: bot.id, type: bot.tags.type, bibleId: bot.tags.stackBibleId };
  }

  toInfrastructure(piece: StackCover): LowerCoverBot | undefined {
    const bot = getBot(byID(piece.id));
    return bot ? (bot as LowerCoverBot) : undefined;
  }
}
