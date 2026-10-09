import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import {
  AudioProgressRing,
  AudioScrubber,
  SCRUB_HANDLE_HIDE_DELAY_MS,
} from "@packages/seed-bible/seed-bible/components/AudioScrubber/AudioScrubber";
import {
  I18nProvider,
  createI18nManager,
} from "@packages/seed-bible/seed-bible/i18n";
import {
  createNavigationManager,
  formatPlaybackTime,
  type AudioPlaybackController,
} from "@packages/seed-bible/seed-bible/managers";

/** The bar is laid out 200px wide starting at x=100. */
const TRACK_LEFT = 100;
const TRACK_WIDTH = 200;

/** A 100-second recording, 25 seconds in, whose seeks land immediately. */
function createPlayback() {
  const currentTime = signal(25);
  const seek = vi.fn((seconds: number) => {
    currentTime.value = seconds;
  });
  const playback: AudioPlaybackController = {
    unit: "seconds",
    isPlaying: signal(true),
    currentTime,
    duration: signal<number | null>(100),
    play: vi.fn(),
    pause: vi.fn(),
    seek,
    stop: vi.fn(),
  };
  return { playback, seek, currentTime };
}

describe("AudioScrubber", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.useRealTimers();
  });

  async function renderScrubber(
    playback: AudioPlaybackController,
    options: { showTimeRemaining?: boolean } = {}
  ) {
    await act(() => {
      render(
        <I18nProvider
          i18n={createI18nManager(createNavigationManager(), ["en"])}
        >
          <AudioScrubber
            playback={playback}
            showTimeRemaining={options.showTimeRemaining}
          />
        </I18nProvider>,
        container
      );
    });
    // jsdom does no layout, so give the bar the size a browser would.
    slider().getBoundingClientRect = () =>
      ({
        left: TRACK_LEFT,
        width: TRACK_WIDTH,
        right: TRACK_LEFT + TRACK_WIDTH,
        top: 0,
        bottom: 20,
        height: 20,
        x: TRACK_LEFT,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
  }

  const slider = () => container.querySelector<HTMLElement>('[role="slider"]')!;

  const isHandleVisible = () =>
    container
      .querySelector(".sb-audio-scrubber")!
      .classList.contains("sb-audio-scrubber-handle-visible");

  const fillWidth = () =>
    container.querySelector<HTMLElement>(".sb-audio-scrubber-fill")!.style
      .width;

  function pointer(
    type: string,
    pointerType: "mouse" | "touch",
    clientX = TRACK_LEFT
  ) {
    return act(() => {
      slider().dispatchEvent(
        new window.PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerType,
          clientX,
          button: 0,
        })
      );
    });
  }

  it("shows how far playback has got", async () => {
    const { playback, currentTime } = createPlayback();
    await renderScrubber(playback);

    expect(fillWidth()).toBe("25%");
    expect(slider().getAttribute("aria-valuetext")).toBe("0:25 of 1:40");

    await act(() => {
      currentTime.value = 50;
    });
    expect(fillWidth()).toBe("50%");
  });

  it("shows the time remaining when asked to", async () => {
    const { playback } = createPlayback();
    await renderScrubber(playback, { showTimeRemaining: true });

    expect(
      container.querySelector(".sb-audio-scrubber-remaining")?.textContent
    ).toBe("1:15");
  });

  it("shows a placeholder for the time remaining before the length is known", async () => {
    const { playback } = createPlayback();
    (playback.duration as ReturnType<typeof signal<number | null>>).value =
      null;
    await renderScrubber(playback, { showTimeRemaining: true });

    expect(
      container.querySelector(".sb-audio-scrubber-remaining")?.textContent
    ).toBe("--:--");
    expect(fillWidth()).toBe("0%");
  });

  it("keeps the handle hidden until a mouse hovers over the bar", async () => {
    const { playback } = createPlayback();
    await renderScrubber(playback);
    expect(isHandleVisible()).toBe(false);

    await pointer("pointerenter", "mouse");
    expect(isHandleVisible()).toBe(true);

    await pointer("pointerleave", "mouse");
    expect(isHandleVisible()).toBe(false);
  });

  it("seeks to where the mouse clicks", async () => {
    const { playback, seek } = createPlayback();
    await renderScrubber(playback);

    await pointer("pointerenter", "mouse");
    // Three quarters of the way along the bar.
    await pointer("pointerdown", "mouse", TRACK_LEFT + 150);
    await pointer("pointerup", "mouse", TRACK_LEFT + 150);

    expect(seek).toHaveBeenCalledExactlyOnceWith(75);
    expect(fillWidth()).toBe("75%");
  });

  it("only reveals the handle on a first tap, without moving playback", async () => {
    const { playback, seek } = createPlayback();
    await renderScrubber(playback);

    await pointer("pointerdown", "touch", TRACK_LEFT + 150);
    await pointer("pointerup", "touch", TRACK_LEFT + 150);

    expect(isHandleVisible()).toBe(true);
    expect(seek).not.toHaveBeenCalled();
    expect(fillWidth()).toBe("25%");
  });

  it("snaps to a second tap and follows the finger as it drags", async () => {
    const { playback, seek } = createPlayback();
    await renderScrubber(playback);

    await pointer("pointerdown", "touch", TRACK_LEFT + 150);
    await pointer("pointerup", "touch", TRACK_LEFT + 150);

    // The second tap snaps the handle to the finger straight away...
    await pointer("pointerdown", "touch", TRACK_LEFT + 100);
    expect(fillWidth()).toBe("50%");

    // ...and dragging previews the new spot without seeking on every move.
    await pointer("pointermove", "touch", TRACK_LEFT + 20);
    expect(fillWidth()).toBe("10%");
    expect(seek).not.toHaveBeenCalled();

    await pointer("pointerup", "touch", TRACK_LEFT + 20);
    expect(seek).toHaveBeenCalledExactlyOnceWith(10);
  });

  it("clamps a drag that runs off either end of the bar", async () => {
    const { playback, seek } = createPlayback();
    await renderScrubber(playback);

    await pointer("pointerenter", "mouse");
    await pointer("pointerdown", "mouse", TRACK_LEFT + 100);
    await pointer("pointermove", "mouse", TRACK_LEFT + 900);
    await pointer("pointerup", "mouse", TRACK_LEFT + 900);

    expect(seek).toHaveBeenLastCalledWith(100);
  });

  it("does not seek when the drag is cancelled", async () => {
    const { playback, seek } = createPlayback();
    await renderScrubber(playback);

    await pointer("pointerenter", "mouse");
    await pointer("pointerdown", "mouse", TRACK_LEFT + 100);
    await pointer("pointercancel", "mouse", TRACK_LEFT + 100);

    expect(seek).not.toHaveBeenCalled();
    expect(fillWidth()).toBe("25%");
  });

  describe("dragging with a finger while the handle is hidden", () => {
    it("moves playback from where it is by how far the finger travels", async () => {
      const { playback, seek } = createPlayback();
      await renderScrubber(playback);

      // Lands three quarters along, but playback stays at 25% until it moves.
      await pointer("pointerdown", "touch", TRACK_LEFT + 150);
      expect(fillWidth()).toBe("25%");

      // 40px of a 200px bar is a fifth of the recording: 25s on to 45s.
      await pointer("pointermove", "touch", TRACK_LEFT + 190);
      expect(fillWidth()).toBe("45%");
      expect(seek).not.toHaveBeenCalled();

      await pointer("pointerup", "touch", TRACK_LEFT + 190);
      expect(seek).toHaveBeenCalledExactlyOnceWith(45);
    });

    it("moves back when dragged the other way", async () => {
      const { playback, seek } = createPlayback();
      await renderScrubber(playback);

      await pointer("pointerdown", "touch", TRACK_LEFT + 100);
      await pointer("pointermove", "touch", TRACK_LEFT + 80);
      await pointer("pointerup", "touch", TRACK_LEFT + 80);

      expect(seek).toHaveBeenCalledExactlyOnceWith(15);
    });

    it("treats a wobble too small to be a drag as a tap", async () => {
      const { playback, seek } = createPlayback();
      await renderScrubber(playback);

      await pointer("pointerdown", "touch", TRACK_LEFT + 100);
      await pointer("pointermove", "touch", TRACK_LEFT + 103);
      await pointer("pointerup", "touch", TRACK_LEFT + 103);

      expect(seek).not.toHaveBeenCalled();
      expect(isHandleVisible()).toBe(true);
    });

    it("stops at either end of the recording", async () => {
      const { playback, seek } = createPlayback();
      await renderScrubber(playback);

      await pointer("pointerdown", "touch", TRACK_LEFT + 100);
      await pointer("pointermove", "touch", TRACK_LEFT - 400);
      await pointer("pointerup", "touch", TRACK_LEFT - 400);

      expect(seek).toHaveBeenCalledExactlyOnceWith(0);
    });

    it("leaves a second tap to jump to the finger", async () => {
      const { playback, seek } = createPlayback();
      await renderScrubber(playback);

      // A first drag reveals the handle along the way.
      await pointer("pointerdown", "touch", TRACK_LEFT + 100);
      await pointer("pointermove", "touch", TRACK_LEFT + 120);
      await pointer("pointerup", "touch", TRACK_LEFT + 120);
      expect(seek).toHaveBeenLastCalledWith(35);

      await pointer("pointerdown", "touch", TRACK_LEFT + 180);
      expect(fillWidth()).toBe("90%");
      await pointer("pointerup", "touch", TRACK_LEFT + 180);
      expect(seek).toHaveBeenLastCalledWith(90);
    });
  });

  it("hides a tapped-open handle again after a few seconds", async () => {
    vi.useFakeTimers();
    const { playback, seek } = createPlayback();
    await renderScrubber(playback);

    await pointer("pointerdown", "touch", TRACK_LEFT + 150);
    await pointer("pointerup", "touch", TRACK_LEFT + 150);
    expect(isHandleVisible()).toBe(true);

    await act(() => {
      vi.advanceTimersByTime(SCRUB_HANDLE_HIDE_DELAY_MS - 1);
    });
    expect(isHandleVisible()).toBe(true);

    await act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(isHandleVisible()).toBe(false);

    // Once hidden, the next tap only reveals it again.
    await pointer("pointerdown", "touch", TRACK_LEFT + 150);
    await pointer("pointerup", "touch", TRACK_LEFT + 150);
    expect(isHandleVisible()).toBe(true);
    expect(seek).not.toHaveBeenCalled();
  });

  it("keeps the handle up while it is being dragged, then hides it after letting go", async () => {
    vi.useFakeTimers();
    const { playback } = createPlayback();
    await renderScrubber(playback);

    await pointer("pointerdown", "touch", TRACK_LEFT + 150);
    await pointer("pointerup", "touch", TRACK_LEFT + 150);
    await pointer("pointerdown", "touch", TRACK_LEFT + 150);

    await act(() => {
      vi.advanceTimersByTime(SCRUB_HANDLE_HIDE_DELAY_MS * 2);
    });
    expect(isHandleVisible()).toBe(true);

    await pointer("pointerup", "touch", TRACK_LEFT + 150);
    await act(() => {
      vi.advanceTimersByTime(SCRUB_HANDLE_HIDE_DELAY_MS);
    });
    expect(isHandleVisible()).toBe(false);
  });

  it("moves playback with the arrow, Home and End keys", async () => {
    const { playback, seek } = createPlayback();
    await renderScrubber(playback);

    const press = (key: string) =>
      act(() => {
        slider().dispatchEvent(
          new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
        );
      });

    await press("ArrowRight");
    expect(seek).toHaveBeenLastCalledWith(30);
    await press("ArrowLeft");
    expect(seek).toHaveBeenLastCalledWith(25);
    await press("End");
    expect(seek).toHaveBeenLastCalledWith(100);
    await press("Home");
    expect(seek).toHaveBeenLastCalledWith(0);
    // Already at the start: a further step back stays there.
    await press("ArrowLeft");
    expect(seek).toHaveBeenLastCalledWith(0);
  });
  describe("verse preview while dragging", () => {
    /** Verse 1 runs 0–40s, verse 2 (which starts a section) 40–100s. */
    function withVerses(playback: AudioPlaybackController) {
      return {
        ...playback,
        verseAt: (seconds: number) =>
          seconds < 40
            ? { number: 1, heading: null }
            : { number: 2, heading: "The Creation" },
      };
    }

    const preview = () => container.querySelector(".sb-audio-scrubber-preview");

    it("names the verse under the handle while it's held, and goes once let go", async () => {
      const { playback } = createPlayback();
      await renderScrubber(withVerses(playback));
      expect(preview()).toBeNull();

      await pointer("pointerenter", "mouse");
      // 10% along: 10s, inside verse 1.
      await pointer("pointerdown", "mouse", TRACK_LEFT + 20);
      expect(preview()?.textContent).toBe("Verse 1");

      await pointer("pointerup", "mouse", TRACK_LEFT + 20);
      expect(preview()).toBeNull();
    });

    it("follows the drag, adding the heading of a verse that starts a section", async () => {
      const { playback } = createPlayback();
      await renderScrubber(withVerses(playback));

      await pointer("pointerenter", "mouse");
      await pointer("pointerdown", "mouse", TRACK_LEFT + 20);
      // 60% along: 60s, inside verse 2.
      await pointer("pointermove", "mouse", TRACK_LEFT + 120);

      expect(
        preview()?.querySelector(".sb-audio-scrubber-preview-heading")
          ?.textContent
      ).toBe("The Creation");
      expect(
        preview()?.querySelector(".sb-audio-scrubber-preview-verse")
          ?.textContent
      ).toBe("Verse 2");
    });

    it("shows nothing while the verse can't be told", async () => {
      const { playback } = createPlayback();
      await renderScrubber({ ...playback, verseAt: () => null });

      await pointer("pointerenter", "mouse");
      await pointer("pointerdown", "mouse", TRACK_LEFT + 20);

      expect(preview()).toBeNull();
    });

    it("isn't shown by the first tap that only reveals the handle", async () => {
      const { playback } = createPlayback();
      await renderScrubber(withVerses(playback));

      await pointer("pointerdown", "touch", TRACK_LEFT + 20);

      expect(preview()).toBeNull();
    });
  });

  describe("verse tick marks", () => {
    /** Verses start at 0s, 25s and 60s; the one at 60s starts a section. */
    function withMarks(playback: AudioPlaybackController) {
      return {
        ...playback,
        verseMarks: () => [
          { position: 0, startsSection: false },
          { position: 25, startsSection: false },
          { position: 60, startsSection: true },
        ],
      };
    }

    const ticks = () => [
      ...container.querySelectorAll<HTMLElement>(".sb-audio-scrubber-tick"),
    ];

    it("shows a tick where each verse starts, only while the handle is dragged", async () => {
      const { playback } = createPlayback();
      await renderScrubber(withMarks(playback));
      await pointer("pointerenter", "mouse");
      expect(ticks()).toHaveLength(0);

      await pointer("pointerdown", "mouse", TRACK_LEFT + 20);
      // The first verse's tick, at the very start, is left out.
      expect(ticks().map((tick) => tick.style.insetInlineStart)).toEqual([
        "25%",
        "60%",
      ]);

      await pointer("pointerup", "mouse", TRACK_LEFT + 20);
      expect(ticks()).toHaveLength(0);
    });

    it("draws a thicker tick where a verse starts a section", async () => {
      const { playback } = createPlayback();
      await renderScrubber(withMarks(playback));

      await pointer("pointerenter", "mouse");
      await pointer("pointerdown", "mouse", TRACK_LEFT + 20);

      expect(
        ticks().map((tick) =>
          tick.classList.contains("sb-audio-scrubber-tick-section")
        )
      ).toEqual([false, true]);
    });
  });

  describe("for speech counted in verses", () => {
    /** Twelve verses, reading the fourth. */
    function createVersePlayback() {
      const { playback, seek, currentTime } = createPlayback();
      currentTime.value = 3;
      return {
        playback: {
          ...playback,
          unit: "verses" as const,
          duration: signal<number | null>(12),
        },
        seek,
      };
    }

    it("shows the verse being read out of the total instead of a time", async () => {
      const { playback } = createVersePlayback();
      await renderScrubber(playback, { showTimeRemaining: true });

      expect(
        container.querySelector(".sb-audio-scrubber-remaining")?.textContent
      ).toBe("4/12");
      expect(slider().getAttribute("aria-valuetext")).toBe("Verse 4 of 12");
      expect(fillWidth()).toBe("25%");
    });

    it("snaps a drag to the verse under it", async () => {
      const { playback, seek } = createVersePlayback();
      await renderScrubber(playback);

      await pointer("pointerenter", "mouse");
      // 0.55 of the way along: inside the seventh verse's stretch (6/12–7/12).
      await pointer("pointerdown", "mouse", TRACK_LEFT + 110);
      expect(fillWidth()).toBe("50%");
      await pointer("pointerup", "mouse", TRACK_LEFT + 110);

      expect(seek).toHaveBeenCalledExactlyOnceWith(6);
    });

    it("lands on the last verse, not past it, at the far end", async () => {
      const { playback, seek } = createVersePlayback();
      await renderScrubber(playback);

      await pointer("pointerenter", "mouse");
      await pointer("pointerdown", "mouse", TRACK_LEFT + TRACK_WIDTH);
      await pointer("pointerup", "mouse", TRACK_LEFT + TRACK_WIDTH);

      expect(seek).toHaveBeenCalledExactlyOnceWith(11);
    });

    it("moves whole verses when dragged with a finger", async () => {
      const { playback, seek } = createVersePlayback();
      await renderScrubber(playback);

      // Reading the fourth of twelve verses; 40px of 200px is 2.4 verses on.
      await pointer("pointerdown", "touch", TRACK_LEFT + 20);
      await pointer("pointermove", "touch", TRACK_LEFT + 60);
      await pointer("pointerup", "touch", TRACK_LEFT + 60);

      expect(seek).toHaveBeenCalledExactlyOnceWith(5);
    });

    it("steps a verse at a time from the keyboard", async () => {
      const { playback, seek } = createVersePlayback();
      await renderScrubber(playback);

      const press = (key: string) =>
        act(() => {
          slider().dispatchEvent(
            new KeyboardEvent("keydown", {
              key,
              bubbles: true,
              cancelable: true,
            })
          );
        });

      await press("ArrowRight");
      expect(seek).toHaveBeenLastCalledWith(4);
      await press("ArrowLeft");
      expect(seek).toHaveBeenLastCalledWith(3);
      await press("End");
      expect(seek).toHaveBeenLastCalledWith(11);
    });
  });
});

describe("AudioProgressRing", () => {
  it("fills in proportion to how far playback has got", async () => {
    const container = document.createElement("div");
    const { playback, currentTime } = createPlayback();
    await act(() => {
      render(<AudioProgressRing playback={playback} />, container);
    });

    const fill = () => container.querySelector(".sb-audio-progress-ring-fill")!;
    const circumference = Number(fill().getAttribute("stroke-dasharray"));
    const offset = () => Number(fill().getAttribute("stroke-dashoffset"));

    expect(offset()).toBeCloseTo(circumference * 0.75);
    await act(() => {
      currentTime.value = 100;
    });
    expect(offset()).toBeCloseTo(0);

    render(null, container);
  });
});

describe("formatPlaybackTime", () => {
  it("formats minutes and seconds, adding hours only when needed", () => {
    expect(formatPlaybackTime(0)).toBe("0:00");
    expect(formatPlaybackTime(65.9)).toBe("1:05");
    expect(formatPlaybackTime(3_725)).toBe("1:02:05");
  });

  it("reads nonsense as zero rather than printing it", () => {
    expect(formatPlaybackTime(Number.NaN)).toBe("0:00");
    expect(formatPlaybackTime(-5)).toBe("0:00");
  });
});
