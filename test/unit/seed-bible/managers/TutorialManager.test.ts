import { signal } from "@preact/signals";
import {
  createTutorialManager,
  tourStep,
  type TutorialManager,
  type TutorialStep,
} from "@packages/seed-bible/seed-bible/managers/TutorialManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import type { OnboardingManager } from "@packages/seed-bible/seed-bible/managers/OnboardingManager";
import type { BibleSelectorState } from "@packages/seed-bible/seed-bible/managers/BibleSelectorManager";

// Minimal stand-ins for the three managers createTutorialManager depends on.
// Only the members it actually reads are provided. `userId` stays null so
// profile persistence no-ops (saveProfileConfigValue bails when logged out) and
// the per-tour "seen" flags fall through to localStorage, which jsdom provides.
function createMocks() {
  const login = {
    userId: signal<string | null>(null),
    profile: signal<unknown>(null),
    updateProfile: jest.fn(),
  } as unknown as LoginManager;

  const onboarding = {
    // Not "done", so the first-run onboarding tour never auto-starts mid-test.
    step: signal("welcome"),
  } as unknown as OnboardingManager;

  const selector = {
    viewportWidth: signal(1024),
    isOpen: signal(false),
    selectingTranslation: signal(false),
    setOpen: jest.fn(),
  } as unknown as BibleSelectorState;

  return { login, onboarding, selector };
}

const twoSteps = (prefix: string): TutorialStep[] => [
  tourStep({
    id: `${prefix}-1`,
    target: `.${prefix}-a`,
    title: "1",
    body: "b1",
  }),
  tourStep({
    id: `${prefix}-2`,
    target: `.${prefix}-b`,
    title: "2",
    body: "b2",
  }),
];

let manager: TutorialManager;

beforeEach(() => {
  window.localStorage.clear();
  const { login, onboarding, selector } = createMocks();
  manager = createTutorialManager(login, onboarding, selector);
});

describe("tourStep()", () => {
  it("namespaces i18n keys and passes through the rest", () => {
    const onEnter = jest.fn();
    const onLeave = jest.fn();
    const step = tourStep({
      id: "hl",
      target: ".hl",
      title: "Title",
      body: "Body",
      placement: "left",
      elevated: true,
      group: "selector",
      onEnter,
      onLeave,
    });

    expect(step).toEqual({
      id: "hl",
      target: ".hl",
      titleKey: "tour.hl.title",
      titleDefault: "Title",
      bodyKey: "tour.hl.body",
      bodyDefault: "Body",
      placement: "left",
      elevated: true,
      group: "selector",
      onEnter,
      onLeave,
    });
  });
});

describe("registerTour + startContextual", () => {
  it("does not auto-start anything", () => {
    expect(manager.running.value).toBe(false);
    expect(manager.currentStep.value).toBeNull();
  });

  it("runs a registered custom tour with working navigation", () => {
    manager.registerTour("demo", twoSteps("demo"));

    manager.startContextual("demo");
    expect(manager.running.value).toBe(true);
    expect(manager.currentStep.value?.id).toBe("demo-1");
    expect(manager.isLast.value).toBe(false);
    expect(manager.canGoBack.value).toBe(false);

    manager.next();
    expect(manager.currentStep.value?.id).toBe("demo-2");
    expect(manager.isLast.value).toBe(true);
    expect(manager.canGoBack.value).toBe(true);

    manager.prev();
    expect(manager.currentStep.value?.id).toBe("demo-1");

    // Advancing past the last step finishes the tour.
    manager.next();
    manager.next();
    expect(manager.running.value).toBe(false);
  });

  it("ignores startContextual for an unknown id", () => {
    manager.startContextual("nope");
    expect(manager.running.value).toBe(false);
  });

  it("does not start a second tour while one is running", () => {
    manager.registerTour("a", twoSteps("a"));
    manager.registerTour("b", twoSteps("b"));

    manager.startContextual("a");
    manager.startContextual("b"); // ignored — already running

    expect(manager.currentStep.value?.id).toBe("a-1");
  });
});

describe("once-only behavior", () => {
  it("auto-shows a tour only once (default)", () => {
    manager.registerTour("demo", twoSteps("demo"));

    manager.startContextual("demo");
    manager.finish();
    expect(manager.running.value).toBe(false);
    expect(manager.featuresSeen.value["demo"]).toBe(true);

    // Already seen → no-op.
    manager.startContextual("demo");
    expect(manager.running.value).toBe(false);
  });

  it("replays a tour registered with { once: false }", () => {
    manager.registerTour("replayable", twoSteps("replayable"), { once: false });

    manager.startContextual("replayable");
    manager.finish();
    expect(manager.featuresSeen.value["replayable"]).toBeFalsy();

    manager.startContextual("replayable");
    expect(manager.running.value).toBe(true);
    expect(manager.currentStep.value?.id).toBe("replayable-1");
  });
});

describe("startTour() (manual replay)", () => {
  it("starts even after the tour has been seen", () => {
    manager.registerTour("demo", twoSteps("demo"));
    manager.startContextual("demo");
    manager.finish();
    expect(manager.featuresSeen.value["demo"]).toBe(true);

    manager.startContextual("demo"); // suppressed (seen)
    expect(manager.running.value).toBe(false);

    manager.startTour("demo"); // forces it regardless
    expect(manager.running.value).toBe(true);
    expect(manager.currentStep.value?.id).toBe("demo-1");
  });

  it("works for built-in contextual tours too", () => {
    // "search" is a built-in CONTEXTUAL_TUTORIALS entry.
    manager.startTour("search");
    expect(manager.running.value).toBe(true);
    expect(manager.currentStep.value?.id).toBe("selector-search");
  });
});

describe("opt-out", () => {
  it("suppresses startContextual but not the explicit startTour", () => {
    manager.registerTour("demo", twoSteps("demo"));
    manager.optOut();
    expect(manager.optedOut.value).toBe(true);

    manager.startContextual("demo");
    expect(manager.running.value).toBe(false);

    manager.startTour("demo");
    expect(manager.running.value).toBe(true);
  });
});
