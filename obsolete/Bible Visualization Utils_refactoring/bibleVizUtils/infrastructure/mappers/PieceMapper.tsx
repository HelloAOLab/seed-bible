import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { PieceBot } from "../models/casualos";

export interface PieceMapperPort {
  toDomain<P extends PieceBot>(bot: P): Piece<P["tags"]["type"]>;
  toInfrastructure(piece: Piece): PieceBot | undefined;
}

export class PieceMapper implements PieceMapperPort {
  toDomain<P extends PieceBot>(bot: P): Piece<P["tags"]["type"]> {
    return {
      id: bot.id,
      type: bot.tags.type,
    };
  }

  toInfrastructure(piece: Piece): PieceBot | undefined {
    const pieceBot = getBot(byID(piece.id));
    if (pieceBot) {
      return pieceBot as PieceBot;
    }
    return undefined;
  }
}
