import type { InfoLabelTransformerBot } from "../models/casualos";
import type { Piece } from "../../domain/models/canvas";
import type { PieceMapperPort } from "./PieceMapper";

export class InfoLabelTransformerMapper {
  #pieceMapperPort: PieceMapperPort;

  constructor({ pieceMapperPort }: { pieceMapperPort: PieceMapperPort }) {
    this.#pieceMapperPort = pieceMapperPort;
  }

  toDomain(bot: InfoLabelTransformerBot): Piece<"InfoLabelTransformer"> {
    return this.#pieceMapperPort.toDomain(bot);
  }
  toInfrastructure(
    piece: Piece<"InfoLabelTransformer">
  ): InfoLabelTransformerBot | undefined {
    const bot = this.#pieceMapperPort.toInfrastructure(piece);
    if (bot) {
      return bot as InfoLabelTransformerBot;
    }
    return undefined;
  }
}
