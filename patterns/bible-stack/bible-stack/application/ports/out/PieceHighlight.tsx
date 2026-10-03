import { type Piece } from "../../../domain/models/canvas";
import type { HighlightPacing } from "../../../domain/models/pieces";

export type StackPieceUnion =
  | Piece<"StackTestament">
  | Piece<"StackSection">
  | Piece<"StackSectionBook">
  | Piece<"StackBook">
  | Piece<"StackChapter">;

export interface PieceHighlightPort {
  interruptSequence(piece: StackPieceUnion): void;
  highlight(piece: StackPieceUnion, pacing?: HighlightPacing): Promise<void>;
  rehighlight(piece: StackPieceUnion, pacing?: HighlightPacing): Promise<void>;
  unhighlight(piece: StackPieceUnion, pacing?: HighlightPacing): Promise<void>;
  increaseIntensity(piece: StackPieceUnion): void;
  decreaseIntensity(piece: StackPieceUnion): void;
}
