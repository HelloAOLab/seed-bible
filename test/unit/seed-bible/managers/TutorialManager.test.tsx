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

    tutorial.startContextual("search");

    expect(tutorial.running.value).toBe(true);
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

    expect(tutorial.promptVisible.value).toBe(false);

    readerVisible.value = true;

    expect(tutorial.promptVisible.value).toBe(true);
  });
});
