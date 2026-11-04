import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import initAudioReaderExtension from "@packages/audio-reader-extension/ext_audioReader/host/init";
import { BibleReaderToolbar } from "@packages/seed-bible/seed-bible/components/BibleReaderToolbar/BibleReaderToolbar";
import {
  setupExtensionContext,
  unregisterExtension,
} from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { AudioPlaybackController } from "@packages/seed-bible/seed-bible/managers/AudioPlaybackManager";
import {
  createTestSeedBibleState,
  waitFor,
} from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";
import {
  aabBooks,
  createResponse,
  makeChapter,
  makeUrl,
  translations,
} from "../managers/testUtils/mockBibleApiData";

const MOBILE_VIEWPORT_WIDTH = 400;
const DESKTOP_VIEWPORT_WIDTH = 1280;
const PRIVATE_API_ENDPOINT = "https://vmfnri.helloao.org";

function createResponses() {
  return {
    [makeUrl("/api/available_translations.json", PRIVATE_API_ENDPOINT)]:
      createResponse(translations),
    [makeUrl("/api/AAB/books.json", PRIVATE_API_ENDPOINT)]:
      createResponse(aabBooks),
    [makeUrl("/api/AAB/GEN/1.json", PRIVATE_API_ENDPOINT)]: createResponse({
      ...makeChapter(aabBooks, "GEN", 1),
      thisChapterAudioLinks: { gilbert: "https://audio.example/GEN/1.mp3" },
    }),
  };
}

/** A 100-second recording, 40 seconds in. */
function createPlayback() {
  const isPlaying = signal(true);
  const playback: AudioPlaybackController = {
    unit: "seconds",
    isPlaying,
    currentTime: signal(40),
    duration: signal<number | null>(100),
    play: vi.fn(() => {
      isPlaying.value = true;
    }),
    pause: vi.fn(() => {
      isPlaying.value = false;
    }),
    seek: vi.fn(),
    stop: vi.fn(),
  };
  return { playback, isPlaying };
}

