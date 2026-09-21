import type {
  ExperienceKey,
  ExperienceKeyMap,
} from "../../../domain/models/experience";
import type { Piece } from "../../../domain/models/piece";

export type PiecesMap = {
  [E in ExperienceKey]: { [K in ExperienceKeyMap[E]]: Piece<K> };
};

export interface PiecesProviderAdapterPort {
  getPieces: <E extends ExperienceKey>(key: E) => Piece<ExperienceKeyMap[E]>[];
  getPiece<E extends ExperienceKey, K extends ExperienceKeyMap[E]>(
    experienceID: E,
    key: K
  ): PiecesMap[E][K];
}
