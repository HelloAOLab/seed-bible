import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { VersesBundleBot } from "bibleStack.models.stack";

export interface PieceMapperPort {
  toDomain: (bot: VersesBundleBot) => Piece<"VersesBundle">;
}
