// ── Ribbon highlight performance probe ───────────────────────────────────────
//
// A flag-gated, low-overhead instrument for the highlight-ribbon system (see
// `measureRibbons` in BibleReader). When OFF — the default — every hook here is
// a cheap boolean check and adds nothing to the hot path. When ON it records
// per-`measureRibbons` timing and workload, runs a frame-rate meter, publishes a
// snapshot signal that the on-screen HUD reads (~4 Hz), and logs a one-line
// summary to the console each second.
//
// Turn it on any of these ways:
//   • add `?ribbonperf=1` to the URL (use `=0` to force off),
//   • set `localStorage["sb.ribbonperf"] = "1"`, or
//   • run `__ribbonPerf.enable()` in the console.
// Reading a phone with no cable: the HUD paints on screen directly. For desktop
// DevTools or Android remote debugging, the same numbers land in the console.

import { signal, type ReadonlySignal } from "@preact/signals";

const STORAGE_KEY = "sb.ribbonperf";
const LONG_FRAME_MS = 50; // a frame slower than this is "janky" (< ~20fps)
const HUD_HZ = 4; // HUD refresh rate while enabled
const WINDOW_MS = 1000; // rolling window for per-second stats

/** One `measureRibbons` pass. */
export interface RibbonMeasureSample {
  /** Which effect drove this pass. */
  trigger: "layout" | "resize";
  /** Whole `measureRibbons` call. */
  totalMs: number;
  /** Layout reads: getBoundingClientRect + getComputedStyle + getClientRects. */
  measureMs: number;
  /** Path building: neighbour trim + buildRibbonPath over every run. */
  buildMs: number;
  /** The signature `JSON.stringify`. */
  stringifyMs: number;
  /** Did the pass actually change the drawn ribbons? */
  changed: boolean;
  /** Highlighted runs measured. */
  runs: number;
  /** Total per-line rectangles across all runs. */
  rects: number;
  /** SVG <path> nodes emitted. */
  paths: number;
  /** Total characters across all path `d` strings. */
  pathChars: number;
}

/** Live view the HUD renders from. */
export interface RibbonPerfSnapshot {
  enabled: boolean;
  /** Most recent sample, kept even when idle so the HUD doesn't blank out. */
  last: RibbonMeasureSample | null;
  totalCalls: number;
  /** measureRibbons calls in the last second. */
  callsPerSec: number;
  /** How many of the last second's calls actually redrew. */
  changedPerSec: number;
  /** Sum of totalMs over the last second — script time spent measuring. */
  msPerSec: number;
  /** Mean totalMs over the last second. */
  avgTotalMs: number;
  /** Worst totalMs since the last reset. */
  maxTotalMs: number;
  fps: number;
  /** Frames slower than LONG_FRAME_MS in the last second. */
  longFrames: number;
  /** Slowest frame (ms) in the last second. */
  worstFrameMs: number;
}

function emptySnapshot(enabled: boolean): RibbonPerfSnapshot {
  return {
    enabled,
    last: null,
    totalCalls: 0,
    callsPerSec: 0,
    changedPerSec: 0,
    msPerSec: 0,
    avgTotalMs: 0,
    maxTotalMs: 0,
    fps: 0,
    longFrames: 0,
    worstFrameMs: 0,
  };
}

interface TimedSample {
  t: number;
  s: RibbonMeasureSample;
}

let enabled = detectEnabled();
const snapshot = signal<RibbonPerfSnapshot>(emptySnapshot(enabled));

/** Snapshot signal the HUD subscribes to. */
export const ribbonPerfSnapshot: ReadonlySignal<RibbonPerfSnapshot> = snapshot;

const sampleBuf: TimedSample[] = []; // measure samples in the last WINDOW_MS
const frameTimes: number[] = []; // rAF timestamps in the last WINDOW_MS
let lastSample: RibbonMeasureSample | null = null;
let totalCalls = 0;
let maxTotalMs = 0;

let rafId = 0;
let lastFrameT = 0;
let lastHudT = 0;
let lastLogT = 0;

function detectEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has("ribbonperf")) {
      const v = params.get("ribbonperf");
      const on = v !== "0" && v !== "false";
      // Persist so the choice survives reloads on a phone (where you enable it
      // by typing the URL, not from a console).
      try {
        window.localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
      } catch {
        // localStorage unavailable — the URL param still applies for this load.
      }
      return on;
    }
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** True when profiling is on — callers gate their timing on this. */
export function ribbonPerfEnabled(): boolean {
  return enabled;
}

/** Record one `measureRibbons` pass. No-op when disabled. */
export function recordRibbonMeasure(s: RibbonMeasureSample): void {
  if (!enabled) return;
  const now = perfNow();
  sampleBuf.push({ t: now, s });
  lastSample = s;
  totalCalls += 1;
  if (s.totalMs > maxTotalMs) maxTotalMs = s.totalMs;
  trimWindow(now);
}

function perfNow(): number {
  return typeof performance !== "undefined" ? performance.now() : 0;
}

function trimWindow(now: number): void {
  const cutoff = now - WINDOW_MS;
  while (sampleBuf.length && sampleBuf[0]!.t < cutoff) sampleBuf.shift();
  while (frameTimes.length && frameTimes[0]! < cutoff) frameTimes.shift();
}

