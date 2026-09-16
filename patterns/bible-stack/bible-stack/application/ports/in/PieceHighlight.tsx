import type {
  HighlightPacing,
  HighlightRequestSource,
  UnhighlightRequestSource,
} from "../../../domain/models/pieces";
import type { Piece } from "../../../domain/models/canvas";
import type { HighlightIntensity } from "../../../domain/models/highlight";

export interface PieceHighlighterPort {
  tryHighlightPiece: (params: {
    piece:
      | Piece<"StackTestament">
      | Piece<"StackSection">
      | Piece<"StackSectionBook">
      | Piece<"StackBook">
      | Piece<"StackChapter">;
    source: HighlightRequestSource;
    scheduledUnhighlightData?: {
      delay: number;
      pacing?: HighlightPacing;
    };
    pacing?: HighlightPacing;
  }) => Promise<void>;
  tryUnhighlightPiece: (params: {
    piece: Piece<
      | "StackTestament"
      | "StackSection"
      | "StackSectionBook"
      | "StackBook"
      | "StackChapter"
    >;
    source: UnhighlightRequestSource;
    pacing: HighlightPacing;
    delay?: number;
  }) => Promise<void>;
  isUnhighlightScheduled: (piece: Piece) => boolean;
  changeHighlightIntensity: ({
    piece,
    intensity,
  }: {
    piece: Piece<
      | "StackTestament"
      | "StackSection"
      | "StackSectionBook"
      | "StackBook"
      | "StackChapter"
    >;
    intensity: HighlightIntensity;
  }) => void;
  clearScheduledUnhighlights(): void;
  clearHighlightedPieces(): void;
  forgetPiece(piece: Piece): void;
  unhighlightBiblePieces(
    bibleId: string,
    pacing?: HighlightPacing
  ): Promise<void>;
}
