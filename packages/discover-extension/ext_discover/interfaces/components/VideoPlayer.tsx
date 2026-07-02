import type { VideoPlayerManager } from "ext_discover.interfaces.managers.VideoPlayerManager";

export interface VideoPlayerProps {
  videoSrc?: string | boolean;
  playlistItem?: Record<string, any>;
  style?: Record<string, any>;
  scope?: string;
  manager?: VideoPlayerManager;
}
