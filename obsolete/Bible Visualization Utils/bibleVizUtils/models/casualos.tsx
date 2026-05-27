import type {
  Bot,
  AnimateTagFunctionOptions,
  Vector2,
} from "../../../../typings/AuxLibraryDefinitions";

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
  bot: Bot;
  to: {
    bot: Bot;
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
