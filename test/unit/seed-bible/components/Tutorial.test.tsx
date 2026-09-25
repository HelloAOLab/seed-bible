import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { Tutorial } from "@packages/seed-bible/seed-bible/components/Tutorial/Tutorial";
import type {
  TutorialManager,
  TutorialStep,
} from "@packages/seed-bible/seed-bible/managers/TutorialManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

const TARGET_SELECTOR = ".tutorial-target";

function makeStep(overrides: Partial<TutorialStep> = {}): TutorialStep {
  return {
    id: "step-1",
    target: TARGET_SELECTOR,
    titleKey: "step.title",
    titleDefault: "Title",
    bodyKey: "step.body",
    bodyDefault: "Body",
    ...overrides,
  };
}

/** Minimal fake — only the members `Tutorial` actually reads. */
function createFakeTutorial(step: TutorialStep): TutorialManager {
  return {
    steps: [step],
    running: signal(true),
    index: signal(0),
    currentStep: signal(step),
    isLast: signal(true),
    canGoBack: signal(false),
    completed: signal(false),
    optedOut: signal(false),
    promptVisible: signal(false),
    featuresSeen: signal({}),
    start: vi.fn(),
    startContextual: vi.fn(),
    next: vi.fn(),
    prev: vi.fn(),
    finish: vi.fn(),
    optOut: vi.fn(),
    acceptPrompt: vi.fn(),
    dismissPrompt: vi.fn(),
    hydrateStoredFlags: vi.fn(),
    armAutoStart: vi.fn(),
  } as unknown as TutorialManager;
}

function rect(partial: Partial<DOMRect>): DOMRect {
  return {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
    ...partial,
  } as DOMRect;
}

/**
 * The overlay (`.sb-tour-overlay`) measures its own box for `frame.value`
 * alongside the spotlighted target, so both need a rect — jsdom otherwise
 * reports everything as 0x0. Distinguishes them by the target's own class.
 */
function mockRects(targetRect: DOMRect, overlayRect: DOMRect) {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      return this.classList.contains("tutorial-target")
        ? targetRect
        : overlayRect;
    }
  );
}

const VIEWPORT = rect({
  top: 0,
  left: 0,
  right: 1024,
  bottom: 768,
  width: 1024,
  height: 768,
});

describe("Tutorial — scrolling an off-screen target into view", () => {
  let container: HTMLDivElement;
  let targetEl: HTMLDivElement;
  let scrollIntoViewMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    targetEl = document.createElement("div");
    targetEl.className = "tutorial-target";
    document.body.appendChild(targetEl);

    scrollIntoViewMock = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoViewMock,
    });
    Object.defineProperty(window, "innerWidth", {
      value: 1024,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: 768,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    targetEl.remove();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("scrolls the target into view when the step starts below the fold", () => {
    // 2000px below the visible viewport (0-768).
    mockRects(
      rect({
        top: 2000,
        bottom: 2100,
        left: 0,
        right: 200,
        width: 200,
        height: 100,
      }),
      VIEWPORT
    );

    const tutorial = createFakeTutorial(makeStep());
    act(() => {
      render(<Tutorial tutorial={tutorial} />, container);
    });

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  });

  it("does not scroll when the target is already fully on screen", () => {
    mockRects(
      rect({
        top: 100,
        bottom: 200,
        left: 100,
        right: 300,
        width: 200,
        height: 100,
      }),
      VIEWPORT
    );

    const tutorial = createFakeTutorial(makeStep());
    act(() => {
      render(<Tutorial tutorial={tutorial} />, container);
    });

    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });

  it("scrolls when the target is only partially visible (past the bottom edge)", () => {
    mockRects(
      rect({
        top: 700,
        bottom: 900,
        left: 100,
        right: 300,
        width: 200,
        height: 200,
      }),
      VIEWPORT
    );

    const tutorial = createFakeTutorial(makeStep());
    act(() => {
      render(<Tutorial tutorial={tutorial} />, container);
    });

    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
  });

  it("does not keep re-scrolling on every poll tick for the same step", () => {
    vi.useFakeTimers();
    mockRects(
      rect({
        top: 2000,
        bottom: 2100,
        left: 0,
        right: 200,
        width: 200,
        height: 100,
      }),
      VIEWPORT
    );

    const tutorial = createFakeTutorial(makeStep());
    act(() => {
      render(<Tutorial tutorial={tutorial} />, container);
    });
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);

    // Several 150ms poll ticks while the step stays active.
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
  });

  it("scrolls again for a newly-entered step that is also off screen", () => {
    mockRects(
      rect({
        top: 2000,
        bottom: 2100,
        left: 0,
        right: 200,
        width: 200,
        height: 100,
      }),
      VIEWPORT
    );

    const step1 = makeStep({ id: "step-1" });
    const tutorial = createFakeTutorial(step1);
    act(() => {
      render(<Tutorial tutorial={tutorial} />, container);
    });
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);

    const step2 = makeStep({ id: "step-2" });
    (tutorial.currentStep as unknown as { value: TutorialStep }).value = step2;
    act(() => {
      render(<Tutorial tutorial={tutorial} />, container);
    });

    expect(scrollIntoViewMock).toHaveBeenCalledTimes(2);
  });
});
