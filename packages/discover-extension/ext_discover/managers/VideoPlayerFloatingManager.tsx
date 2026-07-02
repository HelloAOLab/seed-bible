import { effect, signal } from "@preact/signals";
import type { VideoPlayerFloatingManager } from "ext_discover.interfaces.managers.VideoPlayerFloatingManager";

const managersByScope = new Map<string, VideoPlayerFloatingManager>();

export function getVideoPlayerFloatingManager(
  scope: string
): VideoPlayerFloatingManager {
  const existing = managersByScope.get(scope);
  if (existing) return existing;

  const manager = createVideoPlayerFloatingManager();
  managersByScope.set(scope, manager);
  return manager;
}

export function createVideoPlayerFloatingManager(): VideoPlayerFloatingManager {
  const src = signal<string | undefined>(undefined);
  const isYoutube = signal(false);
  const videoID = signal<string | undefined>(undefined);
  const content = signal<string | undefined>(undefined);
  const playing = signal(true);
  const progress = signal(0);
  const loading = signal(true);
  const volume = signal(1);
  const videoElement = signal<HTMLVideoElement | null>(null);

  const syncExternal = (external: {
    src?: string;
    isYoutube?: boolean;
    videoID?: string;
    content?: string;
  }) => {
    src.value = external.src;
    isYoutube.value = !!external.isYoutube;
    videoID.value = external.videoID;
    content.value = external.content;
  };

  const setVideoRef = (element: HTMLVideoElement | null) => {
    videoElement.value = element;
  };

  const setLoading = (value: boolean) => {
    loading.value = value;
  };

  effect(() => {
    const video = videoElement.value;
    if (!video) {
      return;
    }

    const updateTime = () => {
      progress.value = (video.currentTime / video.duration) * 100 || 0;
    };

    video.addEventListener("timeupdate", updateTime);
    return () => {
      video.removeEventListener("timeupdate", updateTime);
    };
  });

  const togglePlay = () => {
    const video = videoElement.value;
    if (!video) {
      return;
    }
    if (video.paused) {
      video.play();
      playing.value = true;
    } else {
      video.pause();
      playing.value = false;
    }
  };

  const handleSeek = (value: number) => {
    const video = videoElement.value;
    if (!video) {
      return;
    }
    const newTime = (value / 100) * video.duration;
    video.currentTime = newTime;
    progress.value = value;
  };

  const handleVolume = (value: number) => {
    const video = videoElement.value;
    if (!video) {
      return;
    }
    video.volume = value;
    volume.value = value;
  };

  const goFullscreen = () => {
    const video = videoElement.value;
    if (!video) {
      return;
    }
    if (video.requestFullscreen) {
      video.requestFullscreen();
    }
  };

  return {
    src,
    isYoutube,
    videoID,
    content,
    playing,
    progress,
    loading,
    volume,
    setVideoRef,
    togglePlay,
    handleSeek,
    handleVolume,
    goFullscreen,
    setLoading,
    syncExternal,
  };
}
