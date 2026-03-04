export const BiblePieceType = {
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
export type BiblePieceTypeType =
  (typeof BiblePieceType)[keyof typeof BiblePieceType];

export const LabelDateFormat = {
  Absolute: "Absolute",
  Relative: "Relative",
} as const;
export type LabelDateFormatType =
  (typeof LabelDateFormat)[keyof typeof LabelDateFormat];

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
} as const;
export type ObjectPoolTagsType =
  (typeof ObjectPoolTags)[keyof typeof ObjectPoolTags];

export const LabelPositionings = {
  RightSided: "RightSided",
  LeftSided: "LeftSided",
  Top: "Top",
  RightSidedCorner: "RightSidedCorner",
} as const;
export type LabelPositioningsType =
  (typeof LabelPositionings)[keyof typeof LabelPositionings];

export const BookShape = {
  Regular: "Regular",
  ExplodedView: "ExplodedView",
  Selected: "Selected",
  RegularSelected: "RegularSelected",
} as const;
export type BookShapeType = (typeof BookShape)[keyof typeof BookShape];
