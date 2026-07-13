import { DistanceBetweenBotAndCamera } from "../../functions/casualos";
import type { Piece } from "../../../domain/models/canvas";
import type { PieceBot, PieceBotTags } from "../../models/casualos";

interface DimensionProviderPort {
  getCurrentDimension(): string;
}

interface PieceMapperPort {
  toInfrastructure(piece: Piece): PieceBot | undefined;
}

interface RenderOrderAdapterParams {
  dimensionProviderPort: DimensionProviderPort;
  pieceMapperPort: PieceMapperPort;
}

export class RenderOrderAdapter {
  #dimensionProviderPort: DimensionProviderPort;
  #pieceMapperPort: PieceMapperPort;

  constructor({
    dimensionProviderPort,
    pieceMapperPort,
  }: RenderOrderAdapterParams) {
    this.#dimensionProviderPort = dimensionProviderPort;
    this.#pieceMapperPort = pieceMapperPort;
  }

  setSortedRenderOrder(pieces: Piece[]): void {
    const dimension = this.#dimensionProviderPort.getCurrentDimension();
    const bots = pieces.flatMap((piece) => {
      const bot = this.#pieceMapperPort.toInfrastructure(piece);
      return bot ? [bot] : [];
    });

    const newOrder = bots.toSorted((a, b) => {
      const botAPositionZ =
        (a.masks[dimension + "Z"] as number | undefined) ??
        (a.tags[(dimension + "Z") as keyof PieceBotTags] as
          | number
          | undefined) ??
        0;
      const botBPositionZ =
        (b.masks[dimension + "Z"] as number | undefined) ??
        (b.tags[(dimension + "Z") as keyof PieceBotTags] as
          | number
          | undefined) ??
        0;
      if (botAPositionZ > botBPositionZ) {
        return 1;
      } else if (botAPositionZ < botBPositionZ) {
        return -1;
      } else {
        const botToCameraDistanceA = DistanceBetweenBotAndCamera({ bot: a });
        const botToCameraDistanceB = DistanceBetweenBotAndCamera({ bot: b });
        if (botToCameraDistanceA < botToCameraDistanceB) {
          return 1;
        } else if (botToCameraDistanceA > botToCameraDistanceB) {
          return -1;
        } else {
          return 0;
        }
      }
    });

    let i = -1;
    for (const bot of newOrder) {
      setTagMask(bot, "formRenderOrder", i);
      i--;
    }
  }
}
