import type { PieceBot } from "bibleVizUtils.infrastructure.models.casualos";
import type { LabelablePiece } from "bibleVizUtils.domain.ports.label";

export class LabelablePieceMapper {
  static toDomain<P extends PieceBot>(
    bot: P
  ): LabelablePiece<P["tags"]["type"]> {
    return {
      id: bot.id,
      type: bot.tags.type,
    };
  }

  static toInfrastructure(piece: LabelablePiece): PieceBot | undefined {
    const pieceBot = getBot(byID(piece.id));
    if (pieceBot) {
      return pieceBot as PieceBot;
    }
    return undefined;
  }
}
