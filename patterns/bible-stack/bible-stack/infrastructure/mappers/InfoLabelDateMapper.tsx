import type { InfoLabelDateBot } from "../models/casualos";
import type { Piece } from "../../domain/models/canvas";
import type { PieceMapperPort } from "./PieceMapper";

export class InfoLabelDateMapper {
  #pieceMapperPort: PieceMapperPort;

  constructor({ pieceMapperPort }: { pieceMapperPort: PieceMapperPort }) {
    this.#pieceMapperPort = pieceMapperPort;
  }

  toDomain(bot: InfoLabelDateBot): Piece<"InfoLabelDate"> {
    return this.#pieceMapperPort.toDomain(bot);
  }
  toInfrastructure(
    piece: Piece<"InfoLabelDate">
  ): InfoLabelDateBot | undefined {
    const bot = this.#pieceMapperPort.toInfrastructure(piece);
    if (bot) {
      return bot as InfoLabelDateBot;
    }
    return undefined;
  }
}
