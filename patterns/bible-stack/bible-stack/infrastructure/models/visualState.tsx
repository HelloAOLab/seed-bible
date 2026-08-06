import type { Vector3 } from "../../../../pattern-typings/AuxLibraryDefinitions";
import { BiblePieces } from "../../domain/models/canvas";
import type { HexString } from "../../domain/models/commonTypes";
import type { Scales } from "../functions/layout";

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

export interface BaseBookVisualState extends Pick<
  BaseScripturePieceVisualState,
  | "orginalColor"
  | "hoveredFormOpacity"
  | "unhoveredFormOpacity"
  | "initialColor"
  | "labelTextColor"
  | "desiredScaleZ"
  | "desiredPositionZ"
> {
  chapterColumns: number;
  chapterRows: number;
  singleBooksScales: { x: number; y: number };
  hoveredScales: Scales;
}

export interface SectionBookVisualState extends BaseBookVisualState {
  unhoveredScales: Scales;
}

export interface SectionShadowVisualState {
  desiredPositionZ: number;
  desiredScaleZ: number;
}

export interface BookVisualState extends BaseBookVisualState {
  explodedViewSelectedScaleZ: number;
  explodedViewPosition: { x: number; y: number; z: number };
  increasedIntensityStrokeColor: HexString;
  explodedViewCustomScale?: { x: number; y: number };
  implodedScales: Scales;
  explodedScales: Scales;
  hoveredScales: Scales;
}

export interface ChapterVisualState extends Pick<
  BaseScripturePieceVisualState,
  "initialColor" | "initialScaleX" | "initialScaleZ" | "initialScaleY"
> {
  expandedScaleZ: number;
  highlightedScaleZ: number;
  selectedColor: HexString;
  selectedScaleY: number;
  highlightedColor: string;
}

export interface VersesBundleVisualState {
  desiredScaleZ: number;
  initialColor: string;
}

export interface VerseVisualState {
  initialColor: string;
}

export interface InfoLabelTransformerState {
  makesAttentionFeedback: boolean;
  targetOpacity: number;
  isInteractable: boolean;
}

export interface ShakeablePiece {
  initialPosition: Vector3;
}

export type InfoLabelDateState = ShakeablePiece;

export type InfoLabelTextState = ShakeablePiece;

export type InfoLabelTailState = ShakeablePiece;

export interface ActivityIndicatorState extends ShakeablePiece {
  targetOpacity: number;
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
  [BiblePieces.InfoLabelTransformer]: InfoLabelTransformerState;
  [BiblePieces.InfoLabelDate]: InfoLabelDateState;
  [BiblePieces.InfoLabelText]: InfoLabelTextState;
  [BiblePieces.InfoLabelTail]: InfoLabelTailState;
  [BiblePieces.ActivityIndicator]: ActivityIndicatorState;
}
