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
  aabBooks,
  createResponse,
  makeAudioTimings,
  makeChapter,
  makeUrl,
  translations,
} from "../../seed-bible/managers/testUtils/mockBibleApiData";

const PRIVATE_API_ENDPOINT = "https://vmfnri.helloao.org";
const CHAPTER_1_AUDIO_URL = "https://audio.example/GEN/1.mp3";
const CHAPTER_2_AUDIO_URL = "https://audio.example/GEN/2.mp3";
const TIMINGS_LINK = "/api/AAB/GEN/1.gilbert.audioTimings.json";

function createResponses() {
  return {
    [makeUrl("/api/available_translations.json", PRIVATE_API_ENDPOINT)]:
      createResponse(translations),
    [makeUrl("/api/AAB/books.json", PRIVATE_API_ENDPOINT)]:
      createResponse(aabBooks),
    [makeUrl("/api/AAB/GEN/1.json", PRIVATE_API_ENDPOINT)]: createResponse({
      ...makeChapter(aabBooks, "GEN", 1),
      thisChapterAudioLinks: { gilbert: CHAPTER_1_AUDIO_URL },
      thisChapterAudioTimings: { gilbert: TIMINGS_LINK },
    }),
    [makeUrl("/api/AAB/GEN/2.json", PRIVATE_API_ENDPOINT)]: createResponse({
      ...makeChapter(aabBooks, "GEN", 2),
      thisChapterAudioLinks: { gilbert: CHAPTER_2_AUDIO_URL },
      thisChapterAudioTimings: {},
    }),
    [makeUrl(TIMINGS_LINK, PRIVATE_API_ENDPOINT)]: createResponse(
      // Verse 1 starts at 0s, verse 2 starts at 5s.
      makeAudioTimings("AAB", "GEN", 1, "gilbert", { verses: [0, 5] })
    ),
  };
}

/**
 * The extension's audio element is a page-lifetime singleton, built on the
 * first press of play in this file and reused by every test after it, so the
 * stub that captures it is installed once for the whole file.
 */
const audio: { current: HTMLAudioElement | null } = { current: null };
const OriginalAudio = globalThis.Audio;
class CapturingAudio extends OriginalAudio {
  constructor(...args: ConstructorParameters<typeof OriginalAudio>) {
    super(...args);
    audio.current = this;
  }
}

function getReadingState(state: SeedBibleState) {
  return state.app.currentReadingState.value!.tab.readingState;
}

function litVerses(state: SeedBibleState) {
  return getReadingState(state)
    .decorations.value.filter(
      (d) => d.className === "sb-verse-decoration-diminish"
    )
    .map((d) => d.verses);
}

/**
 * jsdom's media element doesn't implement playback, so the events a real one
 * would fire are dispatched by hand — see `audioVerseHighlightSync.test.tsx`.
 */
function fire(type: string) {
  audio.current!.dispatchEvent(new Event(type));
}

function playAt(currentTime: number) {
  audio.current!.currentTime = currentTime;
  fire("timeupdate");
}

function reportDuration(seconds: number) {
  Object.defineProperty(audio.current, "duration", {
    value: seconds,
    configurable: true,
  });
  fire("durationchange");
}

