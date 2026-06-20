import { useManager } from "ext_AI_Transcript.main.context";
import { FilePicker } from "ext_AI_Transcript.main.FilePicker";
import { ResultView } from "ext_AI_Transcript.main.ResultView";
const style = thisBot.tags["styles.css"];

export function App() {
  const context = useManager();
  const tm = context.transcriptionManager;
  const file = tm.files.value[0];
  const result = file ? tm.results.value[file.id] : undefined;

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
          <button
            class="ts_btn ts_app__refresh"
            disabled={tm.isProcessing.value || !file}
            onClick={() => tm.clearFiles()}
            title="Clear the file and result and start over"
          >
            ↻ Refresh
          </button>
        </header>

        {tm.error.value && (
          <div class="ts_banner ts_banner--error">{tm.error.value}</div>
        )}

        <FilePicker />

        {file && result && <ResultView fileId={file.id} result={result} />}
      </div>
    </>
  );
}
