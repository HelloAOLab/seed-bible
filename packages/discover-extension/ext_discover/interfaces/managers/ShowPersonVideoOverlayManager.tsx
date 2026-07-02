import type { Signal } from "@preact/signals";

export type PersonVideoOverlaySize = "s" | "m" | "l" | "full";

export interface PersonVideoSizeOption {
  size: string;
  value: PersonVideoOverlaySize;
}

export interface ShowPersonVideoOverlayManager {
  visible: Signal<boolean>;
  overlaySize: Signal<PersonVideoOverlaySize>;
  position: Signal<{ x: number | string; y: number | string }>;
  sizeOptions: PersonVideoSizeOption[];
  open: () => void;
  close: () => void;
  setOverlaySize: (size: PersonVideoOverlaySize) => void;
  toggleFullscreen: () => void;
  attachVideoElement: (element: HTMLVideoElement | null) => void;
  handleMouseDown: (e: { clientX: number; clientY: number }) => void;
  handleCloseAndToggleLayout: () => void;
}
