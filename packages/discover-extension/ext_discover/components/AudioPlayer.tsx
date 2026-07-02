import { recordingVoiceCss } from "ext_discover.css.recordingVoiceCss";
import {
  AUDIO_PLAYER_PLAY_ICON,
  AUDIO_PLAYER_STOP_ICON,
} from "ext_discover.models.audioPlayer";
import { convertSecondsToMinutesAndSeconds } from "ext_discover.hooks.convertSecondsToMinutesAndSeconds";
import { getAudioPlayerManager } from "ext_discover.managers.AudioPlayerManager";
import type { AudioPlayerProps } from "ext_discover.interfaces.components.AudioPlayer";
import { LoaderSecondary } from "ext_discover.features.components.LoaderSecondary";

const G = globalThis as Record<string, any>;

export function AudioPlayer({
  mediaURL,
  secondaryClose,
  close = false,
  style,
  fileName,
  shadow = false,
  scope = "default",
  manager = getAudioPlayerManager(scope),
}: AudioPlayerProps) {
  manager.syncExternal({
    mediaURL,
    secondaryClose,
    close,
    style,
    fileName,
    shadow,
  });

  const loading = manager.loading.value;
  const isRecorded = manager.isRecorded.value;
  const isPlaying = manager.isPlaying.value;
  const playCount = manager.playCount.value;
  const dataFreq = manager.dataFreq.value;
  const currentSeconds = manager.currentSeconds.value;
  const audioLength = manager.audioLength.value;

  if (loading) {
    return (
      <div className="align-center" style={{ padding: "1rem", gap: "1rem" }}>
        <LoaderSecondary />
        <p>Fetching Audio</p>
      </div>
    );
  }

  return (
    <>
      <style>{recordingVoiceCss}</style>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--pageBackground)",
          borderRadius: "6px",
          padding: "0.5rem",
          boxShadow: shadow ? "0px 0px 4px 3px #0000000D" : "",
          ...style,
        }}
      >
        <div
          className="align-center"
          style={{ gap: "0.5rem", justifyContent: "space-between" }}
        >
          {fileName && (
            <p style={{ margin: 0 }}>
              {G.GetTruncatedPlaylistLabel({ content: fileName }, 50)}
            </p>
          )}
          {close ? (
            <span
              className="material-symbols-outlined unfollow"
              onClick={manager.handleClose}
            >
              close
            </span>
          ) : null}
        </div>
        <div
          className="align-center"
          style={{
            gap: "0.5rem",
            display: secondaryClose ? "flex" : "",
          }}
        >
          {isPlaying ? (
            <p className="mic-container alter">
              <img
                style={{ height: "18px", width: "18px" }}
                className="img-icon"
                src={AUDIO_PLAYER_STOP_ICON}
                alt="stop"
                onClick={manager.handleStopPlay}
              />
            </p>
          ) : (
            <p className="mic-container alter">
              <img
                className="img-icon"
                src={AUDIO_PLAYER_PLAY_ICON}
                alt="play"
                onClick={manager.handlePlay}
              />
            </p>
          )}
          <div
            className={`oscillogram`}
            style={{
              flexGrow: secondaryClose ? 1 : "",
              width: secondaryClose ? "auto" : "90%",
              backgroundColor: "var(--pageBackground)",
            }}
          >
            {isRecorded &&
              dataFreq.map((_, i) => (
                <div
                  key={i}
                  style={{ height: `${_}%` }}
                  className={`bar static-bar greyed`}
                ></div>
              ))}

            {isRecorded && (
              <div
                className="oscillogram play-overlay"
                style={{ padding: "0" }}
              >
                {dataFreq.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      backgroundColor:
                        i < playCount
                          ? G.GetColor(i, dataFreq.length)
                          : "transparent",
                      height: `${_}%`,
                    }}
                    className={`bar static-bar`}
                  ></div>
                ))}
              </div>
            )}
          </div>
          <p style={{ fontSize: "12px", fontWeight: "500" }}>
            {convertSecondsToMinutesAndSeconds(
              Math.min(currentSeconds, audioLength)
            )}
            /{convertSecondsToMinutesAndSeconds(audioLength)}
          </p>
        </div>
      </div>
    </>
  );
}
