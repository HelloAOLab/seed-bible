import { signal } from "@preact/signals";
import { renderLinkContent } from "ext_discover.helper.renderLinkContent";
import type { VideoPlayerManager } from "ext_discover.interfaces.managers.VideoPlayerManager";

const G = globalThis as Record<string, any>;

const managersByScope = new Map<string, VideoPlayerManager>();

export function getVideoPlayerManager(scope: string): VideoPlayerManager {
  const existing = managersByScope.get(scope);
  if (existing) return existing;

  const manager = createVideoPlayerManager();
  managersByScope.set(scope, manager);
  return manager;
}

export function createVideoPlayerManager(): VideoPlayerManager {
  const videoSrc = signal<string | boolean>(false);
  const playlistItem = signal<Record<string, any>>({});
  let videoElement: HTMLVideoElement | null = null;

  const syncExternal = (external: {
    videoSrc?: string | boolean;
    playlistItem?: Record<string, any>;
  }) => {
    if (videoSrc.value !== external.videoSrc) {
      videoSrc.value = external.videoSrc ?? false;
    }
    if (external.playlistItem) {
      playlistItem.value = external.playlistItem;
    }
  };

  const setVideoRef = (element: HTMLVideoElement | null) => {
    videoElement = element;
  };

  const handleFullscreen = () => {
    const src = videoSrc.value;
    if (!src || typeof src !== "string") {
      return;
    }

    DataManager.cancelCurrentPlayingSound();
    videoElement?.pause();
    videoElement?.removeAttribute("src");

    G.SmallPlaybackContent = () => {
      if (!videoElement) {
        return;
      }
      videoElement.autoplay = false;
      videoElement.setAttribute("src", src);
    };

    renderLinkContent({
      ...playlistItem.value,
      skipEmbed: true,
      isLastItem: false,
      isFirstItem: false,
    });
  };

  const handleClose = () => {
    G.SetVideoSrc(null);
  };

  return {
    videoSrc,
    playlistItem,
    setVideoRef,
    handleFullscreen,
    handleClose,
    syncExternal,
  };
}
