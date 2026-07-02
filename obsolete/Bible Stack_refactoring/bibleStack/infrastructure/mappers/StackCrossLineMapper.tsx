import type { CrossLineBot } from "bibleStack.models.stack";
import type { StackCrossLine } from "bibleStack.domain.models.pieces";
import type { StackCrossLineMapperPort } from "bibleStack.infrastructure.ports.stackPieceLifecycle";

export class StackCrossLineMapper implements StackCrossLineMapperPort {
  toDomain(bot: CrossLineBot): StackCrossLine {
    return { id: bot.id, type: bot.tags.type, bibleId: bot.tags.stackBibleId };
  }

  toInfrastructure(piece: StackCrossLine): CrossLineBot | undefined {
    const bot = getBot(byID(piece.id));
    return bot ? (bot as CrossLineBot) : undefined;
  }
}
