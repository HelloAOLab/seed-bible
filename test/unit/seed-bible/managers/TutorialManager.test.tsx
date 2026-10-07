import { effect, signal, type ReadonlySignal } from "@preact/signals";

import {
  createTutorialManager,
  parseTutorialLink,
  mirrorTutorialToUrl,
  MOBILE_TUTORIAL_STEPS,
  ONBOARDING_STEPS,
  type TutorialLinkRequest,
  type TutorialStep,
} from "@packages/seed-bible/seed-bible/managers/TutorialManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import type { BibleSelectorState } from "@packages/seed-bible/seed-bible/managers/BibleSelectorManager";
import type { PanesManager } from "@packages/seed-bible/seed-bible/managers/PanesManager";
import { createSidebar as createRealSidebar } from "@packages/seed-bible/seed-bible/managers/SidebarManager";

type SidebarManager = ReturnType<typeof createRealSidebar>;

function createLogin(): LoginManager {
  return {
    userId: signal(null),
    profile: signal(null),
    localConfig: signal({}),
    hydrateLocalConfig: vi.fn(),
    updateProfile: vi.fn(),
  } as unknown as LoginManager;
}

// `readerVisible` true is the state that lets the tutorial auto-start fire;
// the offer is gated on the reader being open to a chapter and unobscured.
function createReaderVisible(visible = true): ReadonlySignal<boolean> {
  return signal(visible);
}

function createSelector(): BibleSelectorState {
  return {
    isOpen: signal(false),
    selectingTranslation: signal(false),
    setOpen: vi.fn(),
  } as unknown as BibleSelectorState;
}

function createPanes(): PanesManager {
  return {
    panes: signal([]),
    closeAll: vi.fn(),
  } as unknown as PanesManager;
}

function createSidebar(collapsed = false): SidebarManager {
  const isSidebarCollapsed = signal(collapsed);
  return {
    closeSearchPanel: vi.fn(),
    closeChatPanel: vi.fn(),
    closeSettings: vi.fn(),
    closeSidebar: vi.fn(),
    isSidebarCollapsed,
    setSidebarCollapsed: vi.fn((value: boolean) => {
      isSidebarCollapsed.value = value;
    }),
  } as unknown as SidebarManager;
}

