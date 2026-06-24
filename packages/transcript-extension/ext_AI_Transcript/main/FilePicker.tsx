import { useRef, useState } from "preact/hooks";
import { useManager } from "ext_AI_Transcript.main.context";
import { useI18n } from "seed-bible.i18n.I18nManager";
import type { FileStatus } from "ext_AI_Transcript.main.types";

const STATUS_TEXT: Record<FileStatus, string> = {
  queued: "Ready",
  decoding: "Decoding…",
  connecting: "Connecting…",
  streaming: "Transcribing…",
  inferring: "Extracting references…",
  done: "Done",
  error: "Error",
};

function fmtDur(sec?: number): string {
  if (!sec || !Number.isFinite(sec)) return "";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function FilePicker() {
  const context = useManager();
  const { t } = useI18n();
  const tm = context.transcriptionManager;
  const file = tm.files.value[0]; // single file at a time
  const processing = tm.isProcessing.value;
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (f: File | undefined | null) => {
    if (!f || processing) return;
    tm.clearFiles(); // replace any previous file/result
    tm.addFiles([f]);
  };

  const openPicker = () => {
    if (!processing) inputRef.current?.click();
  };

  return (
    <section class="ts_picker">
      <div
        class={`ts_dropzone ${dragging ? "ts_dropzone--drag" : ""} ${
          processing ? "ts_dropzone--busy" : ""
        }`}
        onClick={openPicker}
        onDragOver={(e) => {
          e.preventDefault();
          if (!processing) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer?.files?.[0]);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,video/*"
          style={{ display: "none" }}
          disabled={processing}
          onChange={(e) => {
            const input = e.target as HTMLInputElement;
            pick(input.files?.[0]);
            input.value = ""; // allow re-selecting the same file
          }}
        />

        {file ? (
          <>
            <p class="ts_dropzone__name" title={file.name}>
              {file.name}
            </p>
            <p class="ts_dropzone__hint">
              {t(`Status_${file.status}`, {
                ns: "ext_AI_Transcript",
                defaultValue: STATUS_TEXT[file.status],
              })}
              {file.durationSec ? ` · ${fmtDur(file.durationSec)}` : ""}
              {file.status === "done" || file.status === "error"
                ? ` · ${t("Click_to_choose_another", {
                    ns: "ext_AI_Transcript",
                    defaultValue: "click to choose another",
                  })}`
                : ""}
            </p>
            {file.status !== "queued" &&
              file.status !== "done" &&
              file.status !== "error" && (
                <div class="ts_progress ts_progress--sm ts_dropzone__progress">
                  <div
                    class="ts_progress__bar"
                    style={{ width: `${Math.round(file.progress * 100)}%` }}
                  />
                </div>
              )}
            {file.error && <p class="ts_dropzone__error">{file.error}</p>}
          </>
        ) : (
          <>
            <p class="ts_dropzone__title">
              {t("Drop_file_here", {
                ns: "ext_AI_Transcript",
                defaultValue: "Drop an audio or video file here",
              })}
            </p>
            <p class="ts_dropzone__hint">
              {t("Or_click_to_choose", {
                ns: "ext_AI_Transcript",
                defaultValue:
                  "or click to choose — mp3, m4a, wav, mp4, mov, mkv, webm…",
              })}
            </p>
          </>
        )}
      </div>

      <div class="ts_picker__footer">
        <span class="ts_picker__spacer" />

        <button
          class="ts_btn ts_btn--primary"
          disabled={processing || !file || file.status === "done"}
          onClick={() => tm.transcribeAll()}
        >
          {processing
            ? t("Working", {
                ns: "ext_AI_Transcript",
                defaultValue: "Working…",
              })
            : t("Transcribe", {
                ns: "ext_AI_Transcript",
                defaultValue: "Transcribe",
              })}
        </button>
      </div>
    </section>
  );
}