describe("BibleReaderToolbar — audio playback", () => {
  let container: HTMLDivElement;
  let state: SeedBibleState;

  async function setup(viewportWidth: number) {
    window.innerWidth = viewportWidth;
    window.innerHeight = 800;
    state = await createTestSeedBibleState({ responses: createResponses() });
    await act(async () => {
      window.dispatchEvent(new Event("resize"));
    });
    setupExtensionContext(state);
    await act(async () => {
      initAudioReaderExtension();
    });
    await act(async () => {
      render(
        <TestHost state={state}>
          <BibleReaderToolbar state={state} />
        </TestHost>,
        container
      );
    });
  }

  async function showPlayback(playback: AudioPlaybackController) {
    let hide = () => {};
    await act(() => {
      hide = state.audioPlayback.show(
        state.app.currentReadingState.value!.tab.readingState,
        playback
      );
    });
    return hide;
  }

  const button = (label: string) =>
    container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    unregisterExtension("ext_audioReader");
    render(null, container);
    container.remove();
  });

  describe("on desktop", () => {
    beforeEach(() => setup(DESKTOP_VIEWPORT_WIDTH));

    it("shows nothing extra until audio is playing", () => {
      expect(container.querySelector(".sb-audio-scrubber")).toBeNull();
      expect(button("Pause")).toBeNull();
    });

    it("shows progress with the time remaining and a pause button while playing", async () => {
      const { playback } = createPlayback();
      await showPlayback(playback);

      const toolbar = container.querySelector(".sb-reader-toolbar")!;
      expect(toolbar.querySelector('[role="slider"]')).not.toBeNull();
      expect(
        toolbar.querySelector(".sb-audio-scrubber-remaining")?.textContent
      ).toBe("1:00");
      expect(button("Pause")).not.toBeNull();
      expect(button("Stop")).toBeNull();

      await act(() => button("Pause")!.click());
      expect(playback.pause).toHaveBeenCalledOnce();
    });

    it("offers play and stop once paused, and stop takes the controls away", async () => {
      const { playback, isPlaying } = createPlayback();
      isPlaying.value = false;
      // Stopping takes the controls down, as the extension's own stop does.
      const hide = await showPlayback(playback);
      playback.stop = vi.fn(hide);

      expect(button("Play")).not.toBeNull();
      expect(button("Stop")).not.toBeNull();

      await act(() => button("Play")!.click());
      expect(playback.play).toHaveBeenCalledOnce();
      expect(button("Stop")).toBeNull();

      await act(() => button("Pause")!.click());
      await act(() => button("Stop")!.click());
      expect(playback.stop).toHaveBeenCalledOnce();
      expect(container.querySelector(".sb-audio-scrubber")).toBeNull();
      expect(button("Play")).toBeNull();
    });
  });

  describe("on mobile", () => {
    beforeEach(() => setup(MOBILE_VIEWPORT_WIDTH));

    const nav = () => container.querySelector(".sb-reader-floating-nav")!;

    it("shows the scrubber above the chapter pill while playing", async () => {
      const { playback } = createPlayback();
      await showPlayback(playback);

      expect(
        nav().querySelector(
          ".sb-reader-floating-nav-group-wrap > .sb-audio-scrubber"
        )
      ).not.toBeNull();
      expect(nav().querySelector(".sb-audio-progress-ring")).toBeNull();
    });

    it("shows the time remaining beside the scrubber", async () => {
      const { playback } = createPlayback();
      await showPlayback(playback);

      expect(
        nav().querySelector(".sb-audio-scrubber-remaining")?.textContent
      ).toBe("1:00");
    });

    it("moves progress to a ring around the play button while paused", async () => {
      const { playback, isPlaying } = createPlayback();
      await showPlayback(playback);

      await act(() => {
        isPlaying.value = false;
      });

      expect(nav().querySelector(".sb-audio-scrubber")).toBeNull();
      expect(
        nav().querySelector(
          ".sb-reader-floating-nav-play-wrap > .sb-audio-progress-ring"
        )
      ).not.toBeNull();
    });
  });

  describe("listening to a playlist", () => {
    beforeEach(() => setup(DESKTOP_VIEWPORT_WIDTH));

    /** Narration that is already playing, with verse n starting at (n - 1) * 10. */
    function createVerseTimedPlayback() {
      const { playback } = createPlayback();
      const currentTime = signal(0);
      return {
        currentTime,
        playback: {
          ...playback,
          currentTime,
          seek: vi.fn((position: number) => {
            currentTime.value = position;
          }),
          verseAt: (position: number) => ({
            number: Math.floor(position / 10) + 1,
            heading: null,
          }),
          verseMarks: () =>
            Array.from({ length: 10 }, (_, index) => ({
              position: index * 10,
              startsSection: false,
            })),
        } satisfies AudioPlaybackController,
      };
    }

    it("moves on through two steps in the same chapter while narration plays on", async () => {
      const { playback, currentTime } = createVerseTimedPlayback();
      await showPlayback(playback);
      const playing = state.playlists.startPlaying(
        {
          id: "p1",
          title: null,
          description: null,
          items: [
            {
              type: "bible-verse",
              ref: { bookId: "GEN", chapter: 1, verse: 2, endVerse: 3 },
            },
            {
              type: "bible-verse",
              ref: { bookId: "GEN", chapter: 1, verse: 4, endVerse: 5 },
            },
          ],
        },
        0,
        { history: false }
      )!;
      // The toolbar follows narration in effects that run on the next frame
      // (outside `act`, which would hold them back), so each step is waited
      // for rather than expected at once.
      playing.setListenAlong(true);
      // Narration goes to where the first passage starts, verse 2.
      await waitFor(() => currentTime.value === 10);

      // Verse 4 starts: the first passage has been read.
      currentTime.value = 31;
      await waitFor(() => playing.currentIndex.value === 1);
      // Still playing, narration goes to where the second passage starts.
      await waitFor(() => currentTime.value === 30);

      // Verse 6 starts: the second, last passage has been read too.
      currentTime.value = 51;
      await waitFor(() => !playing.listenAlong.value);
    });
  });
});