describe("createTutorialManager — session-link joins", () => {
  beforeEach(() => {
    // Flags persist in localStorage; start each test from a clean slate so
    // `completed`/`optedOut` don't leak between cases.
    window.localStorage.clear();
  });

  it("does NOT offer the onboarding tour when joined via a session link", () => {
    // The auto-start surfaces an offer card (`promptVisible`) rather than
    // launching the tour unannounced; a session-link join suppresses that card
    // (and so never reaches `running`).
    const tutorial = createTutorialManager(
      createLogin(),
      createReaderVisible(true),
      createSelector(),
      signal(false),
      createPanes(),
      createSidebar(),
      /* openedViaContentLink */ signal(true)
    );

    // `createTutorialManager` no longer reads storage or watches for the
    // offer-card moment at construction — both would put the card in the
    // client's first render but not the SSR HTML. The real app makes these two
    // calls from a post-mount effect via `app.hydrateFromStorage()`.
    tutorial.hydrateStoredFlags();
    tutorial.armAutoStart();

    expect(tutorial.promptVisible.value).toBe(false);
    expect(tutorial.running.value).toBe(false);
  });

  it("offers the onboarding tour on a normal (non-session-link) visit", () => {
    // Control for the test above: same state, only the flag differs — proving
    // it's the session-link flag that suppresses the offer, not the setup.
    const tutorial = createTutorialManager(
      createLogin(),
      createReaderVisible(true),
      createSelector(),
      signal(false),
      createPanes(),
      createSidebar()
    );

    // `createTutorialManager` no longer reads storage or watches for the
    // offer-card moment at construction — both would put the card in the
    // client's first render but not the SSR HTML. The real app makes these two
    // calls from a post-mount effect via `app.hydrateFromStorage()`.
    tutorial.hydrateStoredFlags();
    tutorial.armAutoStart();

    expect(tutorial.promptVisible.value).toBe(true);
  });

  it("does NOT pop a contextual tutorial when joined via a session link", () => {
    // Mark the onboarding tour seen so its auto-start doesn't fire and mask
    // what we're actually asserting about startContextual().
    window.localStorage.setItem("sb-tutorial-seen", "true");

    const tutorial = createTutorialManager(
      createLogin(),
      createReaderVisible(true),
      createSelector(),
      signal(false),
      createPanes(),
      createSidebar(),
      /* openedViaContentLink */ signal(true)
    );

    // `createTutorialManager` no longer reads storage or watches for the
    // offer-card moment at construction — both would put the card in the
    // client's first render but not the SSR HTML. The real app makes these two
    // calls from a post-mount effect via `app.hydrateFromStorage()`.
    tutorial.hydrateStoredFlags();
    tutorial.armAutoStart();

    tutorial.startContextual("search");

    expect(tutorial.running.value).toBe(false);
  });

  it("pops a contextual tutorial on a normal (non-session-link) visit", () => {
    window.localStorage.setItem("sb-tutorial-seen", "true");

    const tutorial = createTutorialManager(
      createLogin(),
      createReaderVisible(true),
      createSelector(),
      signal(false),
      createPanes(),
      createSidebar()
    );

    // `createTutorialManager` no longer reads storage or watches for the
    // offer-card moment at construction — both would put the card in the
    // client's first render but not the SSR HTML. The real app makes these two
    // calls from a post-mount effect via `app.hydrateFromStorage()`.
    tutorial.hydrateStoredFlags();
    tutorial.armAutoStart();

    tutorial.startContextual("search");

    expect(tutorial.running.value).toBe(true);
  });
});

describe("createTutorialManager — startContextual with inline steps", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  function makeStep(id: string): TutorialStep {
    return {
      id,
      target: `.${id}`,
      titleKey: `${id}.title`,
      titleDefault: id,
      bodyKey: `${id}.body`,
      bodyDefault: id,
    };
  }

  it("runs the steps passed in, instead of the CONTEXTUAL_TUTORIALS registry lookup", () => {
    window.localStorage.setItem("sb-tutorial-seen", "true");

    const tutorial = createTutorialManager(
      createLogin(),
      createReaderVisible(true),
      createSelector(),
      signal(false),
      createPanes(),
      createSidebar()
    );
    tutorial.hydrateStoredFlags();
    tutorial.armAutoStart();

    // Not a registered CONTEXTUAL_TUTORIALS key, so a plain
    // `startContextual("a-brand-new-feature")` would no-op.
    tutorial.startContextual("a-brand-new-feature", [makeStep("step-1")]);

    expect(tutorial.running.value).toBe(true);
    expect(tutorial.currentStep.value?.id).toBe("step-1");
  });

  it("still tracks the seen flag under featureId, so it won't replay once finished", () => {
    window.localStorage.setItem("sb-tutorial-seen", "true");

    const tutorial = createTutorialManager(
      createLogin(),
      createReaderVisible(true),
      createSelector(),
      signal(false),
      createPanes(),
      createSidebar()
    );
    tutorial.hydrateStoredFlags();
    tutorial.armAutoStart();

    tutorial.startContextual("a-brand-new-feature", [makeStep("step-1")]);
    tutorial.finish();

    expect(tutorial.featuresSeen.value["a-brand-new-feature"]).toBe(true);

    tutorial.startContextual("a-brand-new-feature", [makeStep("step-1")]);
    expect(tutorial.running.value).toBe(false);
  });
});

