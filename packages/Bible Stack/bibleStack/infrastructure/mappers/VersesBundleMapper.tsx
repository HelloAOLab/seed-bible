import type { VersesBundleBot } from "bibleStack.models.stack";
import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { VersesBundleMapperPort } from "@packages/Bible Stack/bibleStack/application/ports/out/ChapterSelection";

export class VersesBundleMapper implements VersesBundleMapperPort {
  toDomain(bot: VersesBundleBot): Piece<"VersesBundle"> {
    return { id: bot.id, type: bot.tags.type };
  }

  toInfrastructure(piece: Piece<"VersesBundle">): VersesBundleBot | undefined {
    const bot = getBot(byID(piece.id));
    return bot ? (bot as VersesBundleBot) : undefined;
  }
}
