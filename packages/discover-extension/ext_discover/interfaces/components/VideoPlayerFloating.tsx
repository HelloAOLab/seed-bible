import type { VideoPlayerFloatingManager } from "ext_discover.interfaces.managers.VideoPlayerFloatingManager";

export interface VideoPlayerFloatingProps {
  src?: string;
  isYoutube?: boolean;
  videoID?: string;
  content?: string;
  style?: Record<string, any>;
  scope?: string;
  manager?: VideoPlayerFloatingManager;
}