describe("createTutorialManager — skip flow", () => {
  beforeEach(() => {
    // The onboarding tour's own "seen" flag persists in localStorage; start
    // clean so it doesn't mask what startContextual() decides.
    window.localStorage.clear();
    window.localStorage.setItem("sb-tutorial-seen", "true");
  });

  it("raises the skip prompt and ends the tour, without opting out", () => {
    const tutorial = createTutorialManager(
      createLogin(),
      createReaderVisible(true),
      createSelector(),
      signal(false),
      createPanes(),
      createSidebar()
    );
    tutorial.hydrateStoredFlags();
    tutorial.startContextual("search");
    expect(tutorial.running.value).toBe(true);

    tutorial.skip();

    expect(tutorial.running.value).toBe(false);
    expect(tutorial.skipPromptVisible.value).toBe(true);
    expect(tutorial.optedOut.value).toBe(false);
    // A contextual tip is not the introduction tour. Skipping it must not
    // quiet the install prompt that follows the introduction.
    expect(tutorial.leftIntroductionEarly.value).toBe(false);
  });

  it("keepTutorials() dismisses the prompt and leaves future tutorials enabled", () => {
    const tutorial = createTutorialManager(
      createLogin(),
      createReaderVisible(true),
      createSelector(),
      signal(false),
      createPanes(),
      createSidebar()
    );
    tutorial.hydrateStoredFlags();
    tutorial.startContextual("search");
    tutorial.skip();

    tutorial.keepTutorials();

    expect(tutorial.skipPromptVisible.value).toBe(false);
    expect(tutorial.optedOut.value).toBe(false);

    // A different contextual tutorial can still pop later — opting out wasn't
    // recorded just because the user skipped one tour.
    tutorial.startContextual("pane-layout");
    expect(tutorial.running.value).toBe(true);
  });

  it("optOut() from the skip prompt records the opt-out and hides the prompt", () => {
    const tutorial = createTutorialManager(
      createLogin(),
      createReaderVisible(true),
      createSelector(),
      signal(false),
      createPanes(),
      createSidebar()
    );
    tutorial.hydrateStoredFlags();
    tutorial.startContextual("search");
    tutorial.skip();

    tutorial.optOut();

    expect(tutorial.skipPromptVisible.value).toBe(false);
    expect(tutorial.optedOut.value).toBe(true);
    expect(tutorial.leftIntroductionEarly.value).toBe(false);

    // Opted out — a different contextual tutorial no longer pops.
    tutorial.startContextual("pane-layout");
    expect(tutorial.running.value).toBe(false);
  });
});

describe("createTutorialManager — leaving the introduction early", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  function createTutorial() {
    const tutorial = createTutorialManager(
      createLogin(),
      createReaderVisible(true),
      createSelector(),
      signal(false),
      createPanes(),
      createSidebar()
    );
    tutorial.hydrateStoredFlags();
    tutorial.armAutoStart();
    return tutorial;
  }

  it("records No thanks without treating a finished tour the same way", () => {
    const tutorial = createTutorial();

    expect(tutorial.promptVisible.value).toBe(true);
    tutorial.dismissPrompt();

    expect(tutorial.promptVisible.value).toBe(false);
    expect(tutorial.running.value).toBe(false);
    expect(tutorial.completed.value).toBe(true);
    expect(tutorial.leftIntroductionEarly.value).toBe(true);
  });

  it("records leaving the introduction tour before the end", () => {
    const tutorial = createTutorial();
    tutorial.acceptPrompt();
    expect(tutorial.running.value).toBe(true);

    tutorial.skip();

    expect(tutorial.running.value).toBe(false);
    expect(tutorial.skipPromptVisible.value).toBe(true);
    expect(tutorial.leftIntroductionEarly.value).toBe(true);

    // Closing "Turn off tutorials?" does not undo the early exit.
    tutorial.keepTutorials();
    expect(tutorial.skipPromptVisible.value).toBe(false);
    expect(tutorial.leftIntroductionEarly.value).toBe(true);
  });

  it("records opting out while the introduction tour is still open", () => {
    const tutorial = createTutorial();
    tutorial.start();

    tutorial.optOut();

    expect(tutorial.running.value).toBe(false);
    expect(tutorial.optedOut.value).toBe(true);
    expect(tutorial.leftIntroductionEarly.value).toBe(true);
  });

  it("does not record finishing the introduction tour", () => {
    const tutorial = createTutorial();
    tutorial.acceptPrompt();

    let guard = 0;
    while (tutorial.running.value && guard < 30) {
      tutorial.next();
      guard += 1;
    }

    expect(tutorial.running.value).toBe(false);
    expect(tutorial.completed.value).toBe(true);
    expect(tutorial.leftIntroductionEarly.value).toBe(false);
  });
});

