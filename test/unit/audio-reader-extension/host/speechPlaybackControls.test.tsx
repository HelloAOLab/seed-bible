import initAudioReaderExtension from "@packages/audio-reader-extension/ext_audioReader/host/init";
import {
  setupExtensionContext,
  unregisterExtension,
} from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { QuickToolContext } from "@packages/seed-bible/seed-bible/managers/BibleToolsManager";
import type { AudioPlaybackController } from "@packages/seed-bible/seed-bible/managers/AudioPlaybackManager";
import { createTestSeedBibleState } from "../../seed-bible/testUtils/createTestSeedBibleState";
import {
  installSpeech,
  type FakeSpeechSynthesis,
} from "../../seed-bible/testUtils/fakeSpeechSynthesis";
import {
  aabBooks,
  createResponse,
  makeChapter,
  makeUrl,
  translations,
} from "../../seed-bible/managers/testUtils/mockBibleApiData";

const PRIVATE_API_ENDPOINT = "https://vmfnri.helloao.org";

/**
 * Five short verses and no recording, so Listen reads it aloud. Verse 3 starts
 * a section.
 */
function fiveVerses() {
  const verses = [1, 2, 3, 4, 5].map((n) => ({
    type: "verse" as const,
    number: n,
    content: [`Verse ${n}`],
  }));
  return [
    ...verses.slice(0, 2),
    { type: "heading" as const, content: ["The Third Day"] },
    ...verses.slice(2),
  ];
}

function createResponses() {
  return {
    [makeUrl("/api/available_translations.json", PRIVATE_API_ENDPOINT)]:
      createResponse(translations),
    [makeUrl("/api/AAB/books.json", PRIVATE_API_ENDPOINT)]:
      createResponse(aabBooks),
    [makeUrl("/api/AAB/GEN/1.json", PRIVATE_API_ENDPOINT)]: createResponse(
      makeChapter(aabBooks, "GEN", 1, fiveVerses())
    ),
    [makeUrl("/api/AAB/GEN/2.json", PRIVATE_API_ENDPOINT)]: createResponse(
      makeChapter(aabBooks, "GEN", 2)
    ),
  };
}

function getReadingState(state: SeedBibleState) {
  return state.app.currentReadingState.value!.tab.readingState;
}

