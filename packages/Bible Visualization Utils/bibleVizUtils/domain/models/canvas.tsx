import type { Span } from "bibleVizUtils.domain.models.commonTypes";
import type { LayoutBookData } from "bibleVizUtils.domain.entities.LayoutBookData";
import type { StackBookData } from "bibleVizUtils.domain.entities.StackBookData";
import type { StackBibleData } from "bibleVizUtils.domain.entities.StackBibleData";
import type { StackChapterData } from "bibleVizUtils.domain.entities.StackChapterData";
import type { Point2D, Point3D } from "bibleVizUtils.domain.models.commonTypes";
// import type { BookName } from "bibleVizUtils.domain.models.scripture";

export interface Piece<T extends BiblePieceType = BiblePieceType> {
  id: string;
  type: T;
}

export interface ActivityIndicator extends Piece<"ActivityIndicator"> {
  indicatorType: "regular" | "extraContent" | "extraBackground";
  index: number;
}

export type ActivityNotification = Piece<"ActivityNotification">;

export const BiblePiece = {
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
  LayoutBook: "LayoutBook",
  LayoutChapter: "LayoutChapter",
  LayoutChunkOfVerses: "LayoutChunkOfVerses",
  LayoutVerse: "LayoutVerse",
  ActivityIndicator: "ActivityIndicator",
  ActivityNotification: "ActivityNotification",
  InfoLabelTransformer: "InfoLabelTransformer",
  InfoLabelText: "InfoLabelText",
  InfoLabelTail: "InfoLabelTail",
  InfoLabelDate: "InfoLabelDate",
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
  VersesBundle: "VersesBundle",
  Verse: "Verse",
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
  scale: Point2D;
  position: Point3D;
  layoutPosition: Point2D;
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
  nameLabel: Piece;
  structureIndex: number;
  layoutId: string;
  dateLabel: Piece;
  infoCardTransformer?: Piece;
  infoCardBackground?: Piece;
  infoCardcontent?: Piece;
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
  bookId: string;
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
