import { useEffect, useRef, useState } from "preact/hooks";
import { useManager } from "ext_AI_Transcript.main.context";
import { type SeedBibleState } from "seed-bible.app.api";
import { fmtRef, highlightVerse } from "ext_AI_Transcript.main.highlight";
import type {
  OutputSegment,
  TranscriptionResult,
  QueuedFile,
} from "ext_AI_Transcript.main.types";
import { useI18n } from "seed-bible.i18n.I18nManager";

function fmtTime(sec: number | null): string {
  if (sec == null || !Number.isFinite(sec)) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toFixed(0)}`;
}

export function ResultView({
  fileId,
  result,
}: {
  fileId: string;
  result: TranscriptionResult;
}) {
  const context = useManager();
  const { t } = useI18n();
  const tm = context.transcriptionManager;
  const seedBibleState: SeedBibleState = context.seedBibleState;
  const file = tm.files.value.find((f: QueuedFile) => f.id === fileId)?.file;
  const isVideo = !!file && file.type.startsWith("video");

  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const [src, setSrc] = useState<string | undefined>(undefined);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [followRefs, setFollowRefs] = useState(true);

  // Object URL for the chosen file, revoked when the file changes / unmounts.
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Track the segment under the playhead.
  const handleTime = () => {
    const el = mediaRef.current;
    if (!el) return;
    const t = el.currentTime;
    const seg = result.segments.find((s) => t >= s.start && t < s.end);
    setActiveId(seg ? seg.id : null);
  };

  // Keep the active segment visible inside its scroll box.
  useEffect(() => {
    if (activeId == null) return;
    const el = document.getElementById(`seg-${fileId}-${activeId}`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeId, fileId]);

  const seek = (t: number | null) => {
    const el = mediaRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, t ?? 0);
    void el.play().catch(() => {});
  };

  const setMediaEl = (el: HTMLVideoElement | HTMLAudioElement | null) => {
    mediaRef.current = el;
  };

  // When "follow refs" is on, highlight the active segment's first reference
  // as playback moves from one segment to the next.
  useEffect(() => {
    if (!followRefs || activeId == null) return;
    const seg: OutputSegment | undefined = result.segments.find(
      (s: OutputSegment) => s.id === activeId
    );
    if (!seg || seg.references.length === 0) return;
    const ref = seg?.references[0];
    const interval = (seg.end - seg.start) * 1000;
    if (ref) void highlightVerse(seedBibleState, ref, interval);
  }, [activeId, followRefs]);

  return (
    <article class="ts_result">
      <header class="ts_result__head">
        <strong class="ts_result__file">{result.file}</strong>
        <span class="ts_result__stats">
          {t("Stats_segments_refs", {
            ns: "ext_AI_Transcript",
            defaultValue: "{{segments}} segments · {{refs}} refs",
            segments: result.segments.length,
            refs: result.references.length,
          })}
        </span>
        <span class="ts_result__spacer" />
        <label class="ts_check">
          <input
            type="checkbox"
            checked={followRefs}
            onChange={(e) =>
              setFollowRefs((e.target as HTMLInputElement).checked)
            }
          />
          {t("Follow_refs", {
            ns: "ext_AI_Transcript",
            defaultValue: "Follow refs",
          })}
        </label>
      </header>

      <div class="ts_result__body">
        {src &&
          (isVideo ? (
            <video
              ref={setMediaEl}
              class="ts_media"
              src={src}
              controls
              onTimeUpdate={handleTime}
            />
          ) : (
            <audio
              ref={setMediaEl}
              class="ts_media ts_media--audio"
              src={src}
              controls
              onTimeUpdate={handleTime}
              style={{ height: "40px" }}
            />
          ))}

        <ul class="ts_transcript ts_seglist">
          {result.segments.map((seg: OutputSegment) => (
            <li
              key={seg.id}
              id={`seg-${fileId}-${seg.id}`}
              class={`ts_seg ${seg.id === activeId ? "ts_seg--active" : ""}`}
              onClick={() => seek(seg.start)}
              title={t("Jump_to_this_point", {
                ns: "ext_AI_Transcript",
                defaultValue: "Jump to this point",
              })}
            >
              <span class="ts_seg__time">{fmtTime(seg.start)}</span>
              <span class="ts_seg__text">{seg.text}</span>
              {seg.references.length > 0 && (
                <span class="ts_seg__refs">
                  {seg.references.map(
                    (r: string) =>
                      (r.match(/:/g) || []).length === 2 && (
                        <span
                          key={r}
                          class="ts_badge ts_badge--ref"
                          onClick={(e) => {
                            e.stopPropagation();
                            highlightVerse(seedBibleState, r);
                          }}
                        >
                          {fmtRef(r)}
                        </span>
                      )
                  )}
                </span>
              )}
              {seg.references.length === 0 && (
                <button
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    seedBibleState.sidebar.openSearch();
                  }}
                >
                  <span
                    class="material-symbols-outlined"
                    style={{ opacity: 0.2 }}
                  >
                    search
                  </span>
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