describe("audio-reader playback controls for a chapter read aloud", () => {
  let state: SeedBibleState;
  let speech: FakeSpeechSynthesis;

  beforeEach(async () => {
    localStorage.clear();
    // Before the state is built: the manager reads these globals once.
    speech = installSpeech([{ lang: "en-US", name: "English" }]);
    state = await createTestSeedBibleState({ responses: createResponses() });
    setupExtensionContext(state);
    initAudioReaderExtension();
  });

  afterEach(() => {
    unregisterExtension("ext_audioReader");
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  /** Presses Listen, waiting out its debounce on fake timers. */
  function pressListen() {
    const ctx: QuickToolContext = {
      readingState: getReadingState(state),
      playlists: state.playlists,
      annotations: state.annotations,
      features: state.features,
      surface: "quick-toolbar",
    };
    const tool = state.tools
      .getQuickTools(ctx)
      .find((t) => t.id === "ext_audioReader-play")!;
    vi.useFakeTimers();
    tool.onSelect();
    vi.advanceTimersByTime(400);
    vi.useRealTimers();
  }

  /** The voice reaching the queued utterance that reads `text`. */
  function voiceReaches(text: string) {
    const utterance = speech.queued.find((u) => u.text === text);
    if (!utterance) throw new Error(`"${text}" is not queued`);
    utterance.onstart?.();
  }

  const queuedTexts = () => speech.queued.map((u) => u.text);

  function startListening(): AudioPlaybackController {
    pressListen();
    voiceReaches("Verse 1");
    return state.audioPlayback.active.value!;
  }

  it("shows progress counted in verses", () => {
    const playback = startListening();

    expect(playback.unit).toBe("verses");
    expect(playback.duration.value).toBe(5);
    expect(playback.currentTime.value).toBe(0);
    expect(playback.isPlaying.value).toBe(true);

    voiceReaches("Verse 3");
    expect(playback.currentTime.value).toBe(2);
  });

  it("pauses without forgetting where it was, and picks up from that verse", () => {
    const playback = startListening();
    voiceReaches("Verse 3");

    playback.pause();
    expect(playback.isPlaying.value).toBe(false);
    expect(queuedTexts()).toEqual([]);
    // Still showing, so it can be resumed or scrubbed.
    expect(state.audioPlayback.active.value).toBe(playback);
    expect(playback.currentTime.value).toBe(2);

    playback.play();
    expect(playback.isPlaying.value).toBe(true);
    expect(queuedTexts()).toEqual(["Verse 3", "Verse 4", "Verse 5"]);
  });

  it("resumes from the same verse when Listen is pressed again", () => {
    startListening();
    voiceReaches("Verse 2");

    pressListen();
    expect(queuedTexts()).toEqual([]);

    pressListen();
    expect(queuedTexts()).toEqual(["Verse 2", "Verse 3", "Verse 4", "Verse 5"]);
  });

  it("jumps to a verse while playing by reading on from it", () => {
    const playback = startListening();

    playback.seek(3);

    expect(queuedTexts()).toEqual(["Verse 4", "Verse 5"]);
    expect(playback.currentTime.value).toBe(3);
    expect(getReadingState(state).readAlongVerse.value).toEqual({ verse: 4 });
  });

  it("moves to a verse while paused without speaking until played", () => {
    const playback = startListening();
    playback.pause();

    playback.seek(4);
    expect(queuedTexts()).toEqual([]);
    expect(playback.currentTime.value).toBe(4);
    // The reader still scrolls there, as it does for a recording.
    expect(getReadingState(state).readAlongVerse.value).toEqual({ verse: 5 });

    playback.play();
    expect(queuedTexts()).toEqual(["Verse 5"]);
  });

  it("names the verse a scrub would land on, with its section heading", () => {
    const playback = startListening();

    expect(playback.verseAt?.(0)).toEqual({ number: 1, heading: null });
    expect(playback.verseAt?.(2)).toEqual({
      number: 3,
      heading: "The Third Day",
    });
    expect(playback.verseAt?.(99)).toEqual({ number: 5, heading: null });
  });

  it("keeps a seek inside the chapter and on a whole verse", () => {
    const playback = startListening();
    playback.pause();

    playback.seek(99);
    expect(playback.currentTime.value).toBe(4);
    playback.seek(-2);
    expect(playback.currentTime.value).toBe(0);
    playback.seek(1.6);
    expect(playback.currentTime.value).toBe(2);
  });

  it("stops completely, taking the controls down", () => {
    const playback = startListening();

    playback.stop();

    expect(state.audioPlayback.active.value).toBeNull();
    expect(state.textToSpeech.isSpeaking.value).toBe(false);
    expect(getReadingState(state).readAlongVerse.value).toBeNull();

    // Listen starts the chapter over rather than resuming.
    pressListen();
    expect(queuedTexts()[0]).toBe("Verse 1");
  });

  it("takes the controls down once the chapter has been read", () => {
    startListening();

    speech.queued.at(-1)!.onend?.();

    expect(state.audioPlayback.active.value).toBeNull();
  });

  it("takes the controls down when the reader moves to another chapter", async () => {
    startListening();

    const readingState = getReadingState(state);
    await readingState.selectTranslationAndChapter(
      readingState.translationId.value,
      "GEN",
      2
    );

    expect(state.audioPlayback.active.value).toBeNull();
    expect(state.textToSpeech.isSpeaking.value).toBe(false);
  });

  it("stops speaking when the extension is uninstalled", () => {
    startListening();

    unregisterExtension("ext_audioReader");

    expect(state.textToSpeech.isSpeaking.value).toBe(false);
    expect(state.audioPlayback.active.value).toBeNull();
  });
});
