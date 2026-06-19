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

export interface BaseBookVisualState extends BaseScripturePieceVisualState {
  chapterColumns: number;
  chapterRows: number;
  explodedViewSelectedScaleZ: number;
  explodedViewPosition: { x: number; y: number; z: number };
  singleBooksScales: { x: number; y: number };
  explodedViewCustomScale?: { x: number; y: number };
}

export type SectionBookVisualState = BaseBookVisualState;

export interface SectionShadowVisualState {
  desiredPositionZ: number;
  desiredScaleZ: number;
}

export interface BookVisualState extends BaseBookVisualState {
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
  [BiblePiece.StackSectionShadow]: SectionShadowVisualState;
  [BiblePiece.StackSectionBook]: SectionBookVisualState;
  [BiblePiece.StackBook]: BookVisualState;
  [BiblePiece.StackChapter]: ChapterVisualState;
}
