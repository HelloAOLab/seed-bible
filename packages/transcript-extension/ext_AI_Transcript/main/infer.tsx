// Inferred reference extraction: scripture QUOTED without a spoken citation.
//
// The matcher slides a window over the transcript's normalized tokens and
// fuzzy-matches each verse's normalized text by token overlap, then maps the
// best window back to the segments it spans (to recover timestamps and attach
// the ref to every overlapping segment).
//
// WHY A WORKER: this is an inherently loop-heavy scan over the whole verse index
// (~31k verses, each with an inner sliding-window pass). The AUX interpreter
// caps loop iterations with an "energy" budget that is shared across the entire
// run and is NOT refreshed by awaits (async results resolve without resetting
// it), so a scan this size always overruns it ("Ran out of energy"). We instead
// run the algorithm in a Web Worker — plain browser JS that the AUX compiler
// never transpiles, so it carries no energy checks and has no limit. The bot
// side only does I/O: post the inputs, await the result.

import type { VerseIndexEntry } from "ext_AI_Transcript.main.types";

/** A segment as seen by the matcher (timestamps + text). */
export interface InferSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

export interface InferredRef {
  ref: string;
  type: "verse";
  explicit: false;
  confidence: number;
  start: number;
  end: number;
  quotedText: string;
  /** Segments the quote overlaps (refs get attached to each). */
  segmentIds: number[];
}

// --- Worker source ----------------------------------------------------------
//
// Plain JS, run by the browser OUTSIDE the AUX interpreter (so ordinary loops
// are fine here). Kept as a string literal because the worker is loaded from a
// blob URL and cannot import the extension's modules — and because bot-
// transpiled function source carries __energyCheck() calls that don't exist in
// a worker. normalizeText mirrors corpus.normalizeText so tokenization matches.
//
// Note: backslashes are doubled so the template literal yields single
// backslashes in the emitted worker source (e.g. \\s+ -> \s+).
const WORKER_SOURCE = `
const MIN_VERSE_TOKENS = 4;
const MIN_MATCHED_TOKENS = 4;
const SPAN_SLACK = 1.8;
const SPAN_PAD = 4;
const MAX_POSITIONS = 5000;

function normalizeText(s) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\\p{L}\\p{N}]+/gu, " ")
    .replace(/\\s+/g, " ")
    .trim();
}

function buildTokenStream(segments) {
  const norm = [], orig = [], seg = [];
  const segStart = new Map(), segEnd = new Map();
  for (const s of segments) {
    segStart.set(s.id, s.start);
    segEnd.set(s.id, s.end);
    for (const word of s.text.split(/\\s+/)) {
      if (!word) continue;
      const n = normalizeText(word);
      if (!n) continue;
      for (const nt of n.split(" ")) {
        norm.push(nt); orig.push(word); seg.push(s.id);
      }
    }
  }
  return { norm, orig, seg, segStart, segEnd };
}

function buildInverted(norm) {
  const inv = new Map();
  for (let i = 0; i < norm.length; i++) {
    const t = norm[i];
    let arr = inv.get(t);
    if (!arr) inv.set(t, (arr = []));
    arr.push(i);
  }
  return inv;
}

function bestWindow(verseTokenSet, inv, norm) {
  const positions = [];
  for (const t of verseTokenSet) {
    const arr = inv.get(t);
    if (arr) for (const p of arr) positions.push(p);
  }
  if (positions.length < MIN_MATCHED_TOKENS) return null;
  if (positions.length > MAX_POSITIONS) return null;
  positions.sort((a, b) => a - b);
  const maxSpan = Math.round(verseTokenSet.size * SPAN_SLACK) + SPAN_PAD;
  const counts = new Map();
  let lo = 0, best = null;
  for (let hi = 0; hi < positions.length; hi++) {
    const wordHi = norm[positions[hi]];
    counts.set(wordHi, (counts.get(wordHi) ?? 0) + 1);
    while (positions[hi] - positions[lo] > maxSpan) {
      const wordLo = norm[positions[lo]];
      const c = (counts.get(wordLo) ?? 0) - 1;
      if (c <= 0) counts.delete(wordLo); else counts.set(wordLo, c);
      lo++;
    }
    const matched = counts.size;
    if (!best || matched > best.matched) {
      best = { matched, startIdx: positions[lo], endIdx: positions[hi] };
    }
  }
  return best;
}

function inferRefs(segments, verseIndex, minConfidence) {
  if (!segments.length || !verseIndex.length) return [];
  const stream = buildTokenStream(segments);
  if (stream.norm.length < MIN_MATCHED_TOKENS) return [];
  const inv = buildInverted(stream.norm);
  const threshold = Math.max(minConfidence, 0);
  const out = [];
  for (const verse of verseIndex) {
    const tokens = verse.normalizedText.split(" ").filter(Boolean);
    if (tokens.length < MIN_VERSE_TOKENS) continue;
    const tokenSet = new Set(tokens);
    const win = bestWindow(tokenSet, inv, stream.norm);
    if (!win || win.matched < MIN_MATCHED_TOKENS) continue;
    const confidence = win.matched / tokenSet.size;
    if (confidence < threshold) continue;
    const segIds = [];
    let start = Infinity, end = -Infinity;
    const seen = new Set();
    for (let i = win.startIdx; i <= win.endIdx; i++) {
      const sid = stream.seg[i];
      if (!seen.has(sid)) {
        seen.add(sid);
        segIds.push(sid);
        start = Math.min(start, stream.segStart.get(sid) ?? 0);
        end = Math.max(end, stream.segEnd.get(sid) ?? 0);
      }
    }
    const quotedText = stream.orig.slice(win.startIdx, win.endIdx + 1).join(" ");
    out.push({
      ref: verse.ref,
      type: "verse",
      explicit: false,
      confidence: Number(confidence.toFixed(3)),
      start: start === Infinity ? 0 : start,
      end: end === -Infinity ? 0 : end,
      quotedText,
      segmentIds: segIds,
    });
  }
  out.sort((a, b) => a.start - b.start || b.confidence - a.confidence);
  return out;
}

self.onmessage = (e) => {
  const data = e.data || {};
  try {
    const refs = inferRefs(data.segments, data.verseIndex, data.minConfidence);
    self.postMessage({ id: data.id, refs });
  } catch (err) {
    self.postMessage({
      id: data.id,
      error: err && err.message ? err.message : String(err),
    });
  }
};
`;

