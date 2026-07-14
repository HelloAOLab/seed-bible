import type { BaseRelocationEvent } from "../../domain/models/canvas";
import type { BaseRelocationEvent as BaseRelocationEventConfig } from "../models/casualos";
import type { PieceMapperPort } from "./PieceMapper";

export interface MaperParams {
  pieceMapperPort: PieceMapperPort;
  getDimension: () => string;
}

export class RelocationEventMapper {
  #pieceMapperPort: MaperParams["pieceMapperPort"];
  #getDimension: MaperParams["getDimension"];

  constructor({ pieceMapperPort, getDimension }: MaperParams) {
    this.#pieceMapperPort = pieceMapperPort;
    this.#getDimension = getDimension;
  }

  toDomain(event: BaseRelocationEventConfig): BaseRelocationEvent {
    return {
      piece: this.#pieceMapperPort.toDomain(event.bot),
      to: {
        piece: this.#pieceMapperPort.toDomain(event.to.bot),
        x: event.to.x,
        y: event.to.y,
      },
      from: {
        x: event.from.x,
        y: event.from.y,
      },
    };
  }

  toInfrastructure(event: BaseRelocationEvent): BaseRelocationEventConfig {
    const dimension = this.#getDimension();
    const bot = this.#pieceMapperPort.toInfrastructure(event.piece);
    const botTo = this.#pieceMapperPort.toInfrastructure(event.to.piece);

    if (!bot) {
      throw new Error(
        `DraggingEventMapper: bot not found at toInfrastructure.`
      );
    }
    if (!botTo) {
      throw new Error(
        `DraggingEventMapper: botTo not found at toInfrastructure.`
      );
    }

    return {
      bot,
      to: { bot: botTo, x: event.to.x, y: event.to.y, dimension },
      from: { ...event.from, dimension },
    };
  }
}
