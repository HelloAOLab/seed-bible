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
  makeAudioTimings,
  makeChapter,
  makeUrl,
  translations,
} from "../../seed-bible/managers/testUtils/mockBibleApiData";

const PRIVATE_API_ENDPOINT = "https://vmfnri.helloao.org";
const CHAPTER_1_AUDIO_URL = "https://audio.example/GEN/1.mp3";
const CHAPTER_2_AUDIO_URL = "https://audio.example/GEN/2.mp3";
const TIMINGS_LINK = "/api/AAB/GEN/1.gilbert.audioTimings.json";

/** GEN 1: two verses, a reader track, and that reader's timings linked. */
function chapterOneWithAudioAndTimings() {
  return {
    ...makeChapter(aabBooks, "GEN", 1),
    thisChapterAudioLinks: { gilbert: CHAPTER_1_AUDIO_URL },
    thisChapterAudioTimings: { gilbert: TIMINGS_LINK },
  };
}

/** GEN 2: has a reader track like every chapter, but no timings for it. */
function chapterTwoWithAudioOnly() {
  return {
    ...makeChapter(aabBooks, "GEN", 2),
    thisChapterAudioLinks: { gilbert: CHAPTER_2_AUDIO_URL },
    thisChapterAudioTimings: {},
  };
}

function createResponses() {
  return {
    [makeUrl("/api/available_translations.json", PRIVATE_API_ENDPOINT)]:
      createResponse(translations),
    [makeUrl("/api/AAB/books.json", PRIVATE_API_ENDPOINT)]:
      createResponse(aabBooks),
    [makeUrl("/api/AAB/GEN/1.json", PRIVATE_API_ENDPOINT)]: createResponse(
      chapterOneWithAudioAndTimings()
    ),
    [makeUrl("/api/AAB/GEN/2.json", PRIVATE_API_ENDPOINT)]: createResponse(
      chapterTwoWithAudioOnly()
    ),
    [makeUrl(TIMINGS_LINK, PRIVATE_API_ENDPOINT)]: createResponse(
      // Verse 1 starts at 0s, verse 2 starts at 5s.
      makeAudioTimings("AAB", "GEN", 1, "gilbert", { verses: [0, 5] })
    ),
  };
}

/**
 * Captures whatever `HTMLAudioElement` the extension constructs via `new
 * Audio()`, so the test can drive `currentTime`/`timeupdate` on the exact
 * instance the extension is listening to — there's no other handle on it,
 * since it's never attached to the DOM.
 */
function captureConstructedAudio(): { current: HTMLAudioElement | null } {
  const captured: { current: HTMLAudioElement | null } = { current: null };
  const OriginalAudio = globalThis.Audio;
  class CapturingAudio extends OriginalAudio {
    constructor(...args: ConstructorParameters<typeof OriginalAudio>) {
      super(...args);
      captured.current = this;
    }
  }
  vi.stubGlobal("Audio", CapturingAudio);
  return captured;
}

function getReadingState(state: SeedBibleState) {
  return state.app.currentReadingState.value!.tab.readingState;
}

/**
 * The verses targeted by the most recently added diminish-flash decoration.
 * Each verse crossing adds a new decoration (mirroring `emphasizeVerses`)
 * rather than replacing one in place, so an older verse's flash can still be
 * mid-fade-out alongside the current one — the most recent is what's current.
 */
function diminishedVerses(state: SeedBibleState) {
  return getReadingState(state)
    .decorations.value.filter(
      (d) => d.className === "sb-verse-decoration-diminish"
    )
    .at(-1)?.verses;
}

describe("audio-reader verse highlight sync", () => {
  let state: SeedBibleState;
  let audio: { current: HTMLAudioElement | null };

  beforeEach(() => {
    audio = captureConstructedAudio();
  });

  afterEach(() => {
    unregisterExtension("ext_audioReader");
    vi.unstubAllGlobals();
  });

  function pressPlay() {
    const readingState = getReadingState(state);
    const ctx: QuickToolContext = {
      readingState,
      playlists: state.playlists,
      annotations: state.annotations,
      features: state.features,
      surface: "quick-toolbar",
    };
    const tool = state.tools
      .getQuickTools(ctx)
      .find((t) => t.id === "ext_audioReader-play");
    tool!.onSelect();
  }

  function playAt(currentTime: number) {
    audio.current!.currentTime = currentTime;
    audio.current!.dispatchEvent(new Event("timeupdate"));
  }

  it("flashes the diminish highlight on the verse being read, and stops once the chapter has no timings", async () => {
    state = await createTestSeedBibleState({ responses: createResponses() });
    setupExtensionContext(state);
    initAudioReaderExtension();

    pressPlay();
    await vi.waitFor(() => {
      expect(audio.current?.src).toBe(CHAPTER_1_AUDIO_URL);
    });

    // Fetching the reader's timings is async — wait for the first flash to
    // land, then confirm it targets verse 1.
    await vi.waitFor(() => {
      playAt(0);
      expect(diminishedVerses(state)).toEqual([1]);
    });
    const readingState = getReadingState(state);
    const decoration = readingState.decorations.value.find(
      (d) => d.className === "sb-verse-decoration-diminish"
    )!;
    expect(decoration.bookId).toBe("GEN");
    expect(decoration.chapterNumber).toBe(1);
    // Verse 1 spans 0s to 5s (verse 2's start), so it fades exactly then
    // rather than after a fixed timeout.
    expect(decoration.removeAfterMs).toBe(5000);

    // Crossing into verse 2's span re-flashes on verse 2 instead.
    playAt(6);
    expect(diminishedVerses(state)).toEqual([2]);
    // Verse 2 is the last one, and jsdom's audio element never reports a
    // duration, so there's nothing to fade it out at — it stays lit.
    const lastVerseDecoration = readingState.decorations.value.find(
      (d) => d.className === "sb-verse-decoration-diminish" && d.verses[0] === 2
    )!;
    expect(lastVerseDecoration.removeAfterMs).toBeUndefined();

    // Navigating to a chapter with no timings for this reader (GEN 2) stops
    // playback and clears the tracked verse; pressing play again loads that
    // chapter's audio but never highlights anything.
    await readingState.selectTranslationAndChapter(
      readingState.translationId.value,
      "GEN",
      2
    );
    pressPlay();
    await vi.waitFor(() => {
      expect(audio.current?.src).toBe(CHAPTER_2_AUDIO_URL);
    });

    playAt(1);
    expect(diminishedVerses(state)).toBeUndefined();
  });
});