function computeSnapshot(now: number): RibbonPerfSnapshot {
  trimWindow(now);
  const calls = sampleBuf.length;
  let msPerSec = 0;
  let changedPerSec = 0;
  for (const { s } of sampleBuf) {
    msPerSec += s.totalMs;
    if (s.changed) changedPerSec += 1;
  }
  let longFrames = 0;
  let worstFrameMs = 0;
  for (let i = 1; i < frameTimes.length; i++) {
    const d = frameTimes[i]! - frameTimes[i - 1]!;
    if (d > LONG_FRAME_MS) longFrames += 1;
    if (d > worstFrameMs) worstFrameMs = d;
  }
  return {
    enabled,
    last: lastSample,
    totalCalls,
    callsPerSec: calls,
    changedPerSec,
    msPerSec,
    avgTotalMs: calls ? msPerSec / calls : 0,
    maxTotalMs,
    fps: frameTimes.length,
    longFrames,
    worstFrameMs,
  };
}

function logSummary(s: RibbonPerfSnapshot): void {
  const last = s.last;
  const lastStr = last
    ? `last ${last.totalMs.toFixed(2)}ms (${last.trigger}) m${last.measureMs.toFixed(
        2
      )} b${last.buildMs.toFixed(2)} s${last.stringifyMs.toFixed(2)} | runs ${
        last.runs
      } rects ${last.rects} paths ${last.paths} chars ${last.pathChars}`
    : "last —";
  console.log(
    `[ribbonperf] fps ${s.fps} (long ${s.longFrames}, worst ${s.worstFrameMs.toFixed(
      0
    )}ms) | calls ${s.callsPerSec}/s redraw ${s.changedPerSec}/s | script ${s.msPerSec.toFixed(
      1
    )}ms/s avg ${s.avgTotalMs.toFixed(2)} max ${s.maxTotalMs.toFixed(2)} | ${lastStr}`
  );
}

/**
 * A labeled, pasteable text block of a snapshot — used by the HUD's copy button.
 * Includes a timestamp and user-agent so captures from different devices (this
 * computer vs. the phone) identify themselves when pasted side by side.
 */
export function formatRibbonPerf(s: RibbonPerfSnapshot): string {
  const when = typeof Date !== "undefined" ? new Date().toISOString() : "";
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const last = s.last;
  const lastLine = last
    ? `last: ${last.totalMs.toFixed(2)}ms (${last.trigger}) — m ${last.measureMs.toFixed(
        2
      )} / b ${last.buildMs.toFixed(2)} / s ${last.stringifyMs.toFixed(2)}`
    : "last: —";
  const workload = last
    ? `workload: runs ${last.runs}, rects ${last.rects}, paths ${last.paths}, chars ${last.pathChars}`
    : "workload: —";
  return [
    `ribbon perf @ ${when}`,
    `ua: ${ua}`,
    `fps: ${s.fps} (long ${s.longFrames}, worst ${s.worstFrameMs.toFixed(0)}ms)`,
    `calls: ${s.callsPerSec}/s, redraw ${s.changedPerSec}/s, total ${s.totalCalls}`,
    `script: ${s.msPerSec.toFixed(1)}ms/s, avg ${s.avgTotalMs.toFixed(
      2
    )}ms, max ${s.maxTotalMs.toFixed(2)}ms`,
    lastLine,
    workload,
  ].join("\n");
}

function loop(now: number): void {
  if (lastFrameT) frameTimes.push(now);
  lastFrameT = now;
  trimWindow(now);

  if (now - lastHudT >= 1000 / HUD_HZ) {
    lastHudT = now;
    snapshot.value = computeSnapshot(now);
  }
  if (now - lastLogT >= 1000) {
    lastLogT = now;
    logSummary(snapshot.value);
  }
  rafId = requestAnimationFrame(loop);
}

function startLoop(): void {
  if (rafId || typeof requestAnimationFrame === "undefined") return;
  lastFrameT = 0;
  lastHudT = 0;
  lastLogT = 0;
  rafId = requestAnimationFrame(loop);
}

function stopLoop(): void {
  if (rafId && typeof cancelAnimationFrame !== "undefined") {
    cancelAnimationFrame(rafId);
  }
  rafId = 0;
}

/** Clear all accumulated stats. */
export function resetRibbonPerf(): void {
  sampleBuf.length = 0;
  frameTimes.length = 0;
  lastSample = null;
  totalCalls = 0;
  maxTotalMs = 0;
  snapshot.value = emptySnapshot(enabled);
}

function setEnabled(next: boolean): void {
  if (next === enabled) return;
  enabled = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    // localStorage may be unavailable (private mode / SSR) — ignore.
  }
  if (next) {
    resetRibbonPerf();
    startLoop();
  } else {
    stopLoop();
    resetRibbonPerf();
  }
}

/** Turn profiling on at runtime (also persisted to localStorage). */
export function enableRibbonPerf(): void {
  setEnabled(true);
}

/** Turn profiling off at runtime. */
export function disableRibbonPerf(): void {
  setEnabled(false);
}

declare global {
  interface Window {
    __ribbonPerf?: {
      enable: () => void;
      disable: () => void;
      reset: () => void;
      snapshot: () => RibbonPerfSnapshot;
    };
  }
}

if (typeof window !== "undefined") {
  window.__ribbonPerf = {
    enable: enableRibbonPerf,
    disable: disableRibbonPerf,
    reset: resetRibbonPerf,
    snapshot: () => snapshot.value,
  };
  if (enabled) startLoop();
}
