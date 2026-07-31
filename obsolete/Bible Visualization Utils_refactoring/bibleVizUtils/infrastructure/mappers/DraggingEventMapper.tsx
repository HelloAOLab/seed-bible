import type { DraggingEvent as InfrastructureDraggingEvent } from "bibleVizUtils.infrastructure.models.casualos";
import type { DraggingEvent as DomainDraggingEvent } from "bibleVizUtils.domain.models.canvas";
import type { DraggingEventMapperParams } from "bibleVizUtils.infrastructure.ports.draggingEventMapper";

export class DraggingEventMapper {
  #pieceMapperPort: DraggingEventMapperParams["pieceMapperPort"];
  #dimensionPort: DraggingEventMapperParams["dimensionPort"];

  constructor({ pieceMapperPort, dimensionPort }: DraggingEventMapperParams) {
    this.#pieceMapperPort = pieceMapperPort;
    this.#dimensionPort = dimensionPort;
  }

  toDomain(event: InfrastructureDraggingEvent): DomainDraggingEvent {
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

  toInfrastructure(event: DomainDraggingEvent): InfrastructureDraggingEvent {
    const dimension = this.#dimensionPort.getCurrentDimension();
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
