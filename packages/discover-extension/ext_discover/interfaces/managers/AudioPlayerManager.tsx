import type { Signal } from "@preact/signals";

export interface AudioPlayerExternal {
  mediaURL?: string;
  secondaryClose?: boolean;
  close?: boolean;
  style?: Record<string, any>;
  fileName?: string;
  shadow?: boolean;
}

export interface AudioPlayerManager {
  loading: Signal<boolean>;
  isRecorded: Signal<boolean>;
  playCount: Signal<number>;
  isPlaying: Signal<boolean>;
  currentSeconds: Signal<number>;
  audioLength: Signal<number>;
  dataFreq: Signal<number[]>;
  syncExternal: (external: AudioPlayerExternal) => void;
  handleStopPlay: () => Promise<void>;
  handlePlay: () => Promise<void>;
  handleClose: () => void;
}
