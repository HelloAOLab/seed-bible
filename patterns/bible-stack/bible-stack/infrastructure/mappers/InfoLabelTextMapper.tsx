import type { InfoLabelTextBot } from "../models/casualos";
import type { Piece } from "../../domain/models/canvas";
import type { PieceMapperPort } from "./PieceMapper";

export class InfoLabelTextMapper {
  #pieceMapperPort: PieceMapperPort;

  constructor({ pieceMapperPort }: { pieceMapperPort: PieceMapperPort }) {
    this.#pieceMapperPort = pieceMapperPort;
  }

  toDomain(bot: InfoLabelTextBot): Piece<"InfoLabelText"> {
    return this.#pieceMapperPort.toDomain(bot);
  }

  toInfrastructure(
    piece: Piece<"InfoLabelText">
  ): InfoLabelTextBot | undefined {
    const bot = this.#pieceMapperPort.toInfrastructure(piece);
    if (bot) {
      return bot as InfoLabelTextBot;
    }
    return undefined;
  }
}