// --- Worker client (runs in the bot context; I/O only) ----------------------

let worker: Worker | null = null;
let workerUrl: string | null = null;
let reqId = 0;
const pending = new Map<
  number,
  { resolve: (refs: InferredRef[]) => void; reject: (err: Error) => void }
>();

function teardownWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  if (workerUrl) {
    URL.revokeObjectURL(workerUrl);
    workerUrl = null;
  }
}

function ensureWorker(): Worker {
  if (worker) return worker;
  const blob = new Blob([WORKER_SOURCE], { type: "text/javascript" });
  workerUrl = URL.createObjectURL(blob);
  worker = new Worker(workerUrl);
  worker.onmessage = (e: MessageEvent) => {
    const { id, refs, error } = (e.data ?? {}) as {
      id: number;
      refs?: InferredRef[];
      error?: string;
    };
    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);
    if (error) p.reject(new Error(error));
    else p.resolve(refs ?? []);
  };
  worker.onerror = (e: ErrorEvent) => {
    const err = new Error(e.message || "inference worker error");
    pending.forEach((p) => p.reject(err));
    pending.clear();
    teardownWorker(); // next call rebuilds a fresh worker
  };
  return worker;
}

/**
 * Infer references for quoted scripture. Returns one entry per matched verse
 * (consecutive verses each emit their own id), filtered by minConfidence.
 *
 * The heavy matching runs in a Web Worker; this resolves with its result.
 */
export function inferRefs(
  segments: InferSegment[],
  verseIndex: VerseIndexEntry[],
  minConfidence: number
): Promise<InferredRef[]> {
  if (!segments.length || !verseIndex.length) return Promise.resolve([]);
  const w = ensureWorker();
  const id = ++reqId;
  return new Promise<InferredRef[]>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, segments, verseIndex, minConfidence });
  });
}
