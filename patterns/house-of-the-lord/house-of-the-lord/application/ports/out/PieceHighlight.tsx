import type {
  ExperienceKey,
  ExperienceKeyMap,
} from "../../../domain/models/experience";

export interface PieceHighlightAdapterPort {
  highlight<E extends ExperienceKey>(
    experience: E,
    key: ExperienceKeyMap[E]
  ): void;
  stopHighlight(): void;
}
