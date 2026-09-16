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

  /**
   * Dispatched directly rather than via `el.pause()`/`el.play()` (as a real
   * pause button would) because jsdom's `HTMLMediaElement` doesn't implement
   * either — see `HTMLMediaElement-impl.js` — so nothing would actually fire
   * the `pause`/`play` events those calls are supposed to produce.
   */
  function pauseAt(currentTime: number) {
    audio.current!.currentTime = currentTime;
    audio.current!.dispatchEvent(new Event("pause"));
  }

  function resumeAt(currentTime: number) {
    audio.current!.currentTime = currentTime;
    audio.current!.dispatchEvent(new Event("play"));
  }

  // A single test, rather than one per scenario: `init.tsx` keeps its audio
  // element as a module-level singleton (by design — see `ensureAudio`), so
  // splitting this into separate `it`s would have every scenario after the
  // first find `audioEl` already constructed and silently reuse it instead
  // of the fresh `CapturingAudio` stub `beforeEach` just installed.
  it("flashes the diminish highlight on the verse being read, clears it while paused, and stops once the chapter has no timings", async () => {
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
    const findDiminish = () =>
      readingState.decorations.value.filter(
        (d) => d.className === "sb-verse-decoration-diminish"
      );
    const decoration = findDiminish()[0]!;
    expect(decoration.bookId).toBe("GEN");
    expect(decoration.chapterNumber).toBe(1);
    // Verse 1 spans 0s to 5s (verse 2's start), so it fades exactly then
    // rather than after a fixed timeout.
    expect(decoration.removeAfterMs).toBe(5000);
    const verse1DecorationId = decoration.id;

    // Paused 2s into verse 1 — with no "stop" affordance yet distinct from
    // "pause", clearing the highlight here is what keeps a forgotten paused
    // session from leaving it lit forever, rather than fading out on the
    // wall-clock timer scheduled above (which would keep counting down even
    // though the audio isn't moving).
    pauseAt(2);
    expect(findDiminish()).toHaveLength(0);
    expect(diminishedVerses(state)).toBeUndefined();

    // Resuming from that same 2s position re-lights verse 1 (as a new
    // decoration, since the old one was cleared) and schedules its fade-out
    // for the 3 seconds that remain until verse 2's real 5s start — not
    // another 5s from scratch.
    resumeAt(2);
    const resumed = findDiminish()[0]!;
    expect(resumed.id).not.toBe(verse1DecorationId);
    expect(resumed.removeAfterMs).toBe(3000);
    expect(diminishedVerses(state)).toEqual([1]);

    // Still just short of verse 2's 300ms lead-in window — verse 1 stays the
    // only one lit.
    playAt(4.699);
    expect(diminishedVerses(state)).toEqual([1]);

    // 300ms before verse 2's real 5s start, its highlight is triggered early
    // (so its fade-in transition lands right on time) — but verse 1's own
    // decoration isn't touched, so the two are lit together for that instant
    // instead of leaving a gap between them.
    playAt(4.7);
    const diminishDecorations = findDiminish();
    expect(diminishDecorations.map((d) => d.verses)).toEqual([[1], [2]]);
    // Unchanged since the resume above re-armed it.
    expect(diminishDecorations[0]?.removeAfterMs).toBe(3000);
    // Verse 2 is the last one, and jsdom's audio element never reports a
    // duration, so there's nothing to fade it out at — it stays lit.
    expect(diminishDecorations[1]?.removeAfterMs).toBeUndefined();

    // The chapter finishes: per the media spec, reaching the end sets
    // `paused` and fires `pause` immediately before firing `ended` itself.
    audio.current!.currentTime = 0;
    Object.defineProperty(audio.current, "ended", {
      value: true,
      configurable: true,
    });
    audio.current!.dispatchEvent(new Event("pause"));
    audio.current!.dispatchEvent(new Event("ended"));

    // Pressing play again re-fetches timings and starts over at verse 1,
    // rather than resuming stuck on verse 2 from the previous playthrough.
    pressPlay();
    await vi.waitFor(() => {
      playAt(0);
      expect(diminishedVerses(state)).toEqual([1]);
    });

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
