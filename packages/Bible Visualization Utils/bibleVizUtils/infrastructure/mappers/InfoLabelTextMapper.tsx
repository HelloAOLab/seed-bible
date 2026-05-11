import type { InfoLabelTextBot } from "bibleVizUtils.infrastructure.models.casualos";
import type { Piece } from "bibleVizUtils.domain.models.canvas";
import { PieceMapper } from "./PieceMapper";

export class InfoLabelTextMapper {
  static toDomain(bot: InfoLabelTextBot): Piece<"InfoLabelText"> {
    return PieceMapper.toDomain(bot);
  }
  static toInfrastructure(
    piece: Piece<"InfoLabelText">
  ): InfoLabelTextBot | undefined {
    const bot = PieceMapper.toInfrastructure(piece);
    if (bot) {
      return bot as InfoLabelTextBot;
    }
    return undefined;
  }
}
