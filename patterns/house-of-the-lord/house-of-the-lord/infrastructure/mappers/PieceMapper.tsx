import type { Piece, PieceKey } from "../../domain/models/piece";
import type { PieceBotTypeMap } from "../models/casualos";

export class PieceMapper {
  toDomain<K extends PieceKey>(bot: PieceBotTypeMap[K]): Piece<K> {
    return {
      id: bot.id,
      key: bot.tags.key as K,
    };
  }
  toInfrastructure<K extends PieceKey>(piece: Piece<K>): PieceBotTypeMap[K] {
    const bot = getBot(byID(piece.id), byTag("key", piece.key)) as
      | PieceBotTypeMap[K]
      | undefined;
    if (!bot) {
      throw new Error("PieceMapper: bot not found at toInfrastructure.");
    }
    return bot;
  }
}
