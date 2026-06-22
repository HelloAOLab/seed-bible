import { useEffect, useRef, useState } from "preact/hooks";
import { useManager } from "ext_AI_Transcript.main.context";
import type { TranscriptionResult } from "ext_AI_Transcript.main.types";

function fmtTime(sec: number | null): string {
  if (sec == null || !Number.isFinite(sec)) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toFixed(0)}`;
}

/**
 * Format an OSIS ref id for display: "GEN:1:3" -> "Gen 1:3".
 * Lowercases the book code, then capitalizes its first letter (so numbered
 * books read correctly too, e.g. "1CO:1:1" -> "1Co 1:1").
 */
function fmtRef(ref: string): string {
  const [book, chapter, verse] = ref.split(":");
  const b = (book ?? "").toLowerCase().replace(/[a-z]/, (c) => c.toUpperCase());
  if (verse != null) return `${b} ${chapter}:${verse}`;
  if (chapter != null) return `${b} ${chapter}`;
  return b;
}

export function ResultView({
  fileId,
  result,
}: {
  fileId: string;
  result: TranscriptionResult;
}) {
  const context = useManager();
  const tm = context.transcriptionManager;
  const seedBibleState = context.seedBibleState;
  const file = tm.files.value.find((f) => f.id === fileId)?.file;
  const isVideo = !!file && file.type.startsWith("video");

  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const [src, setSrc] = useState<string | undefined>(undefined);
  const [activeId, setActiveId] = useState<number | null>(null);

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

  const highlightVerse = async (ref: string) => {
    const [book, chapter, verse] = ref.split(":");

    const selectedTabId = seedBibleState.tabs.selectedTabId;

    const selectedTab = seedBibleState.tabs.tabs.value.find(
      (tab) => tab.id === selectedTabId.value
    );

    const currentReadingState = seedBibleState.app.currentReadingState.value;

    if (selectedTab && book && chapter) {
      await selectedTab.readingState.selectTranslationAndChapter(
        currentReadingState.translationId,
        book,
        Number(chapter),
        verse
          ? {
              scrollToVerse: Number(verse),
            }
          : {}
      );
      if (verse) {
        selectedTab.readingState.decorateVerses(
          book,
          Number(chapter),
          Number(verse),
          {
            className: "sb-verse-decoration-initial-verse-highlight",
            removeAfterMs: 5000,
          }
        );
      }
    }
  };

  return (
    <article class="ts_result">
      <header class="ts_result__head">
        <strong class="ts_result__file">{result.file}</strong>
        <span class="ts_result__stats">
          {result.segments.length} segments · {result.references.length} refs
        </span>
        <span class="ts_result__spacer" />
        <button
          class="ts_btn ts_btn--sm"
          onClick={() => tm.downloadResult(fileId)}
        >
          Download JSON
        </button>
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
          {result.segments.map((seg) => (
            <li
              key={seg.id}
              id={`seg-${fileId}-${seg.id}`}
              class={`ts_seg ${seg.id === activeId ? "ts_seg--active" : ""}`}
              onClick={() => seek(seg.start)}
              title="Jump to this point"
            >
              <span class="ts_seg__time">{fmtTime(seg.start)}</span>
              <span class="ts_seg__text">{seg.text}</span>
              {seg.references.length > 0 && (
                <span class="ts_seg__refs">
                  {seg.references.map((r) => (
                    <span
                      key={r}
                      class="ts_badge ts_badge--ref"
                      onClick={(e) => {
                        e.stopPropagation();
                        highlightVerse(r);
                      }}
                    >
                      {fmtRef(r)}
                    </span>
                  ))}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
