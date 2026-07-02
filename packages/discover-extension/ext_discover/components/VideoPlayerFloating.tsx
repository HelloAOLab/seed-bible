import { getVideoPlayerFloatingManager } from "ext_discover.managers.VideoPlayerFloatingManager";
import type { VideoPlayerFloatingProps } from "ext_discover.interfaces.components.VideoPlayerFloating";
import { Loader } from "ext_discover.features.components.Loader";

const G = globalThis as Record<string, any>;

export function VideoPlayerFloating({
  src,
  isYoutube,
  videoID,
  content,
  style,
  scope = "default",
  manager = getVideoPlayerFloatingManager(scope),
}: VideoPlayerFloatingProps) {
  manager.syncExternal({ src, isYoutube, videoID, content });

  const youtube = manager.isYoutube.value;
  const ytVideoID = manager.videoID.value;
  const videoContent = manager.content.value;
  const videoSrc = manager.src.value;
  const playing = manager.playing.value;
  const progress = manager.progress.value;
  const loading = manager.loading.value;
  const volume = manager.volume.value;

  return (
    <div
      className=""
      style={{
        borderRadius: "16px",
        background: "#111",
        boxSizing: "border-box",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        ...style,
      }}
    >
      {loading && (
        <div
          style={{
            display: "grid",
            placeItems: "center",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            zIndex: 1000,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
        >
          <Loader />
        </div>
      )}
      {youtube ? (
        <iframe
          className="item-need-full-height"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; autoplay;"
          referrerPolicy="strict-origin-when-cross-origin"
          src={`${G.CONSTANTS.YT_PREFIX}/${ytVideoID}`}
          onLoad={() => manager.setLoading(false)}
          style={{
            width: "auto",
            flexGrow: "1",
            objectFit: "cover",
          }}
          title={videoContent}
        />
      ) : (
        <video
          autoPlay
          ref={manager.setVideoRef}
          width="auto"
          height="auto"
          onPlaying={() => manager.setLoading(false)}
          onWaiting={() => manager.setLoading(true)}
          style={{
            flexGrow: "1",
            objectFit: "cover",
          }}
        >
          <source
            src={videoSrc || "https://www.w3schools.com/html/mov_bbb.mp4"}
            type="video/mp4"
          />
          Your browser does not support HTML video.
        </video>
      )}

      {!youtube && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "auto",
            alignItems: "center",
          }}
        >
          <button onClick={manager.togglePlay}>{playing ? "⏸️" : "▶️"}</button>
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => manager.handleSeek(Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => manager.handleVolume(Number(e.target.value))}
          />
          <button onClick={manager.goFullscreen}>⛶</button>
        </div>
      )}
    </div>
  );
}
