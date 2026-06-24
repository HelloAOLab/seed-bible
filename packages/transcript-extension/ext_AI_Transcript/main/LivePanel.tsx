import { useManager } from "ext_AI_Transcript.main.context";
import { fmtRef, highlightVerse } from "ext_AI_Transcript.main.highlight";
import { type SeedBibleState } from "seed-bible.app.api";
import type { OutputSegment } from "ext_AI_Transcript.main.types";
import { useI18n } from "seed-bible.i18n.I18nManager";
export function LivePanel() {
  const context = useManager();
  const { t } = useI18n();
  const tm = context.transcriptionManager;
  const seedBibleState: SeedBibleState = context.seedBibleState;
  const status = tm.liveStatus.value;
  const segments = tm.liveSegments.value;

  const connecting = status === "connecting";
  const recording = status === "recording";
  const transcribing = status === "transcribing";
  const idle = status === "idle" || status === "error";

  return (
    <section class="ts_picker">
      <div class="ts_live__bar">
        {(idle || connecting) && (
          <button
            class="ts_btn ts_btn--primary"
            disabled={connecting}
            onClick={() => tm.startLive()}
          >
            <span class="material-symbols-outlined">mic</span>
            {connecting
              ? t("Connecting", {
                  ns: "ext_AI_Transcript",
                  defaultValue: "Connecting…",
                })
              : segments.length
                ? t("Record_again", {
                    ns: "ext_AI_Transcript",
                    defaultValue: "Record again",
                  })
                : t("Start_recording", {
                    ns: "ext_AI_Transcript",
                    defaultValue: "Start recording",
                  })}
          </button>
        )}

        {recording && (
          <>
            <span class="ts_live__dot" />
            <span class="ts_live__label">
              {t("Recording", {
                ns: "ext_AI_Transcript",
                defaultValue: "Recording…",
              })}
            </span>
            <span class="ts_picker__spacer" />
            <button
              class="ts_btn ts_btn--primary"
              onClick={() => tm.stopLive()}
            >
              <span class="material-symbols-outlined">stop</span>
              {t("Stop", { ns: "ext_AI_Transcript", defaultValue: "Stop" })}
            </button>
          </>
        )}

        {transcribing && (
          <>
            <span class="ts_live__label">
              {t("Finalizing_transcript", {
                ns: "ext_AI_Transcript",
                defaultValue: "Finalizing transcript…",
              })}
            </span>
            <span class="ts_picker__spacer" />
          </>
        )}
      </div>

      {segments.length > 0 && (
        <ul class="ts_transcript ts_seglist ts_live__transcript">
          {segments.map((seg: OutputSegment) => (
            <li key={seg.id} class="ts_seg">
              <span class="ts_seg__text">{seg.text}</span>
              {seg.references.length > 0 && (
                <span class="ts_seg__refs">
                  {seg.references.map((r: string) => (
                    <span
                      key={r}
                      class="ts_badge ts_badge--ref"
                      onClick={() => highlightVerse(seedBibleState, r)}
                    >
                      {fmtRef(r)}
                    </span>
                  ))}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {recording && segments.length === 0 && (
        <p class="ts_dropzone__hint">
          {t("Listening_start_speaking", {
            ns: "ext_AI_Transcript",
            defaultValue: "Listening — start speaking…",
          })}
        </p>
      )}
    </section>
  );
}
