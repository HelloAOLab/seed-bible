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
    ).toBe("-1:15");
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
