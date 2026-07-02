import { CloseFloatingApp } from "ext_discover.helper.CloseFloatingApp";
import { VideoPlayerFloating } from "ext_discover.components.VideoPlayerFloating";

export interface OpenVideoPlayerOptions {
  src?: string;
  isYoutube?: boolean;
  videoID?: string;
  content?: string;
  style?: Record<string, any>;
}

export function openVideoPlayer(options: OpenVideoPlayerOptions = {}) {
  const G = globalThis as Record<string, any>;
  CloseFloatingApp();
  const scope = `floating-${Date.now()}`;
  G.Previous_ID_Floading_App_PL = G.AddFloatingApp({
    App: (
      <VideoPlayerFloating
        scope={scope}
        src={options.src}
        isYoutube={options.isYoutube}
        videoID={options.videoID}
        content={options.content}
        style={options.style}
      />
    ),
    title: `Video Playlist`,
    position: { x: 200, y: 150 },
    size: { width: 500, height: 330 },
  });
}
