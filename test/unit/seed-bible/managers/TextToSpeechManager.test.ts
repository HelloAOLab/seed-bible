import {
  createTextToSpeechManager,
  splitForSpeech,
} from "@packages/seed-bible/seed-bible/managers/TextToSpeechManager";

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

  describe("splitForSpeech", () => {
    it("leaves an ordinary verse as one utterance", () => {
      expect(
        splitForSpeech("In the beginning God created the heavens.")
      ).toEqual(["In the beginning God created the heavens."]);
    });

    it("has nothing to say for blank text", () => {
      expect(splitForSpeech("")).toEqual([]);
      expect(splitForSpeech("   ")).toEqual([]);
    });

    it("breaks a long verse at sentence ends, where a pause sounds natural", () => {
      const verse = "One two three. Four five six. Seven eight nine.";

      expect(splitForSpeech(verse, 20)).toEqual([
        "One two three.",
        "Four five six.",
        "Seven eight nine.",
      ]);
    });

    it("packs whole sentences together while they still fit", () => {
      const verse = "One two. Three four. Five six.";

      // Room for two sentences at a time, so it doesn't emit one utterance per
      // sentence when fewer will do.
      expect(splitForSpeech(verse, 22)).toEqual([
        "One two. Three four.",
        "Five six.",
      ]);
    });

    it("breaks a sentence too long to fit at a word, not mid-word", () => {
      const verse = "alpha bravo charlie delta echo foxtrot golf hotel india";

      const chunks = splitForSpeech(verse, 20);

      expect(chunks.every((chunk) => chunk.length <= 20)).toBe(true);
      // Every word survives intact.
      expect(chunks.join(" ").split(/\s+/)).toEqual(verse.split(" "));
    });

    it("breaks mid-run for scripts that do not use spaces", () => {
      // Chinese writes without spaces, so there is no word boundary to find —
      // an unbroken line is still better than an utterance long enough to cut.
      const verse = "起初神創造天地".repeat(10);

      const chunks = splitForSpeech(verse, 20);

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks.every((chunk) => chunk.length <= 20)).toBe(true);
      expect(chunks.join("")).toBe(verse);
    });

    it("keeps every word of a long verse, in order", () => {
      const verse = Array.from(
        { length: 80 },
        (_, index) => `word${index}`
      ).join(" ");

      expect(splitForSpeech(verse, 40).join(" ")).toBe(verse);
    });

    it("makes progress even on a nonsensical limit", () => {
      // A zero-width cut would consume nothing and spin forever, so the split
      // always advances by at least one character.
      expect(splitForSpeech("abcdef", 0)).toEqual([
        "a",
        "b",
        "c",
        "d",
        "e",
        "f",
      ]);
    });

    it("keeps every chunk inside the limit", () => {
      const verse =
        "Now the king's scribes were summoned, and an edict was written. " +
        "It was sent to the satraps and the governors and the officials. " +
        "Each province was addressed in its own script and language.";

      expect(
        splitForSpeech(verse, 60).every((chunk) => chunk.length <= 60)
      ).toBe(true);
    });
  });

  it("splits a verse too long to speak in one go, keeping it one verse", () => {
    const speech = installSpeech();
    const manager = createTextToSpeechManager();
    const onFinished = vi.fn();

    const longVerse = {
      number: 9,
      text:
        "Now the king's scribes were summoned in the third month. " +
        "An edict was written to the satraps and the governors. " +
        "Each province was addressed in its own script and language. " +
        "It was sealed with the king's ring and sent by mounted couriers.",
    };

    manager.speak([longVerse], { lang: "en", onFinished });

    // More than one utterance, none of them long enough to risk being cut off.
    expect(speech.queued.length).toBeGreaterThan(1);
    expect(
      speech.queued.every((utterance) => utterance.text.length <= 160)
    ).toBe(true);

    // The reader sees one verse, however many pieces it took to say it.
    speech.queued[0]!.onstart?.();
    expect(manager.currentVerse.value).toBe(9);
    speech.queued[1]!.onstart?.();
    expect(manager.currentVerse.value).toBe(9);

    // The chapter isn't over until the last piece is, so only it ends the run.
    expect(
      speech.queued.slice(0, -1).every((utterance) => utterance.onend === null)
    ).toBe(true);
    expect(onFinished).not.toHaveBeenCalled();

    speech.queued.at(-1)!.onend?.();
    expect(onFinished).toHaveBeenCalledTimes(1);
    expect(manager.isSpeaking.value).toBe(false);
  });

  it("never pauses the engine while it is speaking", () => {
    vi.useFakeTimers();
    try {
      const speech = installSpeech();
      const manager = createTextToSpeechManager();

      manager.speak(GENESIS, { lang: "en" });
      speech.queued[0]!.onstart?.();

      // A periodic `pause()`/`resume()` is the usual workaround for Chrome
      // cutting long speech off, and it broke playback outright here: the pause
      // landed and the resume never took. Short utterances stand in for it, so
      // nothing may touch the engine mid-chapter.
      vi.advanceTimersByTime(120_000);

      expect(speech.pauseCount).toBe(0);
      expect(speech.resumeCount).toBe(0);
      expect(manager.isSpeaking.value).toBe(true);
    } finally {
      vi.useRealTimers();
    }
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
