import { signal } from "@preact/signals";
import {
  attachListeningRecorder,
  isAudioPlayToolVisible,
  type ListeningTarget,
} from "@packages/audio-reader-extension/ext_audioReader/host/init";
import type { QuickToolContext } from "@packages/seed-bible/seed-bible/managers/BibleToolsManager";

function createContext(overrides: {
  surface: QuickToolContext["surface"];
  isMobile: boolean;
  hasAudio?: boolean;
  playing?: unknown;
}): QuickToolContext {
  return {
    readingState: {
      chapterData: signal(
        // An audio-less chapter carries an empty map, not null — the API type
        // makes `thisChapterAudioLinks` non-nullable.
        overrides.hasAudio === false
          ? { thisChapterAudioLinks: {} }
          : { thisChapterAudioLinks: { reader: "https://example.com/a.mp3" } }
      ),
    } as any,
    playlists: {
      playing: signal(overrides.playing ?? null),
      isMobile: signal(overrides.isMobile),
    } as any,
    annotations: {} as any,
    features: {} as any,
    surface: overrides.surface,
  };
}

describe("isAudioPlayToolVisible (#1607)", () => {
  it("is hidden on the quick-toolbar surface on mobile", () => {
    const ctx = createContext({ surface: "quick-toolbar", isMobile: true });
    expect(isAudioPlayToolVisible(ctx)).toBe(false);
  });

  it("is visible on the mobile-navigation-bar surface on mobile", () => {
    const ctx = createContext({
      surface: "mobile-navigation-bar",
      isMobile: true,
    });
    expect(isAudioPlayToolVisible(ctx)).toBe(true);
  });

  it("is visible on the quick-toolbar surface on desktop", () => {
    const ctx = createContext({ surface: "quick-toolbar", isMobile: false });
    expect(isAudioPlayToolVisible(ctx)).toBe(true);
  });

  it("is hidden when the chapter has no audio", () => {
    const ctx = createContext({
      surface: "mobile-navigation-bar",
      isMobile: true,
      hasAudio: false,
    });
    expect(isAudioPlayToolVisible(ctx)).toBe(false);
  });

  it("is hidden while a playlist is playing, regardless of surface", () => {
    const ctx = createContext({
      surface: "mobile-navigation-bar",
      isMobile: false,
      playing: { id: "playing" },
    });
    expect(isAudioPlayToolVisible(ctx)).toBe(false);
  });
});

/** Enough of an audio element to drive the recorder without real playback. */
class FakeAudio extends EventTarget {
  currentTime = 0;
  paused = true;

  play() {
    this.paused = false;
    this.dispatchEvent(new Event("play"));
  }

  pause() {
    this.paused = true;
    this.dispatchEvent(new Event("pause"));
  }
}

const START_MS = 1_700_000_000_000;
const START_SECONDS = 1_700_000_000;
const PSALM_23: ListeningTarget = { bookId: "psalms", chapter: 23 };

function setup(target: ListeningTarget | null = PSALM_23) {
  const el = new FakeAudio();
  const saveSpan = vi.fn();
  let nowMs = START_MS;

  const detach = attachListeningRecorder(el as unknown as HTMLAudioElement, {
    getTarget: () => target,
    saveSpan,
    now: () => nowMs,
  });

  return {
    el,
    saveSpan,
    detach,
    /** Ordinary foreground playback: both clocks run, the element reports in. */
    listen(seconds: number) {
      nowMs += seconds * 1000;
      el.currentTime += seconds;
      el.dispatchEvent(new Event("timeupdate"));
    },
    /** A locked screen: audio plays on, but the frozen page fires no events. */
    listenWhileFrozen(seconds: number) {
      nowMs += seconds * 1000;
      el.currentTime += seconds;
    },
    /** Wall time passing with nothing playing. */
    wait(seconds: number) {
      nowMs += seconds * 1000;
    },
    /** The screen comes back on. */
    resume() {
      document.dispatchEvent(new Event("visibilitychange"));
    },
  };
}

describe("attachListeningRecorder", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("records listening that happened while the page was frozen", () => {
    const h = setup();

    h.el.play();
    h.listen(30);
    h.saveSpan.mockClear();

    // Phone goes in a pocket for six minutes of narration.
    h.listenWhileFrozen(360);
    h.resume();

    expect(h.saveSpan).toHaveBeenCalledWith(
      "psalms",
      23,
      START_SECONDS,
      START_SECONDS + 390
    );
  });

  it("credits only the time the audio actually advanced", () => {
    const h = setup();

    h.el.play();
    h.listenWhileFrozen(120);
    // Playback stopped at the end of the chapter; the phone stayed locked.
    h.wait(600);
    h.resume();

    expect(h.saveSpan).toHaveBeenCalledWith(
      "psalms",
      23,
      START_SECONDS,
      START_SECONDS + 120
    );
  });

  it("never credits more time than has passed on the wall clock", () => {
    const h = setup();

    h.el.play();
    // Two minutes of audio played back at double speed takes one real minute.
    h.el.currentTime += 120;
    h.wait(60);
    h.resume();

    expect(h.saveSpan).toHaveBeenCalledWith(
      "psalms",
      23,
      START_SECONDS,
      START_SECONDS + 60
    );
  });

  it("records the last stretch even when the element is rewound before the pause lands", () => {
    const h = setup();

    h.el.play();
    h.listen(300);
    h.saveSpan.mockClear();

    // What switching chapters does: rewind, then the pause event arrives.
    h.el.currentTime = 0;
    h.el.pause();

    expect(h.saveSpan).toHaveBeenCalledWith(
      "psalms",
      23,
      START_SECONDS,
      START_SECONDS + 300
    );
  });

  it("saves periodically so a long listen survives the page being killed", () => {
    const h = setup();

    h.el.play();
    h.listen(20);

    expect(h.saveSpan).toHaveBeenCalledWith(
      "psalms",
      23,
      START_SECONDS,
      START_SECONDS + 20
    );
  });

  it("credits a skip forward with only what was heard before it", () => {
    const h = setup();

    h.el.play();
    h.listen(60);
    h.saveSpan.mockClear();

    h.el.currentTime += 600;
    h.el.dispatchEvent(new Event("seeked"));

    expect(h.saveSpan).toHaveBeenCalledTimes(1);
    expect(h.saveSpan).toHaveBeenCalledWith(
      "psalms",
      23,
      START_SECONDS,
      START_SECONDS + 60
    );
  });

  it("closes the open stretch when playback restarts without a pause", () => {
    const h = setup();

    h.el.play();
    h.listen(60);
    h.saveSpan.mockClear();

    h.el.dispatchEvent(new Event("play"));

    expect(h.saveSpan).toHaveBeenCalledWith(
      "psalms",
      23,
      START_SECONDS,
      START_SECONDS + 60
    );
  });

  it("records nothing when the chapter being played is unknown", () => {
    const h = setup(null);

    h.el.play();
    h.listenWhileFrozen(300);
    h.resume();
    h.el.pause();

    expect(h.saveSpan).not.toHaveBeenCalled();
  });

  it("stops recording once detached", () => {
    const h = setup();

    h.el.play();
    h.detach();
    h.listen(300);
    h.resume();
    h.el.pause();

    expect(h.saveSpan).not.toHaveBeenCalled();
  });
});
