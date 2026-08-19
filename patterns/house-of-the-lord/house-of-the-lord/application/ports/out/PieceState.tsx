import type {
  ExperienceKey,
  ExperienceKeyMap,
} from "../../../domain/models/experience";
import type { PieceVisibilityState } from "../../../domain/models/piece";

export interface PieceStatePort {
  applyMeshState<E extends ExperienceKey>(params: {
    experience: E;
    key: ExperienceKeyMap[E];
    state: PieceVisibilityState;
  }): Promise<void>;
}

export interface PieceStateConfigProviderPort {
  getPiecesChapterState<E extends ExperienceKey>({
    experienceKey,
    bookId,
    chapter,
  }: {
    experienceKey: E;
    bookId: string;
    chapter: number;
  }): { [K in ExperienceKeyMap[E]]?: PieceVisibilityState };
}
