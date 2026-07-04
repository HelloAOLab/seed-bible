import type { InfoLabelTailBot } from "bibleVizUtils.infrastructure.models.casualos";
import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { PieceMapperPort } from "./PieceMapper";

export class InfoLabelTailMapper {
  #pieceMapperPort: PieceMapperPort;

  constructor({ pieceMapperPort }: { pieceMapperPort: PieceMapperPort }) {
    this.#pieceMapperPort = pieceMapperPort;
  }

  toDomain(bot: InfoLabelTailBot): Piece<"InfoLabelTail"> {
    return this.#pieceMapperPort.toDomain(bot);
  }
  toInfrastructure(
    piece: Piece<"InfoLabelTail">
  ): InfoLabelTailBot | undefined {
    const bot = this.#pieceMapperPort.toInfrastructure(piece);
    if (bot) {
      return bot as InfoLabelTailBot;
    }
    return undefined;
  }
}
