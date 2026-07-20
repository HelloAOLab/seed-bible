import { signal } from "@preact/signals";

import { createOnboardingManager } from "@packages/seed-bible/seed-bible/managers/OnboardingManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";

const WELCOME_SEEN_KEY = "sb-welcome-seen";

// Logged out: the startup effect that can auto-close prompts / write the
// welcome flag only fires for logged-in users (or when install is already
// known), so this keeps the initial `step` equal to what computeInitialStep
// returned — which is what we're asserting.
function createLogin(): LoginManager {
  return {
    userId: signal(null),
    profile: signal(null),
    localConfig: signal({}),
    updateProfile: vi.fn(),
  } as unknown as LoginManager;
}

describe("createOnboardingManager — session-link joins", () => {
  beforeEach(() => {
    // Flags persist in localStorage; start each test clean so a leftover
    // WELCOME_SEEN_KEY doesn't mask the welcome vs. done distinction.
    window.localStorage.clear();
  });

  it("starts at 'done' when joined via a session link, even with no welcome-seen flag", () => {
    // No WELCOME_SEEN_KEY set — a normal visit would land on "welcome". The
    // session-link flag must override that and skip straight to "done".
    const onboarding = createOnboardingManager(
      createLogin(),
      /* joinedViaSessionLink */ true
    );

    expect(onboarding.step.value).toBe("done");
  });

  it("does NOT persist the welcome-seen flag when joined via a session link", () => {
    // The suppression is per-visit only: skipping the welcome must not record
    // it as seen, so a later visit without a session link still shows it.
    createOnboardingManager(createLogin(), /* joinedViaSessionLink */ true);

    expect(window.localStorage.getItem(WELCOME_SEEN_KEY)).toBeNull();
  });

  it("starts at 'welcome' on a normal (non-session-link) first visit", () => {
    // Control for the tests above: same clean state, only the flag differs —
    // proving it's the session-link flag that skips the welcome, not the setup.
    const onboarding = createOnboardingManager(createLogin());

    expect(onboarding.step.value).toBe("welcome");
  });
});
