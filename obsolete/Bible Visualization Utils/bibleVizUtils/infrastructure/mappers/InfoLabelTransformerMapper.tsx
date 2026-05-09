import type { InfoLabelTransformerBot } from "bibleVizUtils.infrastructure.models.casualos";
import type { Piece } from "bibleVizUtils.domain.models.canvas";
import { PieceMapper } from "./PieceMapper";

export class InfoLabelTransformerMapper {
  static toDomain(bot: InfoLabelTransformerBot): Piece<"InfoLabelTransformer"> {
    return PieceMapper.toDomain(bot);
  }
  static toInfrastructure(
    piece: Piece<"InfoLabelTransformer">
  ): InfoLabelTransformerBot | undefined {
    const bot = PieceMapper.toInfrastructure(piece);
    if (bot) {
      return bot as InfoLabelTransformerBot;
    }
    return undefined;
  }
}
