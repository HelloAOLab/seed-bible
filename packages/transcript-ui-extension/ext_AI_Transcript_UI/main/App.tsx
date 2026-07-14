import { useManager } from "./context";
import { FilePicker } from "./FilePicker";
import { LivePanel } from "./LivePanel";
import { ResultView } from "./ResultView";
import { useI18n } from "seed-bible/i18n";
import "./styles.css";

export function App() {
  const context = useManager();
  const { t } = useI18n();
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
      <div class="ts_app">
        <header class="ts_app__header">
          <div class="ts_app__titles">
            <h1>
              {t("App_title", {
                ns: "ext_AI_Transcript_UI",
                defaultValue: "Bible Audio Transcriber",
              })}
            </h1>
            <p class="ts_app__subtitle">
              {t("App_subtitle", {
                ns: "ext_AI_Transcript_UI",
                defaultValue:
                  "Transcribe an audio/video file to timestamped JSON and extract Bible references.",
              })}
            </p>
          </div>
          <div class="ts_app__actions">
            <button
              class="ts_btn ts_app__mode"
              disabled={busy}
              onClick={() => tm.toggleMode()}
              title={
                live
                  ? t("Switch_to_file_upload", {
                      ns: "ext_AI_Transcript_UI",
                      defaultValue: "Switch to file upload",
                    })
                  : t("Switch_to_live_transcription", {
                      ns: "ext_AI_Transcript_UI",
                      defaultValue: "Switch to live transcription",
                    })
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
              title={t("Refresh_title", {
                ns: "ext_AI_Transcript_UI",
                defaultValue: "Clear the file and result and start over",
              })}
            >
              ↻{" "}
              {t("Refresh", {
                ns: "ext_AI_Transcript_UI",
                defaultValue: "Refresh",
              })}
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
