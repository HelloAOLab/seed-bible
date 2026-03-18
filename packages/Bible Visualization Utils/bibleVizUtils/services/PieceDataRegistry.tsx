import type { Bot } from "../../../../typings/AuxLibraryDefinitions";
import { type ObjectPoolTagsType } from "bibleVizUtils.models.canvas";

export type GetPieceDataFunction = (params: { piece: Bot }) => any;

export class PieceDataRegistry {
  static #providers = new Map<ObjectPoolTagsType, GetPieceDataFunction>();

  static registerProvider(
    poolTag: ObjectPoolTagsType,
    providerFunction: GetPieceDataFunction
  ): void {
    this.#providers.set(poolTag, providerFunction);
  }

  static getPieceData(piece: Bot): any {
    const poolTag = piece.tags.poolTag as ObjectPoolTagsType;

    if (!poolTag) {
      console.warn(`No pooltag defined for piece`, { piece });
      return undefined;
    }

    const provider = this.#providers.get(poolTag);

    if (!provider) {
      console.warn(`No PieceData provider registered for poolTag: ${poolTag}`);
      return undefined;
    }

    return provider({ piece });
  }
}
