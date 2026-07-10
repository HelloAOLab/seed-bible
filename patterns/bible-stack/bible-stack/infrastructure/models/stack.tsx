import { BiblePieces } from "../../domain/models/canvas";
import type { ActivityIndicator } from "../../domain/models/canvas";
import type { PieceBot, PieceBotTags, TypedBot } from "./casualos";
import type { HexString, Point2D } from "../../domain/models/commonTypes";
import type { ActivityContainer } from "../../domain/models/activity";
import type { Vector3 } from "../../../../pattern-typings/AuxLibraryDefinitions";

type TBiblePiece = typeof BiblePieces;

export type StackDraggablePiece = keyof Pick<
  TBiblePiece,
  | "StackBook"
  | "Verse"
  | "StackTestament"
  | "StackSectionBook"
  | "StackSection"
  | "VersesBundle"
  | "StackChapter"
>;

export interface StackDraggablePieceBotTags<
  T extends StackDraggablePiece,
> extends PieceBotTags<T> {
  draggable: boolean;
}

export interface TestamentTags extends StackDraggablePieceBotTags<"StackTestament"> {
  formOpacity: number;
  scale: number;
  color: string;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  pointable: boolean;
  cursor: "pointer";
}

export type TestamentBot = TypedBot<TestamentTags>;

export interface SectionTags extends StackDraggablePieceBotTags<"StackSection"> {
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  color: string;
  strokeColor: string;
  labelOpacity: number;
  formOpacity: number;
  scale: number;
}

export type SectionBot = TypedBot<SectionTags>;

export interface SectionShadowTags extends PieceBotTags<"StackSectionShadow"> {
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  color: string;
  formOpacity: number;
  sectionName: string;
  sectionDataId: string;
}

export type SectionShadowBot = TypedBot<SectionShadowTags>;

export interface BookTags extends StackDraggablePieceBotTags<
  "StackBook" | "StackSectionBook"
> {
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  color: string;
  strokeColor: string;
  labelOpacity: number;
  formOpacity: number;
}

export type BookBot = TypedBot<BookTags>;

export interface ChapterTags extends StackDraggablePieceBotTags<"StackChapter"> {
  label?: string;
  labelPosition: "top" | "front";
  scaleX: number;
  scaleY: number;
  scaleZ: number;
}

export interface ChapterMasks {
  color?: string;
}

export type ChapterBot = TypedBot<ChapterTags, ChapterMasks>;

export interface VersesBundleTags extends StackDraggablePieceBotTags<"VersesBundle"> {
  label: string;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
}

export type VersesBundleBot = TypedBot<VersesBundleTags>;

export interface VerseBotTags extends PieceBotTags<"Verse"> {
  scaleZ: number;
  labelPosition: "top";
}

export type VerseBot = TypedBot<VerseBotTags>;

export type StackStaticPiece = keyof Pick<
  TBiblePiece,
  "StackCover" | "StackCrossLine" | "StackTransformer" | "StackShadow"
>;

export interface StackStaticPieceBotTags<
  T extends StackStaticPiece,
> extends PieceBotTags<T> {
  stackBibleId: string;
}

export interface CoverTags extends StackStaticPieceBotTags<"StackCover"> {
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  pointable: boolean;
  labelSize?: number;
}

export interface LowerCoverTags extends CoverTags {
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  pointable: boolean;
  onDrag: string;
  onDragging: string;
}

export type CoverBot = TypedBot<CoverTags>;
export type LowerCoverBot = TypedBot<LowerCoverTags>;

export interface CrossLineTags extends StackStaticPieceBotTags<"StackCrossLine"> {
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  pointable: boolean;
  formOpacity: number;
}

export type CrossLineBot = TypedBot<CrossLineTags>;

export type BibleTransformerTags = StackStaticPieceBotTags<"StackTransformer">;

export type BibleTransformerBot = TypedBot<BibleTransformerTags>;

export interface BibleShadowTags extends StackStaticPieceBotTags<"StackShadow"> {
  form: "sprite";
}

export type BibleShadowBot = TypedBot<BibleShadowTags>;

export interface ActivityIndicatorTags extends PieceBotTags<"ActivityIndicator"> {
  indicatorType?: ActivityIndicator["indicatorType"];
  index?: number;
  color: HexString;
  ownerBotId?: PieceBot["id"];
  ownerDataId?: ActivityContainer["id"];
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  targetOpacity: number;
  formOpacity: number;
  form: "sphere" | "circle";
  isActivityIndicator: boolean;
  isActivityIndicatorPrefab?: boolean;
  label?: string;
  initialPosition?: Vector3;
  labelOpacity?: number;
  formRenderOrder?: number;
}

