import type { Piece, PieceKey } from "../../domain/models/piece";
import type { PieceBot } from "../models/casualos";

export class PieceMapper {
  toDomain<K extends PieceKey>(bot: PieceBot<K>): Piece<K> {
    return {
      id: bot.id,
      key: bot.tags.key,
    };
  }
}
