import type { Span } from "bibleVizUtils.domain.models.commonTypes";
import type {
  Bot,
  Vector2,
  Vector3,
} from "../../../../../typings/AuxLibraryDefinitions";
import type { LayoutBookData } from "bibleVizUtils.domain.entities.LayoutBookData";
import type { StackBookData } from "bibleVizUtils.domain.entities.StackBookData";
import type { StackBibleData } from "bibleVizUtils.domain.entities.StackBibleData";
import type { StackChapterData } from "bibleVizUtils.domain.entities.StackChapterData";

export const BiblePiece = {
  StackTestament: "StackTestament",
  StackSection: "StackSection",
  StackSectionShadow: "StackSectionShadow",
  StackSectionBook: "StackSectionBook",
  StackBook: "StackBook",
  StackChapter: "StackChapter",
  StackChunkOfVerses: "StackChunkOfVerses",
  StackVerse: "StackVerse",
  LayoutBook: "LayoutBook",
  LayoutChapter: "LayoutChapter",
  LayoutChunkOfVerses: "LayoutChunkOfVerses",
  LayoutVerse: "LayoutVerse",
  InfoLabelTransformer: "InfoLabelTransformer",
} as const;
export type BiblePieceType = (typeof BiblePiece)[keyof typeof BiblePiece];

export const ObjectPoolTags = {
  ConfettiParticle: "ConfettiParticle",
  VFXParticle: "VFXParticle",
  InfoLabel: "InfoLabel",
  InfoLabelTail: "InfoLabelTail",
  InfoLabelDate: "InfoLabelDate",
  InfoLabelTransformer: "InfoLabelTransformer",
  ActivityIndicator: "ActivityIndicator",
  DonationContainer: "DonationContainer",
  DonationFill: "DonationFill",
  StackBookOutline: "StackBookOutline",
  StackSectionShadow: "StackSectionShadow",
  DonationOutline: "DonationOutline",
  StackChapter: "StackChapter",
  StackChunkOfVerses: "StackChunkOfVerses",
  StackVerse: "StackVerse",
  StackBook: "StackBook",
  StackSection: "StackSection",
  StackTestament: "StackTestament",
  StackBibleTransformer: "StackBibleTransformer",
  StackCover: "StackCover",
  StackCrossLine: "StackCrossLine",
  StackBibleShadow: "StackBibleShadow",
  LayoutCover: "LayoutCover",
  LayoutBook: "LayoutBook",
  LayoutBookNameLabel: "LayoutBookNameLabel",
  LayoutBookDateLabel: "LayoutBookDateLabel",
  LayoutBookInfoCardTransformer: "LayoutBookInfoCardTransformer",
  LayoutBookInfoCardBackground: "LayoutBookInfoCardBackground",
  LayoutBookInfoCardContent: "LayoutBookInfoCardContent",
  LayoutLine: "LayoutLine",
  LayoutLabel: "LayoutLabel",
  LayoutChapter: "LayoutChapter",
  LayoutToggleButton: "LayoutToggleButton",
  LayoutToggleBackground: "LayoutToggleBackground",
  LayoutToggleHandle: "LayoutToggleHandle",
  LayoutButton: "LayoutButton",
  LayoutButtonIcon: "LayoutButtonIcon",
  LayoutButtonLabel: "LayoutButtonLabel",
  LayoutColorPickerBackground: "LayoutColorPickerBackground",
  LayoutColorPickerContent: "LayoutColorPickerContent",
  LayoutSettingsButton: "LayoutSettingsButton",
  LayoutVerse: "LayoutVerse",
  LayoutChunkOfVerses: "LayoutChunkOfVerses",
  ActivityNotification: "ActivityNotification",
  ElementUserColor: "ElementUserColor",
  LayoutChapterPlaylistEntryItem: "LayoutChapterPlaylistEntryItem",
  LayoutChapterPlaylistEntryNode: "LayoutChapterPlaylistEntryNode",
  SectionShadow: "SectionShadow",
} as const;
export type ObjectPoolTagsType =
  (typeof ObjectPoolTags)[keyof typeof ObjectPoolTags];

export const BookShape = {
  Regular: "Regular",
  ExplodedView: "ExplodedView",
  Selected: "Selected",
  RegularSelected: "RegularSelected",
  ExplodedViewCustomShape: "ExplodedViewCustomShape",
} as const;
export type BookShapeType = (typeof BookShape)[keyof typeof BookShape];

export interface BookLayout {
  x: Span;
  y: Span;
}

export interface ComputedGroupBookProperties {
  scale: Vector2;
  position: Vector3;
  layoutPosition: Vector2;
}

export interface PieceInfo {
  typeOfPiece: BiblePieceType;
  key: string;
}

export interface ParentDataIds {
  stackBibleId?: string;
  stackTestamentId?: string;
  stackSectionId?: string;
  stackBookId?: string;
  stackSectionBookId?: string;
  layoutId?: string;
  layoutBookId?: string;
}
export type ParentDataId = keyof ParentDataIds;

export interface LayoutBookStructure {
  layoutBookData: LayoutBookData;
  nameLabel: Bot;
  structureIndex: number;
  layoutId: string;
  dateLabel: Bot;
  infoCardTransformer?: Bot;
  infoCardBackground?: Bot;
  infoCardcontent?: Bot;
  column: number;
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

export interface TourGuideData {
  intervalId: NodeJS.Timeout;
  promiseReject: (reason?: any) => void;
}

export interface UnhighlightDelayInfo {
  piece: Bot;
  timeoutId: NodeJS.Timeout;
}

export const CrossPosition = {
  Top: "Top",
  Middle: "Middle",
} as const;
export type CrossPositionType =
  (typeof CrossPosition)[keyof typeof CrossPosition];

export const BibleVisualizationState = {
  Regular: "Regular",
  Expanded: "Expanded",
} as const;
export type BibleVisualizationStateType =
  (typeof BibleVisualizationState)[keyof typeof BibleVisualizationState];

export const BibleType = {
  Default: "Default",
  PlatformerGame: "PlatformerGame",
} as const;
export type BibleTypeType = (typeof BibleType)[keyof typeof BibleType];

export const BibleState = {
  Closed: "Closed",
  Open: "Open",
} as const;
export type BibleStateType = (typeof BibleState)[keyof typeof BibleState];

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
  bookName: string;
}

export const PieceSelectionSources = {
  Click: "Click",
  StackTabsVisualizationUpdate: "StackTabsVisualizationUpdate",
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
  piece: Bot;
}

export const ColorLerpTags = {
  color: "color",
  strokeColor: "strokeColor",
} as const;
export type ColorLerpTag = (typeof ColorLerpTags)[keyof typeof ColorLerpTags];

export const CanvasInteractions = {
  Click: "Click",
  Tap: "Tap",
  HoverBegin: "HoverBegin",
  HoverEnd: "HoverEnd",
  GridClick: "GridClick",
  Transition: "Transition",
  SearchBarSelection: "SearchBarSelection",
  Drag: "Drag",
  Dragging: "Dragging",
  Drop: "Drop",
  PointerUp: "PointerUp",
  PointerDown: "PointerDown",
} as const;
export type CanvasInteraction =
  (typeof CanvasInteractions)[keyof typeof CanvasInteractions];

export const InfoLabelDefaultConfig = {
  relativeDateScales: { x: 1, y: 1, z: 1 },
  absoluteDateScales: { x: 1, y: 1, z: 1 },
} as const;
