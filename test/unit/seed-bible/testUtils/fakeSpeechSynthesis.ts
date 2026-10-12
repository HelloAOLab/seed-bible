/**
 * jsdom implements neither `speechSynthesis` nor `SpeechSynthesisUtterance`, so
 * both are stubbed here. The manager sets `onstart`/`onend`/`onerror` as
 * properties rather than listeners, so tests drive playback by invoking them.
 */
export class FakeUtterance {
  lang = "";
  voice: unknown = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public text: string) {}
}

export class FakeSpeechSynthesis extends EventTarget {
  /** Utterances queued since the last `cancel()`, in the order they were queued. */
  queued: FakeUtterance[] = [];
  cancelCount = 0;
  /**
   * What the engine reports about itself. Set independently of `queued` so a
   * test can model an engine that ignores `cancel()` and carries on.
   */
  speaking = false;
  pending = false;
  pauseCount = 0;
  resumeCount = 0;
  voices: { lang: string; name: string }[] = [];

  /** Mirrors a browser filling its voice list in asynchronously. */
  loadVoices(voices: { lang: string; name: string }[]) {
    this.voices = voices;
    this.dispatchEvent(new Event("voiceschanged"));
  }

  speak(utterance: FakeUtterance) {
    this.queued.push(utterance);
  }

  cancel() {
    this.cancelCount++;
    this.queued = [];
  }

  pause() {
    this.pauseCount++;
  }

  resume() {
    this.resumeCount++;
  }

  getVoices() {
    return this.voices;
  }
}

/**
 * Installs a fake synthesiser on the globals the app reads. Must run before
 * anything that creates a `TextToSpeechManager`, which reads them once.
 */
export function installSpeech(
  voices: { lang: string; name: string }[] = []
): FakeSpeechSynthesis {
  const speech = new FakeSpeechSynthesis();
  speech.voices = voices;
  vi.stubGlobal("speechSynthesis", speech);
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
  return speech;
}
