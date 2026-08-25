import type { Piece } from "../../../domain/models/canvas";
import type { StackCrossLine } from "../../../domain/models/pieces";
import type { StackPieceDataMap } from "../pieces";

export interface BibleModeSequenceAdapterPort {
  showToggleAttemptFeedback(params: {
    crossVerticalLine: StackCrossLine;
    crossHorizontalLine: StackCrossLine;
  }): Promise<void[]>;
  finishToggleAttemptFeedback(params: {
    crossVerticalLine: StackCrossLine;
    crossHorizontalLine: StackCrossLine;
  }): void;
  showAttemptStopFeedback(params: {
    crossVerticalLine: StackCrossLine;
    crossHorizontalLine: StackCrossLine;
  }): Promise<void>;
}

export interface PieceDataRepositoryPort {
  getPieceData<K extends "StackTestament" | "StackSection">(
    piece: Piece<K>
  ): StackPieceDataMap[K] | undefined;
}
