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