export type ActivityIndicatorBot = TypedBot<ActivityIndicatorTags>;

export interface ActivityNotificationTags extends PieceBotTags<"ActivityNotification"> {
  label: string;
  ownerDataId: ActivityContainer["id"];
  ownerBotId?: PieceBot<"StackChapter">["id"];
  formOpacity: number;
  direction?: Point2D;
  color: HexString;
  offset?: number;
  scaleX: number;
  scaleY: number;
  isActivityNotificationPrefab: boolean;
}

export type ActivityNotificationBot = TypedBot<ActivityNotificationTags>;

export interface InfoLabelTransformerTags extends PieceBotTags<"InfoLabelTransformer"> {
  isInfoLabelTransformerPrefab: boolean;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  ownerBotId?: string;
  ownerDataId?: string;
  isAnimatable?: boolean;
  targetOpacity?: number;
  pointableDefault?: boolean;
}

export type InfoLabelTransformerBot = TypedBot<InfoLabelTransformerTags>;

export interface InfoLabelDateTags extends PieceBotTags<"InfoLabelDate"> {
  isInfoLabelDatePrefab: boolean;
  ownerBotId?: string;
  relativeDateScales?: Point2D;
  absoluteDateScales?: Point2D;
  relativeDateFormAddress?: string;
  absoluteDateFormAddress?: string;
  initialPosition?: Vector3;
  label: string;
  color: string;
  formAddress: string;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  labelColor?: string;
  formOpacity?: number;
}

export type InfoLabelDateBot = TypedBot<InfoLabelDateTags>;

export interface InfoLabelTailTags extends PieceBotTags<"InfoLabelTail"> {
  isInfoLabelTailPrefab: boolean;
  ownerBotId?: string;
  initialPosition?: Vector3;
  transformer?: string;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  color: string;
  formOpacity: number;
}

export type InfoLabelTailBot = TypedBot<InfoLabelTailTags>;

export interface RegularActivityIndicatorTags extends ActivityIndicatorTags {
  indicatorType: "regular";
}

export interface ExtraBackgroundActivityIndicatorTags extends ActivityIndicatorTags {
  indicatorType: "extraBackground";
  color: "#000000";
}

export interface ExtraContentActivityIndicatorTags extends ActivityIndicatorTags {
  indicatorType: "extraContent";
  color: "#ffffff";
  label: string;
  labelOpacity: number;
}

export type ExtraBackgroundActivityIndicatorBot =
  TypedBot<ExtraBackgroundActivityIndicatorTags>;

export interface InfoLabelTextTags extends PieceBotTags<"InfoLabelText"> {
  initialPosition?: Vector3;
  isInfoLabelTextPrefab: boolean;
  ownerBotId?: string;
  onBotChanged?: string;
  label?: string;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  formAddress?: string;
  pointable: boolean;
  formOpacity: number;
  labelOpacity: number;
  color: string;
  labelColor: string;
}

export type InfoLabelTextBot = TypedBot<InfoLabelTextTags>;

export interface BotTypeMap {
  [BiblePieces.StackTestament]: TestamentBot;
  [BiblePieces.StackSection]: SectionBot;
  [BiblePieces.StackSectionShadow]: SectionShadowBot;
  [BiblePieces.StackSectionBook]: BookBot;
  [BiblePieces.StackBook]: BookBot;
  [BiblePieces.StackChapter]: ChapterBot;
  [BiblePieces.VersesBundle]: VersesBundleBot;
  [BiblePieces.Verse]: VerseBot;
  [BiblePieces.StackCover]: CoverBot;
  [BiblePieces.StackCrossLine]: CrossLineBot;
  [BiblePieces.StackTransformer]: BibleTransformerBot;
  [BiblePieces.StackShadow]: BibleShadowBot;
  [BiblePieces.ActivityIndicator]: ActivityIndicatorBot;
  [BiblePieces.ActivityNotification]: ActivityNotificationBot;
  [BiblePieces.InfoLabelTransformer]: InfoLabelTransformerBot;
  [BiblePieces.InfoLabelText]: InfoLabelTextBot;
  [BiblePieces.InfoLabelTail]: InfoLabelTailBot;
  [BiblePieces.InfoLabelDate]: InfoLabelDateBot;
}
