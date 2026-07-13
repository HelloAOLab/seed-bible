import type { BibleTransformerBot } from "../models/stack";
import type { StackTransformer } from "../../domain/models/pieces";

export class StackTransformerMapper {
  toDomain(bot: BibleTransformerBot): StackTransformer {
    return { id: bot.id, type: bot.tags.type, bibleId: bot.tags.stackBibleId };
  }

  toInfrastructure(piece: StackTransformer): BibleTransformerBot | undefined {
    const bot = getBot(byID(piece.id));
    return bot ? (bot as BibleTransformerBot) : undefined;
  }
}
