import { signal, type ReadonlySignal } from "@preact/signals";

import { createTutorialManager } from "@packages/seed-bible/seed-bible/managers/TutorialManager";
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

function createSidebar(): SidebarManager {
  return {
    closeSearchPanel: vi.fn(),
    closeChatPanel: vi.fn(),
    closeSettings: vi.fn(),
    closeSidebar: vi.fn(),
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
      /* joinedViaSessionLink */ true
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
      /* joinedViaSessionLink */ true
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

    // Opted out — a different contextual tutorial no longer pops.
    tutorial.startContextual("pane-layout");
    expect(tutorial.running.value).toBe(false);
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
      false,
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

    tutorial.skip();
    expect(tutorial.skipPromptVisible.value).toBe(false);
  });
});