describe("createTutorialManager — reader visibility gate", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("does NOT offer the tour while the reader isn't visible", () => {
    const tutorial = createTutorialManager(
      createLogin(),
      createReaderVisible(false),
      createSelector(),
      signal(false),
      createPanes(),
      createSidebar()
    );

    // `createTutorialManager` no longer reads storage or watches for the
    // offer-card moment at construction — both would put the card in the
    // client's first render but not the SSR HTML. The real app makes these two
    // calls from a post-mount effect via `app.hydrateFromStorage()`.
    tutorial.hydrateStoredFlags();
    tutorial.armAutoStart();

    expect(tutorial.promptVisible.value).toBe(false);
  });

  it("offers the tour once the reader becomes visible", () => {
    const readerVisible = signal(false);

    const tutorial = createTutorialManager(
      createLogin(),
      readerVisible,
      createSelector(),
      signal(false),
      createPanes(),
      createSidebar()
    );

    // `createTutorialManager` no longer reads storage or watches for the
    // offer-card moment at construction — both would put the card in the
    // client's first render but not the SSR HTML. The real app makes these two
    // calls from a post-mount effect via `app.hydrateFromStorage()`.
    tutorial.hydrateStoredFlags();
    tutorial.armAutoStart();

    expect(tutorial.promptVisible.value).toBe(false);

    readerVisible.value = true;

    expect(tutorial.promptVisible.value).toBe(true);
  });
});

describe("parseTutorialLink", () => {
  it("reads the tutorial id and step", () => {
    expect(
      parseTutorialLink(
        new URLSearchParams("tutorial=introduction&tutorialStep=3")
      )
    ).toEqual({ id: "introduction", step: 3 });
  });

  it("defaults to the first step when no valid step is given", () => {
    expect(parseTutorialLink(new URLSearchParams("tutorial=add-tab"))).toEqual({
      id: "add-tab",
      step: 0,
    });
    expect(
      parseTutorialLink(new URLSearchParams("tutorial=search&tutorialStep=x"))
    ).toEqual({ id: "search", step: 0 });
    expect(
      parseTutorialLink(new URLSearchParams("tutorial=search&tutorialStep=-2"))
    ).toEqual({ id: "search", step: 0 });
    expect(
      parseTutorialLink(
        new URLSearchParams("tutorial=search&tutorialStep=3abc")
      )
    ).toEqual({ id: "search", step: 0 });
  });

  it("ignores a missing, unknown, or unlinkable id", () => {
    expect(parseTutorialLink(new URLSearchParams(""))).toBeNull();
    expect(parseTutorialLink(new URLSearchParams("tutorial=nope"))).toBeNull();
    expect(
      parseTutorialLink(new URLSearchParams("tutorial=offline-download"))
    ).toBeNull();
  });
});

