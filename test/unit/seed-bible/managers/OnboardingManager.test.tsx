import { signal } from "@preact/signals";

import { createOnboardingManager } from "@packages/seed-bible/seed-bible/managers/OnboardingManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";

// Logged out: the startup effect that can auto-close the install prompt only
// fires for logged-in users (or when install is already known), so this keeps
// the initial `step` equal to what computeInitialStep returned — which is what
// we're asserting.
function createLogin(): LoginManager {
  return {
    userId: signal(null),
    profile: signal(null),
    updateProfile: vi.fn(),
  } as unknown as LoginManager;
}

describe("createOnboardingManager — initial step", () => {
  beforeEach(() => {
    // Flags persist in localStorage; start each test clean so a leftover
    // install-dismissed flag doesn't mask the install vs. done distinction.
    window.localStorage.clear();
  });

  it("starts at 'done' when joined via a session link", () => {
    // A session-link join must not interrupt with the install prompt, even
    // though a normal first visit would show it.
    const onboarding = createOnboardingManager(
      createLogin(),
      /* joinedViaSessionLink */ true
    );

    expect(onboarding.step.value).toBe("done");
  });

  it("starts at 'install' on a normal (non-session-link) first visit", () => {
    // Clean state: not installed, not dismissed — so the install prompt is the
    // first thing shown (there is no longer a welcome step ahead of it).
    const onboarding = createOnboardingManager(createLogin());

    expect(onboarding.step.value).toBe("install");
  });
});
