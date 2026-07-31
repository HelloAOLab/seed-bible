import type { VerseBot } from "bibleStack.models.stack";
import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { VerseMapperPort } from "@packages/Bible Stack/bibleStack/application/ports/out/ChapterSelection";

export class VerseMapper implements VerseMapperPort {
  toDomain(bot: VerseBot): Piece<"Verse"> {
    return { id: bot.id, type: bot.tags.type };
  }

  toInfrastructure(piece: Piece<"Verse">): VerseBot | undefined {
    const bot = getBot(byID(piece.id));
    return bot ? (bot as VerseBot) : undefined;
  }
}
