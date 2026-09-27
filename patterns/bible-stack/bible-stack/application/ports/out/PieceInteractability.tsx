import type { StackBibleData } from "../../../domain/entities/StackBibleData";
import type { StackTestamentData } from "../../../domain/entities/StackTestamentData";
import type { Piece, PieceDataMap } from "../../../domain/models/canvas";

export interface BibleDataRepositoryPort {
  getAllBiblesData(): StackBibleData[];
}

export interface PieceDataRepositoryPort {
  getStandaloneTestaments(): StackTestamentData[];
  getPieceData<
    K extends
      | "StackTestament"
      | "StackSection"
      | "StackSectionBook"
      | "StackBook"
      | "StackChapter",
  >(
    piece: Piece<K>
  ): PieceDataMap[K] | undefined;
}

export interface PieceAdapterPort {
  anchorPiece(piece: Piece): void;
  unanchorPiece(piece: Piece): void;
  makeInteractable(piece: Piece): void;
  makeNonInteractable(piece: Piece): void;
}
