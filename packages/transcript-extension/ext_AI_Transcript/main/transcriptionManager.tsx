// transcriptionManager — the single source of truth.
//
// A factory closure that holds every signal and all processing logic; the
// Preact components only read these signals and call these methods. The single
// instance is created in main.tsx and shared via Preact Context.

import { signal } from "@preact/signals";
import type {
  FileStatus,
  OutputReference,
  OutputSegment,
  QueuedFile,
  RefType,
  TranscriptionResult,
} from "ext_AI_Transcript.main.types";
import {
  decodeToPcm as decodeFileToPcm,
  getEphemeralKey as fetchEphemeralKey,
  streamTranscription,
  type EphemeralKey,
  type RawSegment,
} from "ext_AI_Transcript.main.transcribe";
import { extractExplicitRefs as extractExplicitRefsLib } from "ext_AI_Transcript.main.explicit";
import {
  inferRefs as inferRefsLib,
  type InferSegment,
} from "ext_AI_Transcript.main.infer";

const STREAM_MAX_ATTEMPTS = 3;

let idCounter = 0;
const nextId = () =>
  `f${Date.now().toString(36)}_${(idCounter++).toString(36)}`;

function createTranscriptionManager() {
  // --- State signals --------------------------------------------------------
  const translation = signal("BSB");
  const transcriptionModel = signal("gpt-4o-transcribe");
  const language = signal("en");
  const files = signal<QueuedFile[]>([]);
  const results = signal<Record<string, TranscriptionResult>>({});
  const overallProgress = signal(0); // 0..1
  const isProcessing = signal(false);
  const minConfidence = signal(0.85);
  const inferEnabled = signal(true);
  const error = signal<string | null>(null);

  // --- File queue -----------------------------------------------------------

  function addFiles(input: FileList | File[]): void {
    const incoming = Array.from(input);
    if (!incoming.length) return;
    const existing = files.value;
    const additions: QueuedFile[] = incoming.map((file) => ({
      id: nextId(),
      file,
      name:
        (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
        file.name,
      status: "queued" as FileStatus,
      progress: 0,
    }));
    files.value = [...existing, ...additions];
    recomputeOverall();
  }

  function removeFile(id: string): void {
    files.value = files.value.filter((f) => f.id !== id);
    const { [id]: _removed, ...rest } = results.value;
    void _removed;
    results.value = rest;
    recomputeOverall();
  }

  function clearFiles(): void {
    files.value = [];
    results.value = {};
    overallProgress.value = 0;
  }

  function updateFile(id: string, patch: Partial<QueuedFile>): void {
    files.value = files.value.map((f) =>
      f.id === id ? { ...f, ...patch } : f
    );
    recomputeOverall();
  }

  function recomputeOverall(): void {
    const list = files.value;
    if (!list.length) {
      overallProgress.value = 0;
      return;
    }
    let sum = 0;
    for (const f of list) {
      if (f.status === "done") sum += 1;
      else if (f.status === "error")
        sum += 1; // counts as resolved
      else sum += clamp01(f.progress);
    }
    overallProgress.value = sum / list.length;
  }

  // --- Thin wrappers (part of the public surface) ---------------------------

  function getEphemeralKey(
    model = transcriptionModel.value,
    lang = language.value
  ): Promise<EphemeralKey> {
    return fetchEphemeralKey(model, lang);
  }

  function decodeToPcm(
    file: File
  ): Promise<{ pcm: Int16Array; durationSec: number }> {
    return decodeFileToPcm(file);
  }

  function extractExplicitRefs(text: string) {
    return extractExplicitRefsLib(text);
  }

  function inferRefs(segments: InferSegment[]) {
    return inferRefsLib(segments, minConfidence.value);
  }

  // --- Transcription pipeline ----------------------------------------------

  /** Process the whole queue sequentially. */
  async function transcribeAll(): Promise<void> {
    if (isProcessing.value) return;
    isProcessing.value = true;
    error.value = null;
    try {
      for (const qf of files.value) {
        if (qf.status === "done") continue;
        try {
          await transcribeFile(qf.id);
        } catch (e) {
          updateFile(qf.id, { status: "error", error: errMsg(e), progress: 0 });
        }
      }
    } finally {
      isProcessing.value = false;
    }
  }

  /**
   * Full per-file pipeline: decode -> connect -> stream -> assemble segments ->
   * extract refs -> build output JSON. Accepts a queue id (preferred) or File.
   */
  async function transcribeFile(
    idOrFile: string | File
  ): Promise<TranscriptionResult> {
    const qf = resolveQueued(idOrFile);
    const id = qf.id;

    // 1. Decode to 24 kHz mono PCM16.
    updateFile(id, { status: "decoding", progress: 0, error: undefined });
    const { pcm, durationSec } = await decodeFileToPcm(qf.file, (f) =>
      updateFile(id, { progress: f * 0.25 })
    );
    updateFile(id, { durationSec });

    // 2 + 3. Connect and stream (fresh key per attempt, with backoff).
    const raw = await streamWithRetry(id, pcm);

    // 4. Assemble + extract references (inferred refs come from the AI; no
    //    local corpus needed).
    updateFile(id, { status: "inferring", progress: 0.9 });
    const result = await assembleResult(qf.name, durationSec, raw);

    // 5. Publish.
    results.value = { ...results.value, [id]: result };
    updateFile(id, { status: "done", progress: 1 });
    return result;
  }

  function resolveQueued(idOrFile: string | File): QueuedFile {
    if (typeof idOrFile === "string") {
      const qf = files.value.find((f) => f.id === idOrFile);
      if (!qf) throw new Error(`unknown file id ${idOrFile}`);
      return qf;
    }
    // A bare File: add it to the queue first so UI/state stays consistent.
    const existing = files.value.find((f) => f.file === idOrFile);
    if (existing) return existing;
    addFiles([idOrFile]);
    return files.value[files.value.length - 1];
  }

  async function streamWithRetry(
    id: string,
    pcm: Int16Array
  ): Promise<RawSegment[]> {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= STREAM_MAX_ATTEMPTS; attempt++) {
      try {
        updateFile(id, { status: "connecting", progress: 0.25 });
        const { key } = await getEphemeralKey();
        return await streamTranscription(
          pcm,
          key,
          transcriptionModel.value,
          language.value,
          {
            onConnected: () => updateFile(id, { status: "streaming" }),
            onSendProgress: (f) =>
              // Map send progress into the 0.25..0.9 band of the file's bar.
              updateFile(id, { progress: 0.25 + f * 0.65 }),
          }
        );
      } catch (e) {
        lastErr = e;
        if (attempt < STREAM_MAX_ATTEMPTS) {
          await sleep(500 * 2 ** (attempt - 1)); // 0.5s, 1s backoff
        }
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }

  /** Turn raw segments into the final output JSON, with references attached. */
  async function assembleResult(
    fileName: string,
    durationSec: number,
    raw: RawSegment[]
  ): Promise<TranscriptionResult> {
    // Output segments with stable ids.
    const segments: OutputSegment[] = raw.map((s, i) => ({
      id: i,
      start: round2(s.start),
      end: round2(s.end || s.start),
      text: s.text.trim(),
      references: [],
    }));

    // Full text + per-segment char ranges (joined with single spaces) so we can
    // map explicit-reference char offsets back to the segment(s) they fall in.
    const ranges: Array<{ id: number; start: number; end: number }> = [];
    let cursor = 0;
    const parts: string[] = [];
    for (const seg of segments) {
      const start = cursor;
      parts.push(seg.text);
      cursor += seg.text.length;
      ranges.push({ id: seg.id, start, end: cursor });
      cursor += 1; // the joining space
    }
    const fullText = parts.join(" ");

    const segById = new Map(segments.map((s) => [s.id, s]));
    const addRefToSeg = (segId: number, refId: string) => {
      const seg = segById.get(segId);
      if (seg && !seg.references.includes(refId)) seg.references.push(refId);
    };

    // (a) Explicit references.
    const explicitByRef = new Map<string, OutputReference>();
    if (fullText.trim()) {
      for (const m of extractExplicitRefs(fullText)) {
        const overlap = ranges.filter(
          (r) => r.start < m.end && r.end > m.start
        );
        for (const r of overlap) addRefToSeg(r.id, m.ref);
        const span = spanOf(overlap, segById);
        const existing = explicitByRef.get(m.ref);
        if (existing) {
          existing.start = minNullable(existing.start, span.start);
          existing.end = maxNullable(existing.end, span.end);
        } else {
          explicitByRef.set(m.ref, {
            ref: m.ref,
            type: m.type as RefType,
            explicit: true,
            confidence: 1.0,
            start: span.start,
            end: span.end,
          });
        }
      }
    }

    // (b) Inferred references (AI-detected quotes/paraphrases/allusions).
    const inferredByRef = new Map<string, OutputReference>();
    if (inferEnabled.value) {
      const inferInput: InferSegment[] = segments.map((s) => ({
        id: s.id,
        start: s.start,
        end: s.end,
        text: s.text,
      }));
      // Inference runs in a Web Worker; if it fails (e.g. the worker is blocked)
      // fall back to explicit-only references rather than failing the file.
      let inferred: Awaited<ReturnType<typeof inferRefs>> = [];
      try {
        inferred = await inferRefs(inferInput);
      } catch (e) {
        console.warn("inferRefs failed; using explicit refs only:", errMsg(e));
      }
      for (const inf of inferred) {
        if (explicitByRef.has(inf.ref)) continue;
        for (const segId of inf.segmentIds) addRefToSeg(segId, inf.ref);
        const prev = inferredByRef.get(inf.ref);
        if (!prev || inf.confidence > prev.confidence) {
          inferredByRef.set(inf.ref, {
            ref: inf.ref,
            type: "verse",
            explicit: false,
            confidence: inf.confidence,
            start: round2(inf.start),
            end: round2(inf.end),
            quotedText: inf.quotedText,
          });
        }
      }
    }

    const references = [
      ...explicitByRef.values(),
      ...inferredByRef.values(),
    ].sort((a, b) => (a.start ?? 0) - (b.start ?? 0));

    return {
      file: fileName,
      durationSec: round2(durationSec),
      language: language.value,
      model: transcriptionModel.value,
      translation: translation.value,
      timestampGranularity: "segment",
      segments,
      references,
    };
  }

  // --- Downloads ------------------------------------------------------------

  function downloadResult(fileId: string): void {
    const result = results.value[fileId];
    if (!result) return;
    downloadJson(jsonName(result.file), result);
  }

  function downloadAll(): void {
    const all = Object.values(results.value);
    if (!all.length) return;
    downloadJson("transcriptions.json", { results: all });
  }

  return {
    // signals
    translation,
    transcriptionModel,
    language,
    files,
    results,
    overallProgress,
    isProcessing,
    minConfidence,
    inferEnabled,
    error,
    // methods
    addFiles,
    removeFile,
    clearFiles,
    getEphemeralKey,
    decodeToPcm,
    extractExplicitRefs,
    inferRefs,
    transcribeAll,
    transcribeFile,
    downloadResult,
    downloadAll,
  };
}

// --- Helpers ----------------------------------------------------------------

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function minNullable(a: number | null, b: number | null): number | null {
  if (a == null) return b;
  if (b == null) return a;
  return Math.min(a, b);
}
function maxNullable(a: number | null, b: number | null): number | null {
  if (a == null) return b;
  if (b == null) return a;
  return Math.max(a, b);
}

function spanOf(
  overlap: Array<{ id: number }>,
  segById: Map<number, OutputSegment>
): { start: number | null; end: number | null } {
  let start: number | null = null;
  let end: number | null = null;
  for (const o of overlap) {
    const seg = segById.get(o.id);
    if (!seg) continue;
    start = minNullable(start, seg.start);
    end = maxNullable(end, seg.end);
  }
  return { start, end };
}

function jsonName(fileName: string): string {
  const base = fileName.replace(/[\\/]/g, "_").replace(/\.[^.]+$/, "");
  return `${base || "transcript"}.json`;
}

function downloadJson(name: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export { createTranscriptionManager };

/** The transcription manager instance type (created in the app's entry point). */
export type TranscriptionManager = ReturnType<
  typeof createTranscriptionManager
>;
