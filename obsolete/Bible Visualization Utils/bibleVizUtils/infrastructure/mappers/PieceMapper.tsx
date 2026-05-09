import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { PieceBot } from "../models/casualos";

export class PieceMapper {
  static toDomain<P extends PieceBot>(bot: P): Piece<P["tags"]["type"]> {
    return {
      id: bot.id,
      type: bot.tags.type,
    };
  }

  static toInfrastructure(piece: Piece): PieceBot | undefined {
    const pieceBot = getBot(byID(piece.id));
    if (pieceBot) {
      return pieceBot as PieceBot;
    }
    return undefined;
  }
}
