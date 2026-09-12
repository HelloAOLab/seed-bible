import { createTextToSpeechManager } from "@packages/seed-bible/seed-bible/managers/TextToSpeechManager";

/**
 * jsdom implements neither `speechSynthesis` nor `SpeechSynthesisUtterance`, so
 * both are stubbed here. The manager sets `onstart`/`onend`/`onerror` as
 * properties rather than listeners, so tests drive playback by invoking them.
 */
class FakeUtterance {
  lang = "";
  voice: unknown = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public text: string) {}
}

class FakeSpeechSynthesis extends EventTarget {
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

function installSpeech(): FakeSpeechSynthesis {
  const speech = new FakeSpeechSynthesis();
  vi.stubGlobal("speechSynthesis", speech);
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
  return speech;
}

const GENESIS = [
  {
    number: 1,
    text: "In the beginning God created the heavens and the earth.",
  },
  { number: 2, text: "Now the earth was formless and empty." },
];

describe("TextToSpeechManager", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("canSpeakLanguage", () => {
    it("is false for every language when the browser cannot speak at all", () => {
      const manager = createTextToSpeechManager();
      expect(manager.canSpeakLanguage("en")).toBe(false);
    });

    it("answers for the language, not the exact tag a voice happens to carry", () => {
      const speech = installSpeech();
      speech.voices = [
        { lang: "en-GB", name: "British English" },
        { lang: "pt-BR", name: "Brazilian Portuguese" },
      ];
      const manager = createTextToSpeechManager();

      // A regional voice can read its language — "en-GB" can read "en".
      expect(manager.canSpeakLanguage("en")).toBe(true);
      expect(manager.canSpeakLanguage("en-US")).toBe(true);
      expect(manager.canSpeakLanguage("pt")).toBe(true);

      // Nothing installed can read these.
      expect(manager.canSpeakLanguage("el")).toBe(false);
      expect(manager.canSpeakLanguage("haw")).toBe(false);
    });

    it("is false for a missing language rather than guessing one", () => {
      const speech = installSpeech();
      speech.voices = [{ lang: "en-US", name: "English" }];
      const manager = createTextToSpeechManager();

      expect(manager.canSpeakLanguage(null)).toBe(false);
      expect(manager.canSpeakLanguage(undefined)).toBe(false);
      expect(manager.canSpeakLanguage("")).toBe(false);
    });

    it("notices voices that only arrive after the browser loads them", () => {
      const speech = installSpeech();
      const manager = createTextToSpeechManager();

      // Browsers report an empty list from the first `getVoices()` call, so a
      // one-shot check here would conclude "no voices" and never revisit it.
      expect(manager.canSpeakLanguage("en")).toBe(false);

      speech.loadVoices([{ lang: "en-US", name: "English" }]);

      expect(manager.canSpeakLanguage("en")).toBe(true);
    });
  });

  it("reports no support when the browser cannot speak", () => {
    // jsdom defines neither global, so this is the unsupported case as-is.
    const manager = createTextToSpeechManager();
    expect(manager.isSupported.value).toBe(false);

    // Speaking anyway must not throw — callers shouldn't have to guard.
    manager.speak(GENESIS, { lang: "en" });
    expect(manager.isSpeaking.value).toBe(false);
  });

  it("queues one utterance per verse, in order, tagged with the language", () => {
    const speech = installSpeech();
    const manager = createTextToSpeechManager();

    expect(manager.isSupported.value).toBe(true);

    manager.speak(GENESIS, { lang: "en" });

    expect(speech.queued.map((utterance) => utterance.text)).toEqual(
      GENESIS.map((verse) => verse.text)
    );
    expect(speech.queued.every((utterance) => utterance.lang === "en")).toBe(
      true
    );
    expect(manager.isSpeaking.value).toBe(true);
  });

  it("follows the reader from verse to verse and clears up when the chapter ends", () => {
    const speech = installSpeech();
    const manager = createTextToSpeechManager();
    const onFinished = vi.fn();

    manager.speak(GENESIS, { lang: "en", onFinished });
    expect(manager.currentVerse.value).toBe(null);

    speech.queued[0]!.onstart?.();
    expect(manager.currentVerse.value).toBe(1);

    speech.queued[1]!.onstart?.();
    expect(manager.currentVerse.value).toBe(2);

    // Only the last verse carries an `onend` — that is what ends the chapter.
    expect(speech.queued[0]!.onend).toBe(null);
    speech.queued[1]!.onend?.();

    expect(onFinished).toHaveBeenCalledTimes(1);
    expect(manager.isSpeaking.value).toBe(false);
    expect(manager.currentVerse.value).toBe(null);
  });

  it("stops on request without reporting the chapter as finished", () => {
    const speech = installSpeech();
    const manager = createTextToSpeechManager();
    const onFinished = vi.fn();

    manager.speak(GENESIS, { lang: "en", onFinished });
    speech.queued[0]!.onstart?.();

    const queuedBeforeStop = [...speech.queued];
    manager.stop();

    expect(manager.isSpeaking.value).toBe(false);
    expect(manager.currentVerse.value).toBe(null);
    expect(speech.cancelCount).toBeGreaterThan(0);
    expect(onFinished).not.toHaveBeenCalled();

    // Cancelling still delivers `end` for utterances that were already queued.
    // That belongs to the stopped run and must not resurrect any state.
    queuedBeforeStop[1]!.onend?.();
    expect(onFinished).not.toHaveBeenCalled();
    expect(manager.isSpeaking.value).toBe(false);
  });

  it("silences a stopped run that the engine starts speaking anyway", () => {
    const speech = installSpeech();
    const manager = createTextToSpeechManager();

    manager.speak(GENESIS, { lang: "en" });
    const handedToEngine = [...speech.queued];

    // A quick second press on the toolbar button.
    manager.stop();
    const cancelsSoFar = speech.cancelCount;

    // `cancel()` doesn't reliably reach an utterance the engine has already
    // taken, so it starts regardless — the double-press bug. Nothing is left
    // tracking it, so it has to silence itself.
    handedToEngine[0]!.onstart?.();

    expect(speech.cancelCount).toBeGreaterThan(cancelsSoFar);
    expect(manager.currentVerse.value).toBe(null);
    expect(manager.isSpeaking.value).toBe(false);
  });

  it("leaves a fresh run alone when an abandoned one surfaces late", () => {
    const speech = installSpeech();
    const manager = createTextToSpeechManager();

    manager.speak(GENESIS, { lang: "en" });
    const abandoned = [...speech.queued];

    // Press, stop, press again in quick succession.
    manager.stop();
    manager.speak([{ number: 7, text: "The chapter that replaced it." }], {
      lang: "en",
    });
    const cancelsSoFar = speech.cancelCount;

    // The abandoned run finally starts. Cancelling now would cut off the run
    // the user is actually listening to, so it must be left alone.
    abandoned[0]!.onstart?.();

    expect(speech.cancelCount).toBe(cancelsSoFar);
    expect(manager.isSpeaking.value).toBe(true);
    speech.queued[0]!.onstart?.();
    expect(manager.currentVerse.value).toBe(7);
  });

  it("keeps cancelling until the engine admits it has stopped", () => {
    vi.useFakeTimers();
    try {
      const speech = installSpeech();
      const manager = createTextToSpeechManager();

      manager.speak(GENESIS, { lang: "en" });
      // The engine takes the chapter and starts reading it.
      speech.speaking = true;

      // A quick second press. One `cancel()` is a request, and this engine
      // ignores it — the double-press bug.
      manager.stop();
      const afterFirstCancel = speech.cancelCount;
      expect(manager.isSpeaking.value).toBe(false);

      vi.advanceTimersByTime(200);
      expect(speech.cancelCount).toBeGreaterThan(afterFirstCancel);

      // Once it finally falls silent, the insisting stops.
      speech.speaking = false;
      vi.advanceTimersByTime(200);
      const afterSilence = speech.cancelCount;
      vi.advanceTimersByTime(1000);
      expect(speech.cancelCount).toBe(afterSilence);
    } finally {
      vi.useRealTimers();
    }
  });

  it("gives up insisting rather than polling for the life of the page", () => {
    vi.useFakeTimers();
    try {
      const speech = installSpeech();
      const manager = createTextToSpeechManager();

      manager.speak(GENESIS, { lang: "en" });
      // An engine that never admits to stopping, whatever it is asked.
      speech.speaking = true;
      manager.stop();

      vi.advanceTimersByTime(5000);
      const settled = speech.cancelCount;
      vi.advanceTimersByTime(5000);
      expect(speech.cancelCount).toBe(settled);
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops insisting as soon as a new chapter starts", () => {
    vi.useFakeTimers();
    try {
      const speech = installSpeech();
      const manager = createTextToSpeechManager();

      manager.speak(GENESIS, { lang: "en" });
      speech.speaking = true;
      manager.stop();

      // Press again before the engine has fallen silent. Cancelling from here
      // on would cut off the run the reader is actually listening to.
      manager.speak([{ number: 7, text: "The chapter that replaced it." }], {
        lang: "en",
      });
      const afterRestart = speech.cancelCount;

      vi.advanceTimersByTime(1000);
      expect(speech.cancelCount).toBe(afterRestart);
      expect(manager.isSpeaking.value).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not let a stopped chapter's callbacks disturb the one that replaced it", () => {
    const speech = installSpeech();
    const manager = createTextToSpeechManager();

    manager.speak(GENESIS, { lang: "en" });
    const stale = [...speech.queued];

    manager.speak([{ number: 7, text: "A different chapter entirely." }], {
      lang: "en",
    });
    speech.queued[0]!.onstart?.();
    expect(manager.currentVerse.value).toBe(7);

    stale[1]!.onstart?.();
    expect(manager.currentVerse.value).toBe(7);
  });

  it("resets when an utterance fails, so the button cannot stick on pause", () => {
    const speech = installSpeech();
    const manager = createTextToSpeechManager();

    manager.speak(GENESIS, { lang: "en" });
    speech.queued[0]!.onstart?.();
    expect(manager.isSpeaking.value).toBe(true);

    speech.queued[0]!.onerror?.();

    expect(manager.isSpeaking.value).toBe(false);
    expect(manager.currentVerse.value).toBe(null);
  });

  it("skips verses with nothing to say and stays idle when none are left", () => {
    const speech = installSpeech();
    const manager = createTextToSpeechManager();

    manager.speak(
      [
        { number: 1, text: "   " },
        { number: 2, text: "Real text." },
      ],
      { lang: "en" }
    );
    expect(speech.queued.map((utterance) => utterance.text)).toEqual([
      "Real text.",
    ]);

    manager.speak([{ number: 1, text: "" }], { lang: "en" });
    expect(speech.queued).toHaveLength(0);
    expect(manager.isSpeaking.value).toBe(false);
  });

  it("prefers an installed voice for the language, matching on the base tag", () => {
    const speech = installSpeech();
    speech.voices = [
      { lang: "fr-FR", name: "French" },
      { lang: "en-GB", name: "British English" },
    ];
    const manager = createTextToSpeechManager();

    manager.speak(GENESIS, { lang: "en" });

    expect(speech.queued[0]!.voice).toEqual({
      lang: "en-GB",
      name: "British English",
    });
  });

  it("leaves the voice to the browser when none matches or none are loaded yet", () => {
    const speech = installSpeech();
    speech.voices = [{ lang: "fr-FR", name: "French" }];
    const manager = createTextToSpeechManager();

    manager.speak(GENESIS, { lang: "en" });
    expect(speech.queued[0]!.voice).toBe(null);
    expect(speech.queued[0]!.lang).toBe("en");

    // `getVoices()` is empty until the browser finishes loading its list; the
    // language tag alone still has to be enough.
    speech.voices = [];
    manager.speak(GENESIS, { lang: "en" });
    expect(speech.queued[0]!.voice).toBe(null);
    expect(speech.queued[0]!.lang).toBe("en");
  });
});
