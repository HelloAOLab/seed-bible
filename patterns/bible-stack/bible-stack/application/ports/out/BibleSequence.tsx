import type { Piece } from "../../../domain/models/canvas";
import type { StackBibleData } from "../../../domain/entities/StackBibleData";
import type { StackCover, StackCrossLine } from "../../../domain/models/pieces";
import type { StackPresenceNavigationPacing } from "../../../domain/models/userPresence";

export interface BibleSequencePort {
  displayCrackOpenBibleSequence(
    bibleData: StackBibleData,
    arePiecesDraggable: boolean
  ): Promise<void>;
  displayCloseBibleSequence(params: {
    lowerCover: StackCover;
    upperCover: StackCover;
    verticalLine: StackCrossLine;
    horizontalLine: StackCrossLine;
    pacing?: StackPresenceNavigationPacing;
    piecesToCollapse: (
      | Piece<"StackTestament">
      | Piece<"StackSection">
      | Piece<"StackSectionBook">
      | Piece<"StackBook">
      | Piece<"StackSectionShadow">
    )[];
  }): Promise<void>;
  displayOpenBibleSequence(params: {
    lowerCover: StackCover;
    upperCover: StackCover;
    verticalLine: StackCrossLine;
    horizontalLine: StackCrossLine;
    pacing?: StackPresenceNavigationPacing;
    bibleData: StackBibleData;
    arePiecesDraggable: boolean;
  }): Promise<void>;
}
