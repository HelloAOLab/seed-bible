import { BiblePieces } from "../../domain/models/canvas";
import type { HexString } from "../../domain/models/commonTypes";

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

export interface ChapterVisualState extends Pick<
  BaseScripturePieceVisualState,
  "initialColor" | "initialScaleX" | "initialScaleZ" | "initialScaleY"
> {
  highlightedColor: HexString;
  expandedScaleZ: number;
  highlightedScaleZ: number;
  selectedColor: HexString;
  selectedScaleY: number;
}

export interface VersesBundleVisualState {
  desiredScaleZ: number;
  initialColor: string;
}

export interface VerseVisualState {
  initialColor: string;
}

export interface VisualStateMap {
  [BiblePieces.StackTransformer]: BibleTransformerState;
  [BiblePieces.StackTestament]: TestamentVisualState;
  [BiblePieces.StackSection]: SectionVisualState;
  [BiblePieces.StackSectionShadow]: SectionShadowVisualState;
  [BiblePieces.StackSectionBook]: SectionBookVisualState;
  [BiblePieces.StackBook]: BookVisualState;
  [BiblePieces.StackChapter]: ChapterVisualState;
  [BiblePieces.VersesBundle]: VersesBundleVisualState;
  [BiblePieces.Verse]: VerseVisualState;
}
