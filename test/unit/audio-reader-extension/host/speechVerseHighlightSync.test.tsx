import initAudioReaderExtension from "@packages/audio-reader-extension/ext_audioReader/host/init";
import {
  setupExtensionContext,
  unregisterExtension,
} from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { QuickToolContext } from "@packages/seed-bible/seed-bible/managers/BibleToolsManager";
import { createTestSeedBibleState } from "../../seed-bible/testUtils/createTestSeedBibleState";
import {
  aabBooks,
  createResponse,
  makeChapter,
  makeUrl,
  translations,
} from "../../seed-bible/managers/testUtils/mockBibleApiData";

const PRIVATE_API_ENDPOINT = "https://vmfnri.helloao.org";

/**
 * `makeChapter` already produces a chapter with no audio links — the very case
 * this feature exists for. Its default body is two verses, "Verse 1"/"Verse 2".
 */
function createResponses() {
  return {
    [makeUrl("/api/available_translations.json", PRIVATE_API_ENDPOINT)]:
      createResponse(translations),
    [makeUrl("/api/AAB/books.json", PRIVATE_API_ENDPOINT)]:
      createResponse(aabBooks),
    [makeUrl("/api/AAB/GEN/1.json", PRIVATE_API_ENDPOINT)]: createResponse(
      makeChapter(aabBooks, "GEN", 1)
    ),
    [makeUrl("/api/AAB/GEN/2.json", PRIVATE_API_ENDPOINT)]: createResponse(
      makeChapter(aabBooks, "GEN", 2)
    ),
  };
}

/** jsdom has no speech synthesiser at all, so the whole API is stubbed. */
class FakeUtterance {
  lang = "";
  voice: unknown = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public text: string) {}
}

class FakeSpeechSynthesis extends EventTarget {
  queued: FakeUtterance[] = [];
  cancelCount = 0;
  /** The AAB fixture is "eng", so an English voice is what makes it speakable. */
  voices = [{ lang: "en-US", name: "English" }];

  speak(utterance: FakeUtterance) {
    this.queued.push(utterance);
  }
  cancel() {
    this.cancelCount++;
    this.queued = [];
  }
  pause() {}
  resume() {}
  getVoices() {
    return this.voices;
  }
}

function getReadingState(state: SeedBibleState) {
  return state.app.currentReadingState.value!.tab.readingState;
}

function diminishDecorations(state: SeedBibleState) {
  return getReadingState(state).decorations.value.filter(
    (d) => d.className === "sb-verse-decoration-diminish"
  );
}

describe("audio-reader speech verse highlight sync (#1769)", () => {
  let state: SeedBibleState;
  let speech: FakeSpeechSynthesis;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    unregisterExtension("ext_audioReader");
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function listenTool() {
    const ctx: QuickToolContext = {
      readingState: getReadingState(state),
      playlists: state.playlists,
      annotations: state.annotations,
      features: state.features,
      surface: "quick-toolbar",
    };
    return state.tools
      .getQuickTools(ctx)
      .find((t) => t.id === "ext_audioReader-play")!;
  }

  /**
   * The Listen control debounces presses, so a press does nothing until the
   * delay has run out. Each press here runs the clock past it.
   */
  function press() {
    listenTool().onSelect();
    vi.advanceTimersByTime(400);
  }

  // One test rather than one per scenario: `init.tsx` keeps the spoken-verse
  // highlight in module-level state (`speechHighlight`, alongside the audio
  // element's own singleton), so a second `it` would inherit whatever the
  // first left behind instead of starting clean.
  it("offers the Listen button without recorded audio, speaks the chapter verse by verse, and clears the highlight when stopped", async () => {
    speech = new FakeSpeechSynthesis();
    // Stubbed before the state is built: the manager reads these globals once,
    // when it is constructed.
    vi.stubGlobal("speechSynthesis", speech);
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);

    state = await createTestSeedBibleState({ responses: createResponses() });
    setupExtensionContext(state);
    initAudioReaderExtension();

    expect(state.textToSpeech.isSupported.value).toBe(true);

    // The point of the issue: this chapter has no recording, and before this
    // feature the button was hidden outright rather than merely idle.
    expect(
      getReadingState(state).chapterData.value?.thisChapterAudioLinks
    ).toEqual({});
    expect(listenTool().visible.value).toBe(true);

    press();

    // One utterance per verse, in reading order, tagged with the translation's
    // language mapped from ISO 639-3 ("eng") to what the Web Speech API wants.
    expect(speech.queued.map((u) => u.text)).toEqual(["Verse 1", "Verse 2"]);
    expect(speech.queued.map((u) => u.lang)).toEqual(["en", "en"]);
    expect(state.textToSpeech.isSpeaking.value).toBe(true);

    // Nothing is lit until the synthesiser actually reaches a verse.
    expect(diminishDecorations(state)).toHaveLength(0);

    speech.queued[0]!.onstart?.();
    let lit = diminishDecorations(state);
    expect(lit).toHaveLength(1);
    expect(lit[0]!.verses).toEqual([1]);
    expect(lit[0]!.bookId).toBe("GEN");
    expect(lit[0]!.chapterNumber).toBe(1);
    // Unlike recorded narration there is no timing data to say how long a
    // verse lasts, so the highlight is replaced on the next verse rather than
    // fading out on a timer.
    expect(lit[0]!.removeAfterMs).toBeUndefined();
    const firstDecorationId = lit[0]!.id;

    speech.queued[1]!.onstart?.();
    lit = diminishDecorations(state);
    // Updated in place rather than stacking a second decoration.
    expect(lit).toHaveLength(1);
    expect(lit[0]!.verses).toEqual([2]);
    expect(lit[0]!.id).toBe(firstDecorationId);

    // Reaching the end of the chapter puts the reader back to rest.
    speech.queued[1]!.onend?.();
    expect(diminishDecorations(state)).toHaveLength(0);
    expect(state.textToSpeech.isSpeaking.value).toBe(false);

    // Pressing again starts the chapter over...
    press();
    expect(speech.queued.map((u) => u.text)).toEqual(["Verse 1", "Verse 2"]);
    speech.queued[0]!.onstart?.();
    expect(diminishDecorations(state)[0]!.verses).toEqual([1]);

    // ...and pressing it while speaking stops, clearing the highlight rather
    // than stranding it lit on whatever verse was being read.
    press();
    expect(state.textToSpeech.isSpeaking.value).toBe(false);
    expect(diminishDecorations(state)).toHaveLength(0);

    // Navigating away mid-chapter must not leave a voice reading on.
    press();
    expect(state.textToSpeech.isSpeaking.value).toBe(true);
    const readingState = getReadingState(state);
    await readingState.selectTranslationAndChapter(
      readingState.translationId.value,
      "GEN",
      2
    );
    expect(state.textToSpeech.isSpeaking.value).toBe(false);
    expect(diminishDecorations(state)).toHaveLength(0);

    // A double-press counts once. Before the control was debounced these two
    // became play-then-stop, and the engine could be left reading the chapter
    // aloud with nothing tracking it.
    listenTool().onSelect();
    listenTool().onSelect();
    vi.advanceTimersByTime(400);
    expect(state.textToSpeech.isSpeaking.value).toBe(true);
  });
});
