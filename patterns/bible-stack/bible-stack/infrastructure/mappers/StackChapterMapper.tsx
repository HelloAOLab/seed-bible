import type { ChapterBot } from "../models/stack";
import type { Piece } from "../../domain/models/canvas";

export class StackChapterMapper {
  toDomain(bot: ChapterBot): Piece<"StackChapter"> {
    return { id: bot.id, type: bot.tags.type };
  }

  toInfrastructure(piece: Piece<"StackChapter">): ChapterBot | undefined {
    const bot = getBot(byID(piece.id));
    return bot ? (bot as ChapterBot) : undefined;
  }
}
