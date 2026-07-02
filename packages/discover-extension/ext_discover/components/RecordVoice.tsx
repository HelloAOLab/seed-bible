import { recordingVoiceCss } from "ext_discover.css.recordingVoiceCss";
import { RECORDING_LIMIT_OF_LINES } from "ext_discover.models.recordVoice";
import { getRecordVoiceManager } from "ext_discover.managers.RecordVoiceManager";
import type { RecordingUIProps } from "ext_discover.interfaces.components.RecordVoice";

const G = globalThis as Record<string, any>;

export function RecordingUI({
  data,
  setData,
  name,
  setName,
  scope = "default",
  manager = getRecordVoiceManager(scope),
}: RecordingUIProps) {
  manager.syncExternal({ data, setData, name, setName });

  const isRecording = manager.isRecording.value;
  const isRecorded = manager.isRecorded.value;
  const isPlaying = manager.isPlaying.value;
  const playCount = manager.playCount.value;
  const dataFreq = manager.dataFreq.value;

  return (
    <>
      <style>{recordingVoiceCss}</style>
      <div className="media-recorder">
        <div className={`oscillogram ${isRecording ? "active-recording" : ""}`}>
          {isRecording &&
            Array(RECORDING_LIMIT_OF_LINES)
              .fill(0)
              .map((_: any, i: number) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: G.GetColor(i, RECORDING_LIMIT_OF_LINES),
                  }}
                  className={`bar ${i < 6 ? `bar-${i + 1}` : ""}`}
                ></div>
              ))}

          {isRecorded &&
            dataFreq.map((_: any, i: number) => (
              <div
                key={i}
                style={{ height: `${_}%` }}
                className={`bar static-bar greyed`}
              ></div>
            ))}

          {isRecorded && (
            <div className="oscillogram play-overlay">
              {dataFreq.map((_: any, i: number) => (
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
        <div className="controls">
          {!isRecording && !isRecorded && (
            <p className="mic-container">
              <span
                className="material-symbols-outlined unfollow icon"
                onClick={manager.handleRecord}
              >
                mic
              </span>
            </p>
          )}
          {isRecording && (
            <p className="mic-container">
              <span
                className="material-symbols-outlined unfollow icon"
                onClick={manager.handleStop}
              >
                stop
              </span>
            </p>
          )}

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
      </div>
    </>
  );
}
