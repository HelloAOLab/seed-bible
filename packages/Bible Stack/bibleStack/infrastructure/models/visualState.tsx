import type { BiblePiece } from "bibleVizUtils.domain.models.canvas";

export interface BibleTransformerState {
  initialPositionZ: number;
}

export interface TestamentVisualState {
  orginalColor: string;
  initialColor: string;
  labelTextColor: string;
  initialScaleX: number;
  hoveredScaleX: number;
  initialScaleY: number;
  hoveredScaleY: number;
  initialScaleZ: number;
  desiredScaleZ: number;
  desiredPositionZ: number;
}

export interface VisualStateMap {
  [BiblePiece.StackTransformer]: BibleTransformerState;
  [BiblePiece.StackTestament]: TestamentVisualState;
}
