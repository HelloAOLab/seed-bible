import type { Signal } from "@preact/signals";

export interface CursorFollowManager {
  pointer: Signal<{ x: number; y: number }>;
  icon: Signal<string>;
  start: (opts?: { icon?: string }) => void;
  stop: () => void;
}
