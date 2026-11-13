import { signal } from "@preact/signals";

const MUTED_KEY = "find-the-verse:sound-muted";

function readMuted(): boolean {
  try {
    return globalThis.localStorage?.getItem(MUTED_KEY) === "true";
  } catch {
    return false;
  }
}

/** Remembered on this device. */
export const soundMuted = signal(readMuted());

export function setSoundMuted(muted: boolean) {
  soundMuted.value = muted;
  try {
    if (muted) globalThis.localStorage?.setItem(MUTED_KEY, "true");
    else globalThis.localStorage?.removeItem(MUTED_KEY);
  } catch {
    // Private mode or storage turned off: the choice lasts for this visit.
  }
}

type AudioContextConstructor = new () => AudioContext;

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (context) return context;
  const Ctor =
    (globalThis as { AudioContext?: AudioContextConstructor }).AudioContext ??
    (globalThis as { webkitAudioContext?: AudioContextConstructor })
      .webkitAudioContext;
  if (!Ctor) return null;
  try {
    context = new Ctor();
  } catch {
    return null;
  }
  return context;
}

/** C major arpeggio up to the octave: a short "ta-da". */
const NOTES = [523.25, 659.25, 783.99, 1046.5];
const STEP_S = 0.11;
const NOTE_S = 0.32;

/**
 * Synthesised with Web Audio, so there is no file to fetch. Must run inside
 * the winning tap's handling: browsers only start audio after a user gesture.
 */
export function playWinSound() {
  if (soundMuted.peek()) return;
  const ctx = audioContext();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") void ctx.resume();
    const start = ctx.currentTime + 0.02;
    const master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);
    NOTES.forEach((frequency, index) => {
      const at = start + index * STEP_S;
      const last = index === NOTES.length - 1;
      const length = last ? NOTE_S * 2 : NOTE_S;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(1, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
      osc.connect(gain);
      gain.connect(master);
      osc.start(at);
      osc.stop(at + length + 0.05);
    });
  } catch {
    // A missing or blocked audio device should never break the win.
  }
}
