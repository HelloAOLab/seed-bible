import type { InfoLabelDateBot } from "bibleVizUtils.infrastructure.models.casualos";
import type { Piece } from "bibleVizUtils.domain.models.canvas";
import { PieceMapper } from "./PieceMapper";

export class InfoLabelDateMapper {
  static toDomain(bot: InfoLabelDateBot): Piece<"InfoLabelDate"> {
    return PieceMapper.toDomain(bot);
  }
  static toInfrastructure(
    piece: Piece<"InfoLabelDate">
  ): InfoLabelDateBot | undefined {
    const bot = PieceMapper.toInfrastructure(piece);
    if (bot) {
      return bot as InfoLabelDateBot;
    }
    return undefined;
  }
}
