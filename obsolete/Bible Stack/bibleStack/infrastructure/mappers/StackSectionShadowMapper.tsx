import type { SectionShadowBot } from "bibleStack.models.stack";
import type { Piece } from "bibleVizUtils.domain.models.canvas";

export class StackSectionShadowMapper {
  toDomain(bot: SectionShadowBot): Piece<"StackSectionShadow"> {
    return { id: bot.id, type: bot.tags.type };
  }

  toInfrastructure(
    piece: Piece<"StackSectionShadow">
  ): SectionShadowBot | undefined {
    const bot = getBot(byID(piece.id));
    return bot ? (bot as SectionShadowBot) : undefined;
  }
}
