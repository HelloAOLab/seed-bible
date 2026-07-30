import { signal } from "@preact/signals";

import { createOnboardingManager } from "@packages/seed-bible/seed-bible/managers/OnboardingManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";

function createLogin(): LoginManager {
  return {
    userId: signal(null),
    profile: signal(null),
    updateProfile: vi.fn(),
  } as unknown as LoginManager;
}

describe("createOnboardingManager", () => {
  beforeEach(() => {
    // Flags persist in localStorage; start each test clean so a leftover
    // install-dismissed/installed flag doesn't leak between cases.
    window.localStorage.clear();
  });

  it("starts at 'done' — the install prompt no longer auto-shows on load", () => {
    const onboarding = createOnboardingManager(createLogin());

    expect(onboarding.step.value).toBe("done");
  });

  it("reports installAvailable when not installed and not dismissed", () => {
    const onboarding = createOnboardingManager(createLogin());

    expect(onboarding.installAvailable.value).toBe(true);
  });

  it("openInstall() shows the prompt on demand", () => {
    const onboarding = createOnboardingManager(createLogin());

    onboarding.openInstall();

    expect(onboarding.step.value).toBe("install");
  });

  it("dismissInstall() hides the prompt and clears installAvailable", () => {
    const onboarding = createOnboardingManager(createLogin());

    onboarding.openInstall();
    onboarding.dismissInstall();

    expect(onboarding.step.value).toBe("done");
    expect(onboarding.installAvailable.value).toBe(false);
  });

  it("markInstalled() clears installAvailable", () => {
    const onboarding = createOnboardingManager(createLogin());

    onboarding.markInstalled();

    expect(onboarding.installAvailable.value).toBe(false);
    expect(onboarding.installed.value).toBe(true);
  });
});
