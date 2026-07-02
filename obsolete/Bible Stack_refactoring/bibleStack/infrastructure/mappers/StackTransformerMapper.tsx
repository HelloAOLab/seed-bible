import type { BibleTransformerBot } from "bibleStack.models.stack";
import type { StackTransformer } from "bibleStack.domain.models.pieces";
import type { StackTransformerMapperPort } from "bibleStack.infrastructure.ports.stackPieceLifecycle";

export class StackTransformerMapper implements StackTransformerMapperPort {
  toDomain(bot: BibleTransformerBot): StackTransformer {
    return { id: bot.id, type: bot.tags.type, bibleId: bot.tags.stackBibleId };
  }

  toInfrastructure(piece: StackTransformer): BibleTransformerBot | undefined {
    const bot = getBot(byID(piece.id));
    return bot ? (bot as BibleTransformerBot) : undefined;
  }
}
