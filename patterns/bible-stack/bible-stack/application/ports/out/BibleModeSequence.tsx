import type { StackCrossLine } from "../../../domain/models/pieces";

export interface BibleModeSequencePort {
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
