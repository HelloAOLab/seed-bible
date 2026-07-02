import type { Signal } from "@preact/signals";

export interface ScreenRecordingStopButtonManager {
  hidden: Signal<boolean>;
  video: Signal<boolean>;
  position: Signal<{ x: number | string; y: number | string }>;
  init: (opts?: { video?: boolean }) => void;
  cleanup: () => void;
  toggleVideo: () => void;
  handleStop: () => void;
  hide: () => void;
  handleMouseDown: (e: { clientX: number; clientY: number }) => void;
  handleMouseMove: (e: { clientX: number; clientY: number }) => void;
  handleMouseUp: () => void;
}
