import type { SectionBot } from "../models/stack";
import type { Piece } from "../../domain/models/canvas";

export class StackSectionMapper {
  toDomain(bot: SectionBot): Piece<"StackSection"> {
    return { id: bot.id, type: bot.tags.type };
  }

  toInfrastructure(piece: Piece<"StackSection">): SectionBot | undefined {
    const bot = getBot(byID(piece.id));
    return bot ? (bot as SectionBot) : undefined;
  }
}
