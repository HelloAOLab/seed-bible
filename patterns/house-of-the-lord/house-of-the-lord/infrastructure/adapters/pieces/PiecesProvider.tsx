import type {
  PiecesMap,
  PiecesProviderAdapterPort,
} from "../../../application/ports/out/PiecesProviderAdapter";
import type {
  ExperienceKey,
  ExperienceKeyMap,
} from "../../../domain/models/experience";
import type { Piece } from "../../../domain/models/piece";

interface ProviderParams {
  piecesMap: PiecesMap;
}

export class PiecesProvider implements PiecesProviderAdapterPort {
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
