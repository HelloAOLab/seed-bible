import type {
  ExperienceKey,
  ExperienceKeyMap,
} from "../../../domain/models/experience";

export interface PieceCatalogGroup<E extends ExperienceKey = ExperienceKey> {
  id: string;
  label: string;
  startsFolded: boolean;
  keys: readonly ExperienceKeyMap[E][];
}

export interface PieceCatalogPort {
  getGroups<E extends ExperienceKey>(experience: E): PieceCatalogGroup<E>[];
  getPieceLabel<E extends ExperienceKey>(
    experience: E,
    key: ExperienceKeyMap[E]
  ): string;
}
