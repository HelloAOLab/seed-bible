import type { ReadonlySignal, Signal } from "@preact/signals";

export interface ShowPlayingContentAnnotationManager {
  mediaURL: Signal<string>;
  fileName: Signal<string | null>;
  videoSrc: Signal<boolean | string>;
  currentItem: Signal<Record<string, unknown>>;
  setVideoSrc: (val: boolean | string) => void;
  setMediaURL: (val: string) => void;
  setCurrentItem: (item: Record<string, unknown>) => void;
  hasMedia: ReadonlySignal<boolean>;
}
