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

export interface LoggerPort {
  // eslint-disable-next-line
  error: (message: string, data?: any) => void;
  // eslint-disable-next-line
  warn: (message: string, data?: any) => void;
  // eslint-disable-next-line
  log: (message: string, data?: any) => void;
}

export interface PieceDataRepositoryPort {
  getPieceData<K extends "StackTestament" | "StackSection">(
    piece: Piece<K>
  ): StackPieceDataMap[K] | undefined;
}
