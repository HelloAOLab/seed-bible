import { useManager } from "ext_AI_Transcript.main.context";
import { FilePicker } from "ext_AI_Transcript.main.FilePicker";
import { LivePanel } from "ext_AI_Transcript.main.LivePanel";
import { ResultView } from "ext_AI_Transcript.main.ResultView";
const style = thisBot.tags["styles.css"];

export function App() {
  const context = useManager();
  const tm = context.transcriptionManager;
  const file = tm.files.value[0];
  const result = file ? tm.results.value[file.id] : undefined;
  const live = tm.mode.value === "live";
  const busy =
    tm.isProcessing.value ||
    tm.liveStatus.value === "connecting" ||
    tm.liveStatus.value === "recording" ||
    tm.liveStatus.value === "transcribing";

  return (
    <>
      <style>{style}</style>
      <div class="ts_app">
        <header class="ts_app__header">
          <div class="ts_app__titles">
            <h1>Bible Audio Transcriber</h1>
            <p class="ts_app__subtitle">
              Transcribe an audio/video file to timestamped JSON and extract
              Bible references.
            </p>
          </div>
          <div class="ts_app__actions">
            <button
              class="ts_btn ts_app__mode"
              disabled={busy}
              onClick={() => tm.toggleMode()}
              title={
                live ? "Switch to file upload" : "Switch to live transcription"
              }
            >
              <span class="material-symbols-outlined">
                {live ? "upload_file" : "mic"}
              </span>
            </button>
            <button
              class="ts_btn ts_app__refresh"
              disabled={busy || !file}
              onClick={() => tm.clearFiles()}
              title="Clear the file and result and start over"
            >
              ↻ Refresh
            </button>
          </div>
        </header>

        {tm.error.value && (
          <div class="ts_banner ts_banner--error">{tm.error.value}</div>
        )}

        {live ? <LivePanel /> : <FilePicker />}

        {!live && file && result && (
          <ResultView fileId={file.id} result={result} />
        )}
      </div>
    </>
  );
}
