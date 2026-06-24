import { FFmpeg } from "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.15/+esm";
import {
  fetchFile,
  toBlobURL,
} from "https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.2/+esm";

// --- Config constants -------------------------------------------------------

export const GET_TRANSCRIPTION_KEY_URL =
  "https://aolab-bible-api.netlify.app/api/ai/getTranscriptionKey";

export const REALTIME_URL = "wss://api.openai.com/v1/realtime";

// The single-threaded ffmpeg core (wasm) is fetched from the CDN at load time.
const FFMPEG_CORE_VERSION = "0.12.10";
const FFMPEG_CORE_BASE = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`;
// The FFmpeg class spawns a worker. Since the class itself is imported from a
// CDN, its default `new URL("./worker.js", import.meta.url)` would be a
// cross-origin Worker (blocked). We instead load the self-contained `+esm`
// worker bundle as a same-origin blob via classWorkerURL.
const FFMPEG_WORKER_URL = `https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.15/dist/esm/worker.js/+esm`;

const SAMPLE_RATE = 24000; // Hz, mono, s16le
const CHUNK_MS = 200; // audio per append message
const TRAILING_SILENCE_MS = 700; // nudge server VAD to commit the last utterance
const QUIET_FLUSH_MS = 2500; // resolve after this much post-flush silence
const MAX_STREAM_MS = 1000 * 60 * 30; // hard cap to avoid hanging forever

// --- Ephemeral key ----------------------------------------------------------

export interface EphemeralKey {
  key: string;
  expiresAt: number; // unix seconds
  session: unknown;
}

export async function getEphemeralKey(
  model?: string,
  language?: string
): Promise<EphemeralKey> {
  const url = new URL(GET_TRANSCRIPTION_KEY_URL);
  if (model) url.searchParams.set("model", model);
  if (language) url.searchParams.set("language", language);

  const res = await web.get(url.toString());
  if (!res.data) throw new Error(`getTranscriptionKey ${res.status}`);
  const json = res.data as {
    data?: { value?: string; expires_at?: number; session?: unknown };
  };
  const value = json.data?.value;
  if (!value) throw new Error("getTranscriptionKey: missing data.value");
  return {
    key: value,
    expiresAt: json.data?.expires_at ?? 0,
    session: json.data?.session,
  };
}

// --- ffmpeg.wasm decode -----------------------------------------------------

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoad: Promise<FFmpeg> | null = null;

async function loadFfmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (!ffmpegLoad) {
    ffmpegLoad = (async () => {
      const ffmpeg = new FFmpeg();
      // toBlobURL re-serves each CDN asset as a same-origin blob, which keeps
      // the worker + core working under cross-origin-isolation (COEP) and lets
      // the class worker run despite being fetched cross-origin.
      await ffmpeg.load({
        classWorkerURL: await toBlobURL(FFMPEG_WORKER_URL, "text/javascript"),
        coreURL: await toBlobURL(
          `${FFMPEG_CORE_BASE}/ffmpeg-core.js`,
          "text/javascript"
        ),
        wasmURL: await toBlobURL(
          `${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`,
          "application/wasm"
        ),
      });
      ffmpegInstance = ffmpeg;
      return ffmpeg;
    })();
  }
  return ffmpegLoad;
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0
    ? name
        .slice(i + 1)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
    : "";
}

export interface DecodedAudio {
  pcm: Int16Array;
  durationSec: number;
}

/**
 * Decode any audio/video file to 24 kHz mono PCM16 using ffmpeg.wasm.
 * `onProgress` reports 0..1 during transcode.
 */
export async function decodeToPcm(
  file: File,
  onProgress?: (fraction: number) => void
): Promise<DecodedAudio> {
  const ffmpeg = await loadFfmpeg();

  const ext = extOf(file.name) || "bin";
  const inName = `input.${ext}`;
  const outName = "output.raw";

  const onProg = ({ progress }: { progress: number }) => {
    if (Number.isFinite(progress))
      onProgress?.(Math.max(0, Math.min(progress, 1)));
  };
  ffmpeg.on("progress", onProg);

  try {
    await ffmpeg.writeFile(inName, await fetchFile(file));
    await ffmpeg.exec([
      "-i",
      inName,
      "-vn", // ignore any video stream
      "-ac",
      "1",
      "-ar",
      String(SAMPLE_RATE),
      "-f",
      "s16le",
      "-acodec",
      "pcm_s16le",
      outName,
    ]);
    const data = (await ffmpeg.readFile(outName)) as Uint8Array;
    // Copy into a fresh, properly-aligned buffer before viewing as Int16.
    const bytes = new Uint8Array(data);
    const pcm = new Int16Array(
      bytes.buffer,
      bytes.byteOffset,
      Math.floor(bytes.byteLength / 2)
    );
    const durationSec = pcm.length / SAMPLE_RATE;
    onProgress?.(1);
    return { pcm, durationSec };
  } finally {
    ffmpeg.off("progress", onProg);
    // Best-effort cleanup of the virtual FS.
    try {
      await ffmpeg.deleteFile(inName);
      await ffmpeg.deleteFile(outName);
    } catch {
      /* ignore */
    }
  }
}

// --- Realtime streaming -----------------------------------------------------

export interface RawSegment {
  itemId: string;
  start: number; // seconds
  end: number; // seconds
  text: string;
  /** True once the server has emitted the final transcript for this segment. */
  done?: boolean;
}

export interface StreamCallbacks {
  /** Called once the socket is open and configured. */
  onConnected?: () => void;
  /** Fraction of audio sent, 0..1. */
  onSendProgress?: (fraction: number) => void;
}

function bytesToBase64(data: Uint8Array): string {
  // Use the AUX runtime's `bytes` helper rather than native `btoa`: in the
  // sandboxed interpreter native Web APIs lose their `this` and throw
  // "Illegal invocation".
  return bytes.toBase64String(data);
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Stream PCM16 to a realtime transcription session and resolve with the
 * assembled raw segments (segment/utterance-level timestamps from server VAD).
 */
export function streamTranscription(
  pcm: Int16Array,
  key: string,
  model: string,
  language: string,
  callbacks: StreamCallbacks = {}
): Promise<RawSegment[]> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const ws = new WebSocket(REALTIME_URL, [
      "realtime",
      `openai-insecure-api-key.${key}`,
    ]);

    // itemId -> assembled segment.
    const segments = new Map<string, RawSegment>();
    const getSeg = (itemId: string): RawSegment => {
      let s = segments.get(itemId);
      if (!s) {
        s = { itemId, start: 0, end: 0, text: "" };
        segments.set(itemId, s);
      }
      return s;
    };

    let quietTimer: ReturnType<typeof setTimeout> | null = null;
    let hardTimer: ReturnType<typeof setTimeout> | null = null;
    let flushing = false;

    const cleanup = () => {
      if (quietTimer) clearTimeout(quietTimer);
      if (hardTimer) clearTimeout(hardTimer);
      try {
        if (
          ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING
        ) {
          ws.close();
        }
      } catch {
        /* ignore */
      }
    };

    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      const list = [...segments.values()]
        .filter((s) => s.text.trim().length > 0)
        .sort((a, b) => a.start - b.start);
      resolve(list);
    };

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    const armQuietTimer = () => {
      if (!flushing) return;
      if (quietTimer) clearTimeout(quietTimer);
      quietTimer = setTimeout(finish, QUIET_FLUSH_MS);
    };

    ws.onerror = () => fail(new Error("realtime socket error"));
    ws.onclose = (ev) => {
      if (settled) return;
      // A clean close after we have data is fine; otherwise it's a failure.
      if (segments.size > 0) finish();
      else fail(new Error(`realtime closed (${ev.code})`));
    };

    ws.onmessage = (ev) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(typeof ev.data === "string" ? ev.data : "");
      } catch {
        return;
      }
      const type = msg.type as string | undefined;
      if (!type) return;

      switch (type) {
        case "input_audio_buffer.speech_started": {
          const id = msg.item_id as string;
          const ms = (msg.audio_start_ms as number) ?? 0;
          if (id) getSeg(id).start = ms / 1000;
          break;
        }
        case "input_audio_buffer.speech_stopped": {
          const id = msg.item_id as string;
          const ms = (msg.audio_end_ms as number) ?? 0;
          if (id) getSeg(id).end = ms / 1000;
          break;
        }
        case "conversation.item.input_audio_transcription.delta": {
          const id = msg.item_id as string;
          const delta = (msg.delta as string) ?? "";
          if (id) getSeg(id).text += delta;
          armQuietTimer();
          break;
        }
        case "conversation.item.input_audio_transcription.completed": {
          const id = msg.item_id as string;
          const transcript = (msg.transcript as string) ?? "";
          if (id) {
            const s = getSeg(id);
            // The completed transcript is authoritative over accumulated deltas.
            if (transcript) s.text = transcript;
            if (s.end === 0 && s.start > 0) s.end = s.start; // best effort
          }
          armQuietTimer();
          break;
        }
        case "error": {
          const e = msg.error as { message?: string } | undefined;
          // Session-config errors are non-fatal if transcription still flows;
          // surface only if we never get any data (handled by onclose/timeout).
          console.warn("realtime error:", e?.message ?? msg);
          break;
        }
      }
    };

    ws.onopen = async () => {
      // Configure the transcription session (GA unified session.update).
      ws.send(
        JSON.stringify({
          type: "session.update",
          session: {
            type: "transcription",
            audio: {
              input: {
                format: { type: "audio/pcm", rate: SAMPLE_RATE },
                transcription: { model, language },
                turn_detection: { type: "server_vad" },
              },
            },
            include: ["item.input_audio_transcription.logprobs"],
          },
        })
      );
      callbacks.onConnected?.();

      hardTimer = setTimeout(() => {
        if (segments.size > 0) finish();
        else fail(new Error("realtime stream timed out"));
      }, MAX_STREAM_MS);

      try {
        await pumpAudio(ws, pcm, callbacks.onSendProgress);
        if (settled) return;
        // Trailing silence to trigger the final VAD commit, then begin flush.
        await pumpSilence(ws);
        flushing = true;
        armQuietTimer();
      } catch (err) {
        fail(err instanceof Error ? err : new Error(String(err)));
      }
    };
  });
}

async function waitForDrain(ws: WebSocket): Promise<void> {
  // Avoid unbounded buffering when pushing faster than real time.
  while (ws.bufferedAmount > 1 << 20 && ws.readyState === WebSocket.OPEN) {
    await delay(10);
  }
}

async function pumpAudio(
  ws: WebSocket,
  pcm: Int16Array,
  onSendProgress?: (fraction: number) => void
): Promise<void> {
  const samplesPerChunk = Math.floor((SAMPLE_RATE * CHUNK_MS) / 1000);
  const total = pcm.length;
  for (let off = 0; off < total; off += samplesPerChunk) {
    if (ws.readyState !== WebSocket.OPEN)
      throw new Error("socket closed mid-send");
    const slice = pcm.subarray(off, Math.min(off + samplesPerChunk, total));
    const bytes = new Uint8Array(
      slice.buffer,
      slice.byteOffset,
      slice.byteLength
    );
    ws.send(
      JSON.stringify({
        type: "input_audio_buffer.append",
        audio: bytesToBase64(bytes),
      })
    );
    onSendProgress?.(Math.min((off + samplesPerChunk) / total, 1));
    await waitForDrain(ws);
  }
  onSendProgress?.(1);
}

async function pumpSilence(ws: WebSocket): Promise<void> {
  const samples = Math.floor((SAMPLE_RATE * TRAILING_SILENCE_MS) / 1000);
  const silence = new Int16Array(samples); // zero-filled
  const bytes = new Uint8Array(
    silence.buffer,
    silence.byteOffset,
    silence.byteLength
  );
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(
    JSON.stringify({
      type: "input_audio_buffer.append",
      audio: bytesToBase64(bytes),
    })
  );
  await waitForDrain(ws);
}

// --- Live (microphone) transcription ----------------------------------------

export interface LiveCallbacks {
  /** Called once the socket is open and configured. */
  onConnected?: () => void;
  /** Called whenever the assembled segments change (live partial results). */
  onSegments?: (segments: RawSegment[]) => void;
}

export interface LiveSession {
  /**
   * Stop capture, flush the final transcripts, and resolve with the assembled
   * segments and the recording duration.
   */
  stop(): Promise<{ segments: RawSegment[]; durationSec: number }>;
}

/** Float32 audio [-1,1] -> 16-bit PCM, downsampling (nearest) if rates differ. */
function floatToPcm16(
  input: Float32Array,
  inRate: number,
  outRate: number
): Int16Array {
  let data = input;
  if (inRate !== outRate && outRate > 0) {
    const ratio = inRate / outRate;
    const outLen = Math.max(1, Math.floor(input.length / ratio));
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) out[i] = input[Math.floor(i * ratio)] ?? 0;
    data = out;
  }
  // Int16Array.from runs natively (no AUX energy checks, unlike a for-loop).
  return Int16Array.from(data, (v) => {
    const c = v < -1 ? -1 : v > 1 ? 1 : v;
    return (c * 0x7fff) | 0;
  });
}

/**
 * Open a realtime transcription session fed from the microphone. Resolves once
 * the mic + socket are live; partial segments arrive via callbacks.onSegments.
 * Call the returned handle's stop() to finish and get the final segments.
 */
export async function startMicTranscription(
  key: string,
  model: string,
  language: string,
  callbacks: LiveCallbacks = {}
): Promise<LiveSession> {
  // 1. Microphone.
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  // 2. Audio graph: mic -> (resampled to 24 kHz) -> PCM chunks.
  const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
  const ctxRate = ctx.sampleRate;
  const source = ctx.createMediaStreamSource(stream);
  const processor = ctx.createScriptProcessor(4096, 1, 1);

  // 4. Realtime socket + segment assembly (same protocol as streamTranscription).
  const ws = new WebSocket(REALTIME_URL, [
    "realtime",
    `openai-insecure-api-key.${key}`,
  ]);
  let socketOpen = false;
  const segments = new Map<string, RawSegment>();
  const getSeg = (itemId: string): RawSegment => {
    let s = segments.get(itemId);
    if (!s) {
      s = { itemId, start: 0, end: 0, text: "" };
      segments.set(itemId, s);
    }
    return s;
  };
  const emit = () => {
    callbacks.onSegments?.(
      [...segments.values()]
        .filter((s) => s.text.trim().length > 0)
        .sort((a, b) => a.start - b.start)
    );
  };

  ws.onmessage = (ev) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(typeof ev.data === "string" ? ev.data : "");
    } catch {
      return;
    }
    const type = msg.type as string | undefined;
    switch (type) {
      case "input_audio_buffer.speech_started": {
        const id = msg.item_id as string;
        if (id) getSeg(id).start = ((msg.audio_start_ms as number) ?? 0) / 1000;
        break;
      }
      case "input_audio_buffer.speech_stopped": {
        const id = msg.item_id as string;
        if (id) getSeg(id).end = ((msg.audio_end_ms as number) ?? 0) / 1000;
        break;
      }
      case "conversation.item.input_audio_transcription.delta": {
        const id = msg.item_id as string;
        if (id) getSeg(id).text += (msg.delta as string) ?? "";
        emit();
        break;
      }
      case "conversation.item.input_audio_transcription.completed": {
        const id = msg.item_id as string;
        if (id) {
          const s = getSeg(id);
          const transcript = (msg.transcript as string) ?? "";
          if (transcript) s.text = transcript;
          if (s.end === 0 && s.start > 0) s.end = s.start;
          s.done = true;
        }
        emit();
        break;
      }
      case "error": {
        const e = msg.error as { message?: string } | undefined;
        console.warn("realtime error:", e?.message ?? msg);
        break;
      }
    }
  };

  processor.onaudioprocess = (e) => {
    if (!socketOpen || ws.readyState !== WebSocket.OPEN) return;
    const input = e.inputBuffer.getChannelData(0);
    const pcm = floatToPcm16(input, ctxRate, SAMPLE_RATE);
    const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
    ws.send(
      JSON.stringify({
        type: "input_audio_buffer.append",
        audio: bytesToBase64(bytes),
      })
    );
  };

  // Wait for the socket to open and be configured before returning.
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("realtime connect timed out")),
      15000
    );
    ws.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("realtime socket error"));
    };
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "session.update",
          session: {
            type: "transcription",
            audio: {
              input: {
                format: { type: "audio/pcm", rate: SAMPLE_RATE },
                transcription: { model, language },
                turn_detection: { type: "server_vad" },
              },
            },
            include: ["item.input_audio_transcription.logprobs"],
          },
        })
      );
      socketOpen = true;
      clearTimeout(timeout);
      callbacks.onConnected?.();
      resolve();
    };
  });

  // Start feeding audio only once connected.
  source.connect(processor);
  processor.connect(ctx.destination);

  return {
    async stop() {
      // Stop capturing.
      try {
        processor.disconnect();
        source.disconnect();
      } catch {
        /* ignore */
      }
      const durationSec = ctx.currentTime;
      try {
        await ctx.close();
      } catch {
        /* ignore */
      }
      stream.getTracks().forEach((t) => t.stop());

      // Trailing silence nudges the final VAD commit; wait briefly for the last
      // transcripts to arrive, then close.
      if (ws.readyState === WebSocket.OPEN) {
        await pumpSilence(ws);
        await delay(QUIET_FLUSH_MS);
      }
      try {
        ws.close();
      } catch {
        /* ignore */
      }

      const list = [...segments.values()]
        .filter((s) => s.text.trim().length > 0)
        .sort((a, b) => a.start - b.start);
      return { segments: list, durationSec };
    },
  };
}
