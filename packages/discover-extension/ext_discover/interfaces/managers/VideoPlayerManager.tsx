import type { Signal } from "@preact/signals";

export interface VideoPlayerManager {
  videoSrc: Signal<string | boolean>;
  playlistItem: Signal<Record<string, any>>;
  setVideoRef: (element: HTMLVideoElement | null) => void;
  handleFullscreen: () => void;
  handleClose: () => void;
  syncExternal: (external: {
    videoSrc?: string | boolean;
    playlistItem?: Record<string, any>;
  }) => void;
}
