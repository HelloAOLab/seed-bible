/* eslint-disable seed-bible-i18n/i18n-untranslated-content --
   This is a dev-only performance overlay; its labels are debug text and must
   never be translated. */
import { useRef, useState } from "preact/hooks";
import { ribbonPerfSnapshot, formatRibbonPerf } from "../../app/ribbonPerf";
import "./RibbonPerfHud.css";

// Copy `text` to the clipboard, falling back to a hidden <textarea> +
// execCommand for older Android WebViews without the async clipboard API. Must
// be called from a user gesture (the copy button's click).
async function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(ta);
  if (!ok) throw new Error("copy failed");
}

// A tiny on-screen readout for the highlight-ribbon performance probe. It is
// `pointer-events: none` so it never intercepts scroll or touch while you are
// profiling (the copy button re-enables pointer events for itself only), and it
// renders nothing unless the probe is enabled (see `ribbonPerf.ts`). Mounted
// once at the app root.
export function RibbonPerfHud() {
  const s = ribbonPerfSnapshot.value;
  const [copyState, setCopyState] = useState<"idle" | "ok" | "err">("idle");
  const timer = useRef<number | undefined>(undefined);

  if (!s.enabled) return null;

  const copy = async () => {
    try {
      await writeClipboard(formatRibbonPerf(s));
      setCopyState("ok");
    } catch {
      setCopyState("err");
    }
    if (timer.current !== undefined) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopyState("idle"), 1200);
  };

  const last = s.last;
  return (
    <div className="sb-ribbon-perf-hud" aria-hidden="true">
      <div className="sb-ribbon-perf-hud-header">
        <span className="sb-ribbon-perf-hud-title">ribbon perf</span>
        <button
          type="button"
          className="sb-ribbon-perf-hud-copy"
          onClick={copy}
        >
          {copyState === "ok"
            ? "copied"
            : copyState === "err"
              ? "failed"
              : "copy"}
        </button>
      </div>
      <div>
        fps {s.fps} · long {s.longFrames} · worst {s.worstFrameMs.toFixed(0)}ms
      </div>
      <div>
        calls {s.callsPerSec}/s · redraw {s.changedPerSec}/s
      </div>
      <div>
        script {s.msPerSec.toFixed(1)}ms/s · avg {s.avgTotalMs.toFixed(2)} · max{" "}
        {s.maxTotalMs.toFixed(2)}
      </div>
      <div className="sb-ribbon-perf-hud-sep" />
      {last ? (
        <>
          <div>
            last {last.totalMs.toFixed(2)}ms ({last.trigger})
          </div>
          <div>
            m {last.measureMs.toFixed(2)} · b {last.buildMs.toFixed(2)} · s{" "}
            {last.stringifyMs.toFixed(2)}
          </div>
          <div>
            runs {last.runs} · rects {last.rects} · paths {last.paths}
          </div>
          <div>chars {last.pathChars}</div>
        </>
      ) : (
        <div>waiting…</div>
      )}
    </div>
  );
}