describe("audio-reader playback controls", () => {
  let state: SeedBibleState;

  beforeAll(() => {
    vi.stubGlobal("Audio", CapturingAudio);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(async () => {
    // The open tabs are saved here, so a test that moved to another chapter
    // would otherwise start the next one there.
    localStorage.clear();
    state = await createTestSeedBibleState({ responses: createResponses() });
    setupExtensionContext(state);
    initAudioReaderExtension();
  });

  afterEach(() => {
    unregisterExtension("ext_audioReader");
    vi.useRealTimers();
  });

  /** Presses Listen, waiting out its debounce on fake timers. */
  function pressPlay() {
    const ctx: QuickToolContext = {
      readingState: getReadingState(state),
      playlists: state.playlists,
      annotations: state.annotations,
      features: state.features,
      surface: "quick-toolbar",
    };
    const tool = state.tools
      .getQuickTools(ctx)
      .find((t) => t.id === "ext_audioReader-play");
    vi.useFakeTimers();
    tool!.onSelect();
    vi.advanceTimersByTime(400);
    vi.useRealTimers();
  }

  /** Starts chapter 1 and waits until its verse timings are in. */
  async function startChapterOne(): Promise<AudioPlaybackController> {
    pressPlay();
    fire("play");
    await vi.waitFor(() => {
      playAt(0);
      expect(litVerses(state)).toEqual([[1]]);
    });
    return state.audioPlayback.active.value!;
  }

  it("shows no playback before anything is played", () => {
    expect(state.audioPlayback.active.value).toBeNull();
  });

  it("shows playback once Listen is pressed, tracking the recording's length and position", async () => {
    pressPlay();
    const playback = state.audioPlayback.active.value;
    expect(playback).not.toBeNull();
    expect(playback!.duration.value).toBeNull();

    reportDuration(120);
    expect(playback!.duration.value).toBe(120);

    fire("play");
    expect(playback!.isPlaying.value).toBe(true);
    playAt(30);
    expect(playback!.currentTime.value).toBe(30);

    fire("pause");
    expect(playback!.isPlaying.value).toBe(false);
    // Pausing keeps the controls up — only stopping takes them down.
    expect(state.audioPlayback.active.value).toBe(playback);
  });

  it("seeks the recording and moves the highlight straight to the verse it lands in", async () => {
    const playback = await startChapterOne();
    reportDuration(10);

    playback.seek(6);

    expect(audio.current!.currentTime).toBe(6);
    expect(playback.currentTime.value).toBe(6);
    // Verse 1's highlight goes at once rather than fading out over verse 2.
    expect(litVerses(state)).toEqual([[2]]);

    playback.seek(1);
    expect(litVerses(state)).toEqual([[1]]);
  });

  it("asks the reader to follow each verse as the narration reaches it", async () => {
    await startChapterOne();
    const readingState = getReadingState(state);
    expect(readingState.readAlongVerse.value).toEqual({ verse: 1 });

    playAt(5);
    expect(readingState.readAlongVerse.value).toEqual({ verse: 2 });
  });

  it("asks the reader to follow the verse a seek lands in", async () => {
    const playback = await startChapterOne();
    reportDuration(10);
    const readingState = getReadingState(state);

    playback.seek(6);
    expect(readingState.readAlongVerse.value).toEqual({ verse: 2 });

    // A fresh request each time, so jumping back to a verse already asked for
    // still reaches the reader if the listener has scrolled away from it.
    const before = readingState.readAlongVerse.value;
    playback.seek(7);
    expect(readingState.readAlongVerse.value).toEqual({ verse: 2 });
    expect(readingState.readAlongVerse.value).not.toBe(before);
  });

  it("follows the verse scrubbed to while paused, and again on resume", async () => {
    const playback = await startChapterOne();
    reportDuration(10);
    const readingState = getReadingState(state);

    fire("pause");
    playback.seek(6);
    expect(readingState.readAlongVerse.value).toEqual({ verse: 2 });

    // The listener scrolls away while paused; resuming brings them back.
    const beforeResume = readingState.readAlongVerse.value;
    fire("play");
    expect(readingState.readAlongVerse.value).toEqual({ verse: 2 });
    expect(readingState.readAlongVerse.value).not.toBe(beforeResume);
  });

  it("stops asking the reader to follow once playback stops", async () => {
    const playback = await startChapterOne();

    playback.stop();

    expect(getReadingState(state).readAlongVerse.value).toBeNull();
  });

  it("names the verse a scrub would land on", async () => {
    pressPlay();
    const playback = state.audioPlayback.active.value!;
    // Nothing to go on until the verse timings arrive.
    expect(playback.verseAt?.(6)).toBeNull();

    await startChapterOne();

    // Verse 2 starts at 5s.
    expect(playback.verseAt?.(1)).toEqual({ number: 1, heading: null });
    expect(playback.verseAt?.(6)).toEqual({ number: 2, heading: null });
  });

  it("marks where each verse starts in the recording", async () => {
    pressPlay();
    const playback = state.audioPlayback.active.value!;
    expect(playback.verseMarks?.()).toEqual([]);

    await startChapterOne();

    expect(playback.verseMarks?.()).toEqual([
      { position: 0, startsSection: false },
      { position: 5, startsSection: false },
    ]);
  });

  it("keeps a seek inside the recording", async () => {
    const playback = await startChapterOne();
    reportDuration(10);

    playback.seek(60);
    expect(audio.current!.currentTime).toBe(10);

    playback.seek(-3);
    expect(audio.current!.currentTime).toBe(0);
  });

  it("lights nothing while paused, then lights the verse scrubbed to on resume", async () => {
    const playback = await startChapterOne();
    reportDuration(10);

    fire("pause");
    playback.seek(6);
    // A `timeupdate` follows a real seek; it must not light anything either.
    playAt(6);
    expect(litVerses(state)).toEqual([]);

    fire("play");
    expect(litVerses(state)).toEqual([[2]]);
  });

  it("stops completely: rewinds, clears the highlight and takes the controls down", async () => {
    const playback = await startChapterOne();
    playAt(3);

    playback.stop();

    expect(state.audioPlayback.active.value).toBeNull();
    expect(audio.current!.currentTime).toBe(0);
    expect(playback.currentTime.value).toBe(0);
    expect(playback.isPlaying.value).toBe(false);
    expect(litVerses(state)).toEqual([]);
  });

  it("takes the controls down when the chapter finishes", async () => {
    await startChapterOne();

    Object.defineProperty(audio.current, "ended", {
      value: true,
      configurable: true,
    });
    fire("pause");
    fire("ended");
    Object.defineProperty(audio.current, "ended", {
      value: false,
      configurable: true,
    });

    expect(state.audioPlayback.active.value).toBeNull();
  });

  it("takes the controls down when the reader moves to another chapter", async () => {
    await startChapterOne();

    const readingState = getReadingState(state);
    await readingState.selectTranslationAndChapter(
      readingState.translationId.value,
      "GEN",
      2
    );

    expect(state.audioPlayback.active.value).toBeNull();
  });

  it("takes the controls down when the extension is uninstalled", async () => {
    await startChapterOne();

    unregisterExtension("ext_audioReader");

    expect(state.audioPlayback.active.value).toBeNull();
    expect(litVerses(state)).toEqual([]);
  });
});
