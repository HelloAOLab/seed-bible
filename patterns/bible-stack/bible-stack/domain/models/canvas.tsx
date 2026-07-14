import type { Span, Point2D, Point3D } from "./commonTypes";
import type { StackBookData } from "../entities/StackBookData";
import type { StackBibleData } from "../entities/StackBibleData";
import type { StackChapterData } from "../entities/StackChapterData";
import type { StackSectionData } from "../entities/StackSectionData";
import type { StackSectionBookData } from "../entities/StackSectionBookData";
import type { StackTestamentData } from "../entities/StackTestamentData";

export const BiblePieces = {
  StackTestament: "StackTestament",
  StackSection: "StackSection",
  StackSectionShadow: "StackSectionShadow",
  StackSectionBook: "StackSectionBook",
  StackBook: "StackBook",
  StackChapter: "StackChapter",
  VersesBundle: "VersesBundle",
  Verse: "Verse",
  StackCover: "StackCover",
  StackCrossLine: "StackCrossLine",
  StackTransformer: "StackTransformer",
  StackShadow: "StackShadow",
  ActivityIndicator: "ActivityIndicator",
  ActivityNotification: "ActivityNotification",
  InfoLabelTransformer: "InfoLabelTransformer",
  InfoLabelText: "InfoLabelText",
  InfoLabelTail: "InfoLabelTail",
  InfoLabelDate: "InfoLabelDate",
} as const;
export type BiblePiece = (typeof BiblePieces)[keyof typeof BiblePieces];

export interface Piece<T extends BiblePiece = BiblePiece> {
  id: string;
  type: T;
}

export interface PieceState {
  positionX: number;
  positionY: number;
  positionZ: number;
  sizeX: number;
  sizeY: number;
  sizeZ: number;
}

export interface SectionShadow extends Piece<"StackSectionShadow"> {
  sectionDataId: string;
}

export interface ActivityIndicator extends Piece<"ActivityIndicator"> {
  indicatorType: "regular" | "extraContent" | "extraBackground";
  index: number;
}

export type ActivityNotification = Piece<"ActivityNotification">;

export const BookShapes = {
  Regular: "Regular",
  ExplodedView: "ExplodedView",
  Selected: "Selected",
  RegularSelected: "RegularSelected",
  ExplodedViewCustomShape: "ExplodedViewCustomShape",
} as const;
export type BookShape = (typeof BookShapes)[keyof typeof BookShapes];

export interface BookLayout {
  x: Span;
  y: Span;
}

export interface ComputedGroupBookProperties {
  scale: Point2D;
  position: Point3D;
  layoutPosition: Point2D;
}

export interface PieceInfo {
  typeOfPiece: BiblePiece;
  key: string;
}

export interface ParentDataIds {
  stackBibleId?: string;
  stackTestamentId?: string;
  stackSectionId?: string;
  stackBookId?: string;
  stackSectionBookId?: string;
}
export type ParentDataId = keyof ParentDataIds;

export type StackAncestorType =
  | "StackBible"
  | "StackTestament"
  | "StackSection"
  | "StackSectionBook"
  | "StackBook";

export interface StackAncestor {
  id: string;
  type: StackAncestorType;
}

export const EnqueueChapterActions = {
  Select: "Select",
  Deselect: "Deselect",
} as const;
export type EnqueueChapterAction =
  (typeof EnqueueChapterActions)[keyof typeof EnqueueChapterActions];

export interface QueuedChapterData {
  bookData: StackBookData;
  chapterNumber: number;
  stackBibleId: StackBibleData["id"];
  action: EnqueueChapterAction;
  chapterData: StackChapterData;
}

export const CrossPositions = {
  Top: "Top",
  Middle: "Middle",
} as const;
export type CrossPosition =
  (typeof CrossPositions)[keyof typeof CrossPositions];

export const BibleVisualizationStates = {
  Regular: "Regular",
  Expanded: "Expanded",
} as const;
export type BibleVisualizationState =
  (typeof BibleVisualizationStates)[keyof typeof BibleVisualizationStates];

export const BibleTypes = {
  Default: "Default",
  PlatformerGame: "PlatformerGame",
} as const;
export type BibleType = (typeof BibleTypes)[keyof typeof BibleTypes];

export const BibleStates = {
  Closed: "Closed",
  Open: "Open",
} as const;
export type BibleState = (typeof BibleStates)[keyof typeof BibleStates];

export interface StackTestamentCreationParams {
  arrangementIndex: number;
  testamentIndex: number;
}

export interface StackSectionBaseCreationParams extends StackTestamentCreationParams {
  sectionIndex: number;
}

export interface StackSectionCreationParams extends StackSectionBaseCreationParams {
  amountOfChaptersInSection: number;
}

export interface StackBookCreationParams extends StackSectionBaseCreationParams {
  levelIndex: number;
  bookIndex: number;
  bookLevelIndex: number;
  levelsLenght: number;
}

export interface ChapterCreationParams {
  bookId: string;
}

export interface VersesBundleCreationParams extends ChapterCreationParams {
  start: number;
  count: number;
  chapter: number;
}

export interface VerseCreationParams extends VersesBundleCreationParams {
  verseIndex: number;
}

export const PieceSelectionSources = {
  UserSelection: "UserSelection",
  StackUserPresenceUpdate: "StackUserPresenceUpdate",
  StackPresenceNavigation: "StackPresenceNavigation",
  Unknown: "Unknown",
} as const;
export type PieceSelectionSource =
  (typeof PieceSelectionSources)[keyof typeof PieceSelectionSources];

export const DateFormats = {
  ElapsedYears: "ElapsedYears",
  HistoricalDate: "HistoricalDate",
} as const;
export type DateFormat = (typeof DateFormats)[keyof typeof DateFormats];

export const ExplodeStackActions = {
  SelectTestament: "SelectTestament",
  ExplodeSection: "ExplodeSection",
  SelectSection: "SelectSection",
} as const;
export type ExplodeStackAction =
  (typeof ExplodeStackActions)[keyof typeof ExplodeStackActions];

export interface ExplodeStackCommand {
  action: ExplodeStackAction;
  piece: Piece;
}

export const SelectionModalities = {
  Precise: "Precise",
  Coarse: "Coarse",
} as const;

export type SelectionModality =
  (typeof SelectionModalities)[keyof typeof SelectionModalities];

export interface BaseRelocationEvent {
  piece: Piece;
  to: {
    piece: Piece;
    x: number;
    y: number;
  };
  from: {
    x: number;
    y: number;
  };
}

export type DropEvent = BaseRelocationEvent;

export type DraggingEvent = BaseRelocationEvent;

export interface PieceDataMap {
  [BiblePieces.StackBook]: StackBookData;
  [BiblePieces.StackChapter]: StackChapterData;
  [BiblePieces.StackSection]: StackSectionData;
  [BiblePieces.StackSectionBook]: StackSectionBookData;
  [BiblePieces.StackTestament]: StackTestamentData;
}
