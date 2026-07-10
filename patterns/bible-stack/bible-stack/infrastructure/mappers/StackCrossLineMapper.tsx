import type { CrossLineBot } from "../models/stack";
import type { StackCrossLine } from "../../domain/models/pieces";
import type { StackCrossLineMapperPort } from "../ports/stackPieceLifecycle";

export class StackCrossLineMapper implements StackCrossLineMapperPort {
  toDomain(bot: CrossLineBot): StackCrossLine {
    return { id: bot.id, type: bot.tags.type, bibleId: bot.tags.stackBibleId };
  }

  toInfrastructure(piece: StackCrossLine): CrossLineBot | undefined {
    const bot = getBot(byID(piece.id));
    return bot ? (bot as CrossLineBot) : undefined;
  }
}
