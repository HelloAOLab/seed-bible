import type {
  ExperienceKey,
  ExperienceKeyMap,
} from "../../../domain/models/experience";
import { type PieceVisibilityState } from "../../../domain/models/piece";
import type { PieceStateConfigProviderPort } from "../../../application/ports/out/PieceState";
import { CHAPTER_STATE_MAP } from "./chapterStateMap";

export class PieceStateConfigProvider implements PieceStateConfigProviderPort {
  getPiecesChapterState<E extends ExperienceKey>({
    experienceKey,
    bookId,
    chapter,
  }: {
    experienceKey: E;
    bookId: string;
    chapter: number;
  }): {
    [K in ExperienceKeyMap[E]]?: PieceVisibilityState;
  } {
    const states = CHAPTER_STATE_MAP[experienceKey][bookId]?.[chapter] ?? {};
    return states;
  }

  getPieceChapterState<E extends ExperienceKey>({
    experienceKey,
    bookId,
    chapter,
    pieceKey,
  }: {
    experienceKey: E;
    bookId: string;
    chapter: number;
    pieceKey: ExperienceKeyMap[E];
  }): PieceVisibilityState | undefined {
    const states = this.getPiecesChapterState({
      experienceKey: experienceKey,
      bookId,
      chapter,
    });
    return states[pieceKey];
  }
}
