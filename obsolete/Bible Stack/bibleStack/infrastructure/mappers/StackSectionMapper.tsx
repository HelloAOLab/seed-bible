import type { SectionBot } from "bibleStack.models.stack";
import type { Piece } from "bibleVizUtils.domain.models.canvas";

export class StackSectionMapper {
  toDomain(bot: SectionBot): Piece<"StackSection"> {
    return { id: bot.id, type: bot.tags.type };
  }

  toInfrastructure(piece: Piece<"StackSection">): SectionBot | undefined {
    const bot = getBot(byID(piece.id));
    return bot ? (bot as SectionBot) : undefined;
  }
}
