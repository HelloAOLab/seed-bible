import type { InfoLabelTailBot } from "bibleVizUtils.infrastructure.models.casualos";
import type { Piece } from "bibleVizUtils.domain.models.canvas";
import { PieceMapper } from "./PieceMapper";

export class InfoLabelTailMapper {
  static toDomain(bot: InfoLabelTailBot): Piece<"InfoLabelTail"> {
    return PieceMapper.toDomain(bot);
  }
  static toInfrastructure(
    piece: Piece<"InfoLabelTail">
  ): InfoLabelTailBot | undefined {
    const bot = PieceMapper.toInfrastructure(piece);
    if (bot) {
      return bot as InfoLabelTailBot;
    }
    return undefined;
  }
}
