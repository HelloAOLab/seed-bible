import type { BookBot } from "bibleStack.models.stack";
import type { Piece } from "bibleVizUtils.domain.models.canvas";

export class StackBookMapper {
  toDomain(bot: BookBot): Piece<"StackBook" | "StackSectionBook"> {
    return { id: bot.id, type: bot.tags.type };
  }

  toInfrastructure(piece: Piece<"StackBook">): BookBot | undefined {
    const bot = getBot(byID(piece.id));
    return bot ? (bot as BookBot) : undefined;
  }
}