describe("createTutorialManager — tutorial links", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  function createLinked(
    link: TutorialLinkRequest,
    opts: { readerVisible?: ReadonlySignal<boolean>; mobile?: boolean } = {}
  ) {
    const tutorial = createTutorialManager(
      createLogin(),
      opts.readerVisible ?? createReaderVisible(true),
      createSelector(),
      signal(opts.mobile ?? false),
      createPanes(),
      createSidebar(),
      signal(false),
      signal(false),
      link
    );
    tutorial.hydrateStoredFlags();
    tutorial.armAutoStart();
    return tutorial;
  }

  it("launches the linked introduction at the requested step instead of the offer card", () => {
    const tutorial = createLinked({ id: "introduction", step: 3 });

    expect(tutorial.promptVisible.value).toBe(false);
    expect(tutorial.running.value).toBe(true);
    expect(tutorial.activeTutorialId.value).toBe("introduction");
    expect(tutorial.currentStep.value?.id).toBe(ONBOARDING_STEPS[3]?.id);
  });

  it("waits for the reader to be visible before launching", () => {
    const readerVisible = signal(false);
    const tutorial = createLinked(
      { id: "introduction", step: 0 },
      { readerVisible }
    );
    expect(tutorial.running.value).toBe(false);

    readerVisible.value = true;

    expect(tutorial.running.value).toBe(true);
  });

  it("clamps a step past the end to the last step of the mobile tour", () => {
    const tutorial = createLinked(
      { id: "introduction", step: 99 },
      { mobile: true }
    );

    expect(tutorial.currentStep.value?.id).toBe(
      MOBILE_TUTORIAL_STEPS[MOBILE_TUTORIAL_STEPS.length - 1]?.id
    );
  });

  it("plays a linked tutorial even after the user opted out", () => {
    window.localStorage.setItem("sb-tutorial-opted-out", "true");
    window.localStorage.setItem(
      "sb-tutorial-features-seen",
      JSON.stringify({ "add-tab": true })
    );

    const tutorial = createLinked({ id: "add-tab", step: 0 });

    expect(tutorial.running.value).toBe(true);
    expect(tutorial.activeTutorialId.value).toBe("add-tab");
  });

  it("opens a linked introduction directly at its step, never passing through step 0", () => {
    // Step 0 drives the book selector open; passing through it on the way to
    // a later step flashes the selector open then shut.
    const tutorial = createTutorialManager(
      createLogin(),
      createReaderVisible(true),
      createSelector(),
      signal(false),
      createPanes(),
      createSidebar()
    );
    const runningSteps: number[] = [];
    effect(() => {
      if (tutorial.running.value) {
        runningSteps.push(tutorial.index.value);
      }
    });

    tutorial.startTutorial("introduction", 3);

    expect(runningSteps).toEqual([3]);
  });

  it("ignores a desktop-only tutorial link on mobile", () => {
    const tutorial = createLinked(
      { id: "pane-layout", step: 0 },
      { mobile: true }
    );

    expect(tutorial.running.value).toBe(false);
  });

  it("reports no active tutorial once it finishes", () => {
    const tutorial = createLinked({ id: "search", step: 0 });

    tutorial.next();

    expect(tutorial.running.value).toBe(false);
    expect(tutorial.activeTutorialId.value).toBeNull();
  });
});

describe("createTutorialManager — startTutorial", () => {
  it("rejects an unknown id", () => {
    const tutorial = createTutorialManager(
      createLogin(),
      createReaderVisible(true),
      createSelector(),
      signal(false),
      createPanes(),
      createSidebar()
    );

    expect(tutorial.startTutorial("nope")).toBe(false);
    expect(tutorial.running.value).toBe(false);
  });
});

