import type { BiblePiece } from "bibleVizUtils.domain.models.canvas";
import type { HexString } from "bibleVizUtils.domain.models.commonTypes";

export interface BibleTransformerState {
  initialPositionZ: number;
}

export interface BaseScripturePieceVisualState {
  initialScaleX: number;
  initialScaleY: number;
  initialScaleZ: number;
  hoveredScaleX: number;
  hoveredScaleY: number;
  hoveredFormOpacity: number;
  unhoveredFormOpacity: number;
  orginalColor: string;
  initialColor: string;
  labelTextColor: string;
  desiredScaleZ: number;
  desiredPositionZ: number;
}

export type TestamentVisualState = BaseScripturePieceVisualState;

export interface SectionVisualState extends BaseScripturePieceVisualState {
  initialExplodedViewScaleZ: number;
  desiredExplodedViewScaleZ: number;
  customColorRange?: number;
}

export type SectionBookVisualState = BaseScripturePieceVisualState;

export interface BookVisualState extends BaseScripturePieceVisualState {
  increasedIntensityStrokeColor: HexString;
}

export interface ChapterVisualState {
  highlightedColor: HexString;
  initialColor: HexString;
  expandedScaleZ: number;
  highlightedScaleZ: number;
}

export interface VisualStateMap {
  [BiblePiece.StackTransformer]: BibleTransformerState;
  [BiblePiece.StackTestament]: TestamentVisualState;
  [BiblePiece.StackSection]: SectionVisualState;
  [BiblePiece.StackSectionBook]: SectionBookVisualState;
  [BiblePiece.StackBook]: BookVisualState;
  [BiblePiece.StackChapter]: ChapterVisualState;
}
