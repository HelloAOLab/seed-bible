import type { Signal } from "@preact/signals";

export interface VideoPlayerFloatingManager {
  src: Signal<string | undefined>;
  isYoutube: Signal<boolean>;
  videoID: Signal<string | undefined>;
  content: Signal<string | undefined>;
  playing: Signal<boolean>;
  progress: Signal<number>;
  loading: Signal<boolean>;
  volume: Signal<number>;
  setVideoRef: (element: HTMLVideoElement | null) => void;
  togglePlay: () => void;
  handleSeek: (value: number) => void;
  handleVolume: (value: number) => void;
  goFullscreen: () => void;
  setLoading: (value: boolean) => void;
  syncExternal: (external: {
    src?: string;
    isYoutube?: boolean;
    videoID?: string;
    content?: string;
  }) => void;
}
