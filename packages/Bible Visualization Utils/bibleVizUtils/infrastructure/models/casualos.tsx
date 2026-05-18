import type {
  Bot,
  AnimateTagFunctionOptions,
  Vector2,
  BotSpace,
  BotLinks,
  BotVars,
  BotTags,
  Vector3,
} from "../../../../../typings/AuxLibraryDefinitions";
import type {
  ActivityIndicator,
  BiblePiece,
  BiblePieceType,
} from "bibleVizUtils.domain.models.canvas";
import type { HexString, Point2D } from "../../domain/models/commonTypes";
import type {
  ActivityContainer,
  NotifiableContainer,
} from "../../domain/ports/pieceActivity";

export interface BaseTagData<T> {
  bot: Bot;
  options: AnimateTagFunctionOptions;
  then?: T;
}

export interface AnimateTagData extends BaseTagData<AnimateTagData> {
  tag?: string;
}

export interface SetTagData extends BaseTagData<SetTagData> {
  tag: string;
}

interface BaseRelocationEvent {
  bot: PieceBot;
  to: {
    bot: PieceBot;
    x: number;
    y: number;
    dimension: string;
  };
  from: {
    x: number;
    y: number;
    dimension: string;
  };
}

export type DropEvent = BaseRelocationEvent;

export type DraggingEvent = BaseRelocationEvent;

export interface DragEvent {
  bot: Bot;
  face: "left" | "right" | "front" | "back" | "top" | "bottom";
  from: {
    x: number;
    y: number;
    dimension: string;
  };
  uv: Vector2;
}

export const ClickModalities = {
  mouse: "mouse",
  touch: "touch",
} as const;
export type ClickModality =
  (typeof ClickModalities)[keyof typeof ClickModalities];

export const MouseButtonIds = {
  left: "left",
  right: "right",
  middle: "middle",
} as const;
export type MouseButtonId =
  (typeof MouseButtonIds)[keyof typeof MouseButtonIds];

export interface TypedBot<T = BotTags, M = BotTags> {
  id: string;
  link: string;
  space?: BotSpace;
  tags: T;
  masks: M;
  links: BotLinks;
  vars: BotVars;
  raw: T;
  changes: T;
  maskChanges: {
    [space: string]: T;
  };
}

export interface PieceBotTags<T extends BiblePieceType = BiblePieceType> {
  transformer?: string;
  type: T;
  isInUse?: boolean;
  system?: string;
  draggable?: boolean;
  pointable?: boolean;
  toErase?: boolean;
  // [dimension: string]: unknown;
}

export type PieceBot<T extends BiblePieceType = BiblePieceType> = TypedBot<
  PieceBotTags<T>
>;

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
  ownerDataId: NotifiableContainer["id"];
  ownerBotId?: PieceBot<"StackChapter">["id"] | PieceBot<"LayoutChapter">["id"];
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

export interface BibleVizUtilsObjectPoolerMap {
  [BiblePiece.ActivityNotification]: ActivityNotificationBot;
  [BiblePiece.ActivityIndicator]: ActivityIndicatorBot;
  [BiblePiece.InfoLabelTransformer]: InfoLabelTransformerBot;
  [BiblePiece.InfoLabelDate]: InfoLabelDateBot;
  [BiblePiece.InfoLabelTail]: InfoLabelTailBot;
  [BiblePiece.InfoLabelText]: InfoLabelTextBot;
}

// eslint-disable-next-line
export type CustomTag<P extends TypedBot<any, any>> = {
  [K in keyof P["tags"]]: {
    tag: K;
    value: P["tags"][K];
  };
}[keyof P["tags"]];

export interface PoolData<
  K = string,
  // eslint-disable-next-line
  P extends TypedBot<any, any> = TypedBot<any, any>,
> {
  key: K;
  prefab: P;
  customTags: CustomTag<P>[];
  cleanupCustomTags?: CustomTag<P>[];
  size: number;
}

export interface Pool<
  K = string,
  // eslint-disable-next-line
  P extends TypedBot<any, any> = TypedBot<any, any>,
> {
  poolData: PoolData<K, P>;
  objectPool: P[];
  inUseObjects: P[];
}
