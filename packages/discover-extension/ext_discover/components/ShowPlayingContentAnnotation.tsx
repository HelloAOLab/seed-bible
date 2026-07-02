import { VideoPlayer } from "ext_discover.components.VideoPlayer";
import { AudioPlayer } from "ext_discover.components.AudioPlayer";
import { getShowPlayingContentAnnotationManager } from "ext_discover.managers.ShowPlayingContentAnnotationManager";
import type { ShowPlayingContentAnnotationProps } from "ext_discover.interfaces.components.ShowPlayingContentAnnotation";

export function ShowPlayingContentAnnotation({
  manager = getShowPlayingContentAnnotationManager(),
}: ShowPlayingContentAnnotationProps) {
  if (!manager.hasMedia.value) return null;

  return (
    <div
      style={{
        position: "relative",
        backgroundColor: "white",
        padding: "0 0.5rem",
        width: "calc(100% - 10px)",
      }}
    >
      {!!manager.videoSrc.value ? (
        <VideoPlayer
          videoSrc={manager.videoSrc.value}
          playlistItem={{ ...manager.currentItem.value }}
        />
      ) : manager.mediaURL.value ? (
        <AudioPlayer
          close
          secondaryClose
          mediaURL={manager.mediaURL.value}
          fileName={manager.fileName.value ?? undefined}
        />
      ) : null}
    </div>
  );
}
