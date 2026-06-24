import { useManager } from "ext_AI_Transcript.main.context";
import { fmtRef, highlightVerse } from "ext_AI_Transcript.main.highlight";
import { type SeedBibleState } from "seed-bible.app.api";
import type { OutputSegment } from "ext_AI_Transcript.main.types";

export function LivePanel() {
  const context = useManager();
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
        {idle && (
          <button class="ts_btn ts_btn--primary" onClick={() => tm.startLive()}>
            <span class="material-symbols-outlined">mic</span>
            {segments.length ? "Record again" : "Start recording"}
          </button>
        )}

        {connecting && <span class="ts_live__label">Connecting…</span>}

        {recording && (
          <>
            <span class="ts_live__dot" />
            <span class="ts_live__label">Recording…</span>
            <span class="ts_picker__spacer" />
            <button
              class="ts_btn ts_btn--primary"
              onClick={() => tm.stopLive()}
            >
              <span class="material-symbols-outlined">stop</span>
              Stop
            </button>
          </>
        )}

        {transcribing && (
          <span class="ts_live__label">Finalizing transcript…</span>
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
        <p class="ts_dropzone__hint">Listening — start speaking…</p>
      )}
    </section>
  );
}
