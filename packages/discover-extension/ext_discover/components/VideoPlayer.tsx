import { videoPlayerSmallCss } from "ext_discover.css.videoPlayerSmallCss";
import { getVideoPlayerManager } from "ext_discover.managers.VideoPlayerManager";
import type { VideoPlayerProps } from "ext_discover.interfaces.components.VideoPlayer";

export function VideoPlayer({
  videoSrc,
  playlistItem,
  style,
  scope = "default",
  manager = getVideoPlayerManager(scope),
}: VideoPlayerProps) {
  manager.syncExternal({ videoSrc, playlistItem });

  const src = manager.videoSrc.value;

  if (!src || typeof src !== "string") {
    return null;
  }

  return (
    <>
      <style>{videoPlayerSmallCss}</style>
      <div style={{ width: "100%", position: "relative", ...style }}>
        <video
          controls
          autoPlay
          ref={manager.setVideoRef}
          src={src}
          style={{ width: "100%", height: "auto" }}
        />
        <p
          className="mic-container"
          style={{
            position: "absolute",
            bottom: "1.5rem",
            right: "4rem",
            zIndex: "100000",
            backgroundColor: "transparent",
          }}
        >
          <span
            className="material-symbols-outlined unfollow icon"
            style={{ fontSize: "1rem" }}
            onClick={manager.handleFullscreen}
          >
            fullscreen
          </span>
        </p>
        <p
          className="mic-container"
          style={{
            position: "absolute",
            top: "0.5rem",
            right: "0.5rem",
            zIndex: "100000",
            backgroundColor: "transparent",
          }}
        >
          <span
            className="material-symbols-outlined unfollow icon"
            style={{ fontSize: "1.5rem", textShadow: "0px 4px 2px black" }}
            onClick={manager.handleClose}
          >
            close
          </span>
        </p>
      </div>
    </>
  );
}
