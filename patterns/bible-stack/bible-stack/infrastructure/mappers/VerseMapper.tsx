import type { VerseBot } from "../models/stack";
import type { Piece } from "../../domain/models/canvas";

export class VerseMapper {
  toDomain(bot: VerseBot): Piece<"Verse"> {
    return { id: bot.id, type: bot.tags.type };
  }

  toInfrastructure(piece: Piece<"Verse">): VerseBot | undefined {
    const bot = getBot(byID(piece.id));
    return bot ? (bot as VerseBot) : undefined;
  }
}
