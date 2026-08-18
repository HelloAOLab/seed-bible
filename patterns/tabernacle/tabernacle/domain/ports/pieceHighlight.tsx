import type { ExperienceKey, ExperienceKeyMap } from "../models/experience";

export interface PieceHighlightPort {
  highlightPiece<E extends ExperienceKey>(
    experience: E,
    key: ExperienceKeyMap[E]
  ): void;
  stopHighlight(): void;
}
