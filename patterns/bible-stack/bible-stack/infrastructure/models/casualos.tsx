import type {
  Bot,
  AnimateTagFunctionOptions,
  Vector2,
  BotSpace,
  BotLinks,
  BotVars,
  BotTags,
} from "../../../../pattern-typings/AuxLibraryDefinitions";
import type { BiblePiece } from "../../domain/models/canvas";

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

export interface BaseRelocationEvent {
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

export interface PieceBotTags<T extends BiblePiece = BiblePiece> {
  transformer?: string;
  type: T;
  isInUse?: boolean;
  system?: string;
  draggable?: boolean;
  pointable?: boolean;
  toErase?: boolean;
  color?: string;
  labelColor?: string;
  labelOpacity?: number;
  cursor?: string;
  formAddress?: string;
  strokeWidth?: number;
  formDepthTest?: boolean;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  formOpacity?: number;
  // [dimension: string]: unknown;
}

export type PieceBot<T extends BiblePiece = BiblePiece> = TypedBot<
  PieceBotTags<T>
>;

export interface BotListenerParametersMap<B extends PieceBot> {
  onBotChanged: {
    tags: (keyof B["tags"])[];
  };
  onClick: {
    face: "left" | "right" | "front" | "back" | "top" | "bottom";
    dimension: string;
    uv: Vector2;
    modality: "mouse" | "touch" | "controller" | "finger";
    hand: "left" | "right";
    finger: "index" | "middle" | "ring" | "pinky" | "thumb" | "unknown";
    buttonId: "left" | "middle" | "right";
    codeBot?: Bot;
    codeTag?: string;
    codeTagSpace?: string;
  };
  onDrag: {
    bot: Bot;
    face: "left" | "right" | "front" | "back" | "top" | "bottom";
    from: {
      x: number;
      y: number;
      dimension: string;
    };
    uv: Vector2;
  };
  onDragging: BaseRelocationEvent;
  onDrop: BaseRelocationEvent;
  onPointerDown: { bot: Bot; dimension: string };
  onPointerEnter: { bot: Bot; dimension: string };
  onPointerExit: { bot: Bot; dimension: string };
  onPointerUp: { bot: Bot; dimension: string };
}
