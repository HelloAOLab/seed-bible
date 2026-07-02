import { recordingVoiceCss } from "ext_discover.css.recordingVoiceCss";
import {
  SCREEN_RECORD_GIF,
  VIDEO_RECORD_GIF,
  VIDEO_RECORD_ICONS,
} from "ext_discover.models.videoRecordUI";
import { getVideoRecordUIManager } from "ext_discover.managers.VideoRecordUIManager";
import type { VideoRecordUIProps } from "ext_discover.interfaces.components.VideoRecordUI";

export function VideoRecordUI({
  data,
  setData,
  name,
  setName,
  scope = "default",
  manager = getVideoRecordUIManager(scope),
}: VideoRecordUIProps) {
  manager.syncExternal({ data, setData, name, setName });

  const recordingProps = manager.recordingProps.value;
  const poster = manager.poster.value;
  const isRecording = manager.isRecording.value;
  const isRecorded = manager.isRecorded.value;
  const isPlaying = manager.isPlaying.value;
  const isStreaming = manager.isStreaming.value;
  const tab = manager.tab.value;
  const isScreen = manager.isScreen.value;
  const buttonConfigs = manager.buttonConfigs.value;

  return (
    <>
      <style>{recordingVoiceCss}</style>
      <div
        className="tabs-playlist"
        style={{ width: "100%", marginBottom: "0.5rem" }}
      >
        {buttonConfigs.map(({ label, onClick, value }) => {
          return (
            <div
              key={value}
              onClick={() => {
                onClick();
              }}
              style={{
                justifyContent: "center",
                width: `${100 / buttonConfigs.length}%`,
                fontSize: "12px",
                fontWeight: "400",
              }}
              className={`tabs-playlist-item ${value === tab ? "active" : ""}`}
            >
              <img
                className="img-icon"
                style={{ height: "20px" }}
                src={
                  VIDEO_RECORD_ICONS[
                    `${value}${value === tab ? "_active" : ""}`
                  ]
                }
              />
              <span class="hide-at-400">{label}</span>
            </div>
          );
        })}
      </div>
      <div className="media-recorder">
        {isRecording && isScreen ? null : (
          <div style={{ position: "relative" }}>
            {isRecording && isScreen && (
              <div className="label-video">
                <img
                  src={isScreen ? SCREEN_RECORD_GIF : VIDEO_RECORD_GIF}
                  alt="record"
                />
                <p>
                  {isScreen
                    ? t("yourScreenIsBeingRecorded")
                    : t("yourVideoIsBeingRecorded")}
                </p>
              </div>
            )}
            <video
              style={{ width: "100%" }}
              autoPlay
              muted={isStreaming}
              controls={isPlaying}
              ref={manager.setVideoRef}
              playsInline
              poster={
                (poster as string) ||
                `https://dummyimage.com/640x480/000/fff&text=${isScreen ? "Screen+Preview" : "Camera+Preview"}`
              }
            />
            {!isRecorded && (
              <div className="controls-video">
                {!isRecording && (
                  <>
                    <p className="pointer" onClick={manager.toggleAudio}>
                      <img
                        src={
                          VIDEO_RECORD_ICONS[
                            recordingProps.audio ? "mic" : "mic_off"
                          ]
                        }
                        className="img-icon"
                        alt="mic"
                        style={{ height: "32px" }}
                      />
                    </p>
                    <p className="pointer" onClick={manager.handleRecord}>
                      <img
                        src={VIDEO_RECORD_ICONS.start_recording}
                        className="img-icon"
                        alt="mic"
                        style={{ height: "32px" }}
                      />
                    </p>
                  </>
                )}
                {isRecording && (
                  <p className="pointer" onClick={manager.handleStop}>
                    <img
                      src={VIDEO_RECORD_ICONS.stop_recording}
                      className="img-icon"
                      alt="mic"
                      style={{ height: "32px" }}
                    />
                  </p>
                )}
              </div>
            )}
          </div>
        )}
        {isRecording && isScreen && (
          <div className="controls">
            <p className="pointer" onClick={manager.handleStop}>
              <img
                src={VIDEO_RECORD_ICONS.stop_recording}
                className="img-icon"
                alt="mic"
                style={{ height: "32px" }}
              />
            </p>
          </div>
        )}
        {isRecorded && (
          <div className="controls">
            {isRecorded && !isPlaying && (
              <>
                <p className="mic-container">
                  <span
                    className="material-symbols-outlined unfollow icon"
                    onClick={manager.handlePlay}
                  >
                    play_arrow
                  </span>
                </p>
                <p className="mic-container">
                  <span
                    className="material-symbols-outlined unfollow icon"
                    onClick={manager.handleReRecord}
                  >
                    replay
                  </span>
                </p>
              </>
            )}
            {isPlaying && (
              <p className="mic-container">
                <span
                  className="material-symbols-outlined unfollow icon"
                  onClick={manager.handleStopPlay}
                >
                  stop
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