describe("mirrorTutorialToUrl", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  function setup(initialQuery = "", link: TutorialLinkRequest | null = null) {
    const url = new URL(`https://example.test/?${initialQuery}`);
    const navigation = {
      updateQueryParams: (update: Record<string, string | null>) => {
        for (const [key, value] of Object.entries(update)) {
          if (value === null) {
            url.searchParams.delete(key);
          } else {
            url.searchParams.set(key, value);
          }
        }
      },
    };
    const tutorial = createTutorialManager(
      createLogin(),
      createReaderVisible(true),
      createSelector(),
      signal(false),
      createPanes(),
      createSidebar()
    );
    mirrorTutorialToUrl(tutorial, navigation, link);
    return { tutorial, url };
  }

  it("writes the current step as the tour advances", () => {
    const { tutorial, url } = setup();

    tutorial.startTutorial("introduction", 0);
    expect(url.searchParams.get("tutorial")).toBe("introduction");
    expect(url.searchParams.get("tutorialStep")).toBe("0");

    tutorial.next();
    expect(url.searchParams.get("tutorialStep")).toBe("1");
  });

  it("removes both params when the tour ends", () => {
    const { tutorial, url } = setup();

    tutorial.startTutorial("search", 0);
    tutorial.next();

    expect(url.searchParams.has("tutorial")).toBe(false);
    expect(url.searchParams.has("tutorialStep")).toBe(false);
  });

  it("never writes an unlinkable contextual tip into the address", () => {
    const { tutorial, url } = setup();

    tutorial.startContextual("offline-download");

    expect(tutorial.activeTutorialId.value).toBe("offline-download");
    expect(url.searchParams.has("tutorial")).toBe(false);
  });

  it("clears stale unlinkable params left over from an earlier visit", () => {
    const { url } = setup("tutorial=offline-download&tutorialStep=0");

    expect(url.searchParams.has("tutorial")).toBe(false);
    expect(url.searchParams.has("tutorialStep")).toBe(false);
  });

  it("keeps a pending linked tutorial's params until it launches", () => {
    const { url } = setup("tutorial=search&tutorialStep=0", {
      id: "search",
      step: 0,
    });

    expect(url.searchParams.get("tutorial")).toBe("search");
  });
});

describe("createTutorialManager — onboarding start", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("expands a collapsed desktop sidebar so the tour can spotlight it", () => {
    const sidebar = createSidebar(true);
    const tutorial = createTutorialManager(
      createLogin(),
      createReaderVisible(true),
      createSelector(),
      signal(false),
      createPanes(),
      sidebar
    );

    tutorial.start();

    expect(sidebar.setSidebarCollapsed).toHaveBeenCalledWith(false);
    expect(sidebar.isSidebarCollapsed.value).toBe(false);
    expect(tutorial.running.value).toBe(true);
  });

  it("leaves a collapsed sidebar collapsed on mobile", () => {
    const sidebar = createSidebar(true);
    const tutorial = createTutorialManager(
      createLogin(),
      createReaderVisible(true),
      createSelector(),
      signal(true),
      createPanes(),
      sidebar
    );

    tutorial.start();

    expect(sidebar.setSidebarCollapsed).not.toHaveBeenCalled();
    expect(sidebar.isSidebarCollapsed.value).toBe(true);
  });

  it("does not raise the offer card when the tour was started before the reader was visible", () => {
    const readerVisible = signal(false);
    const tutorial = createTutorialManager(
      createLogin(),
      readerVisible,
      createSelector(),
      signal(false),
      createPanes(),
      createSidebar()
    );
    tutorial.hydrateStoredFlags();
    tutorial.armAutoStart();

    tutorial.start();
    readerVisible.value = true;

    expect(tutorial.running.value).toBe(true);
    expect(tutorial.promptVisible.value).toBe(false);
  });
});

describe("createTutorialManager — compact embed", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  function createEmbeddedTutorial() {
    return createTutorialManager(
      createLogin(),
      createReaderVisible(true),
      createSelector(),
      signal(false),
      createPanes(),
      createSidebar(),
      signal(false),
      signal(true)
    );
  }

  it("does not offer the tour, start it, or show the skip prompt", () => {
    const tutorial = createEmbeddedTutorial();
    tutorial.hydrateStoredFlags();
    tutorial.armAutoStart();

    expect(tutorial.promptVisible.value).toBe(false);
    expect(tutorial.running.value).toBe(false);
    expect(tutorial.skipPromptVisible.value).toBe(false);

    tutorial.start();
    expect(tutorial.running.value).toBe(false);

    tutorial.startContextual("search");
    expect(tutorial.running.value).toBe(false);

    expect(tutorial.startTutorial("search")).toBe(false);
    expect(tutorial.running.value).toBe(false);

    tutorial.skip();
    expect(tutorial.skipPromptVisible.value).toBe(false);
  });
});
