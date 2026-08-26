import type { PiecesProviderPort } from "../../../application/ports/out/piecePosition";
import type {
  ExperienceKey,
  ExperienceKeyMap,
} from "../../../domain/models/experience";
import type { Piece } from "../../../domain/models/piece";

type PiecesMap = {
  [E in ExperienceKey]: { [K in ExperienceKeyMap[E]]: Piece<K> };
};

interface ProviderParams {
  piecesMap: PiecesMap;
}

export class PiecesProvider implements PiecesProviderPort {
  #piecesMap: ProviderParams["piecesMap"];

  constructor({ piecesMap }: ProviderParams) {
    this.#piecesMap = piecesMap;
  }

  getPieces<E extends ExperienceKey>(key: E): Piece<ExperienceKeyMap[E]>[] {
    return Object.values(this.#piecesMap[key]);
  }

  getPiece<E extends ExperienceKey, K extends ExperienceKeyMap[E]>(
    experienceID: E,
    key: K
  ): PiecesMap[E][K] {
    return this.#piecesMap[experienceID][key];
  }
}
