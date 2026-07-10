import type { BibleTransformerBot } from "../models/stack";
import type { StackTransformer } from "../../domain/models/pieces";
import type { StackTransformerMapperPort } from "../ports/stackPieceLifecycle";

export class StackTransformerMapper implements StackTransformerMapperPort {
  toDomain(bot: BibleTransformerBot): StackTransformer {
    return { id: bot.id, type: bot.tags.type, bibleId: bot.tags.stackBibleId };
  }

  toInfrastructure(piece: StackTransformer): BibleTransformerBot | undefined {
    const bot = getBot(byID(piece.id));
    return bot ? (bot as BibleTransformerBot) : undefined;
  }
}
