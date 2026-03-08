import type { Span } from "bibleVizUtils.models.common.types";
import type {
  Vector2,
  Vector3,
} from "../../../../typings/AuxLibraryDefinitions";

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
